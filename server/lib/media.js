import { createWriteStream } from 'node:fs';
import { mkdir, readFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import busboy from 'busboy';
import { env, supabase } from './shared.js';

/**
 * POST /api/media — Home-CMS image uploads (auth-gated by requireAdmin).
 *
 * Local-first pipeline: the file streams to MEDIA_DIR (the `media-uploads`
 * compose volume, served by nginx at /media/) under a uuid filename, a
 * media_assets row is inserted, and the client gets 201 immediately. The copy
 * to the public `media` Supabase bucket happens in the background — the
 * response already carries both URLs, so a failed replication only means the
 * durable copy is missing (replication_status: 'failed', logged).
 */

const MAX_BYTES = 15 * 1024 * 1024;

// Images only — the extension comes from the declared mime, never the
// client-supplied filename.
const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
};

async function replicateToBucket(id, filePath, filename, mime) {
  try {
    const body = await readFile(filePath);
    const { error } = await supabase.storage
      .from('media')
      .upload(filename, body, { contentType: mime, upsert: true });
    if (error) throw new Error(error.message);
    await supabase.from('media_assets').update({ replication_status: 'done' }).eq('id', id);
  } catch (err) {
    // The client already holds both URLs; a failed replica just stays local.
    console.error('[media:replicate]', err.message);
    await supabase
      .from('media_assets')
      .update({ replication_status: 'failed' })
      .eq('id', id)
      .then(
        () => {},
        () => {},
      );
  }
}

/** Multipart single field `file`; images only; <= 15 MB. */
export async function handleMediaUpload(req, res) {
  if (!supabase) return res.status(503).json({ error: 'Supabase is not configured' });

  try {
    await mkdir(env.mediaDir, { recursive: true });
  } catch (err) {
    console.error('[media]', err.message);
    return res.status(500).json({ error: 'Media storage is not writable' });
  }

  let bb;
  try {
    bb = busboy({ headers: req.headers, limits: { files: 1, fileSize: MAX_BYTES } });
  } catch {
    return res.status(400).json({ error: 'Expected multipart/form-data with a `file` field' });
  }

  let responded = false;
  let saving = null; // resolves { filename, filePath, size, mime, originalName } | null

  const answer = (code, payload) => {
    if (responded) return;
    responded = true;
    res.status(code).json(payload);
  };

  bb.on('file', (field, stream, info) => {
    if (field !== 'file' || saving) {
      stream.resume(); // drain unexpected parts so parsing still completes
      return;
    }
    const ext = MIME_EXT[info.mimeType];
    if (!ext) {
      stream.resume();
      answer(415, { error: 'Images only (jpeg, png, webp, avif, gif)' });
      return;
    }

    const filename = `${randomUUID()}${ext}`;
    const filePath = join(env.mediaDir, filename);
    saving = new Promise((resolve) => {
      const out = createWriteStream(filePath, { flags: 'wx' });
      let size = 0;
      stream.on('data', (chunk) => {
        size += chunk.length;
      });
      // busboy truncates the stream at the fileSize limit and signals it here.
      stream.on('limit', () => {
        out.destroy();
        unlink(filePath).catch(() => {});
        answer(413, { error: 'File too large (max 15 MB)' });
        resolve(null);
      });
      out.on('error', (err) => {
        console.error('[media]', err.message);
        unlink(filePath).catch(() => {});
        answer(500, { error: 'Could not store the file' });
        resolve(null);
      });
      out.on('finish', () =>
        resolve({
          filename,
          filePath,
          size,
          mime: info.mimeType,
          originalName: info.filename || filename,
        }),
      );
      stream.pipe(out);
    });
  });

  bb.on('error', () => answer(400, { error: 'Malformed multipart request' }));

  bb.on('close', async () => {
    const file = saving ? await saving : null;
    if (responded) return;
    if (!file) return answer(400, { error: 'Missing `file` field' });

    const publicPath = `/media/${file.filename}`;
    const supabaseUrl = `${env.supabaseUrl}/storage/v1/object/public/media/${file.filename}`;
    try {
      const { data: row, error } = await supabase
        .from('media_assets')
        .insert({
          filename: file.filename,
          original_name: file.originalName,
          mime: file.mime,
          size: file.size,
          public_path: publicPath,
          supabase_url: supabaseUrl,
          replication_status: 'pending',
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);

      answer(201, { id: row.id, path: publicPath, supabaseUrl, replication: 'pending' });
      // Fire-and-forget: replicate to the `media` bucket after responding.
      replicateToBucket(row.id, file.filePath, file.filename, file.mime);
    } catch (err) {
      console.error('[media:create]', err.message);
      unlink(file.filePath).catch(() => {});
      answer(502, { error: 'Could not record the upload' });
    }
  });

  req.pipe(bb);
}
