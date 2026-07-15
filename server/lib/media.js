import { createWriteStream } from 'node:fs';
import { execFile } from 'node:child_process';
import { mkdir, readFile, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import busboy from 'busboy';
import { env, supabase } from './shared.js';

/**
 * POST /api/media — image + video uploads (auth-gated by requireAdmin).
 *
 * Local-first pipeline: the file streams to disk first, a media_assets row is
 * inserted, and the client gets 201 with the local nginx path (/media/…). The
 * copy to the public `media` Supabase bucket happens in the background — the
 * response already carries both URLs, so a failed replication only means the
 * durable copy is missing (replication_status: 'failed', logged).
 *
 * Images (≤15 MB) stream straight into MEDIA_DIR under a uuid filename —
 * unchanged v3 behavior.
 *
 * Videos (mp4/mov/webm, ≤512 MB) spool to a temp file, then ffmpeg produces a
 * web-ready `<uuid>.mp4` (h264+aac, `-movflags +faststart` so the moov atom
 * leads and playback starts before the download finishes) plus a `<uuid>.jpg`
 * poster from ~1s in. Processing is synchronous in the request; the client
 * shows a "Processing…" state between upload 100% and the response.
 */

const IMAGE_MAX = 15 * 1024 * 1024;
const VIDEO_MAX = 512 * 1024 * 1024;

// The stored extension comes from the declared mime, never the client-supplied
// filename. Videos always come out of ffmpeg as .mp4 regardless of source.
const IMAGE_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/gif': '.gif',
};
const VIDEO_EXT = {
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
};

class MediaError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** execFile as a promise; stderr is attached to the error for logging. */
function run(cmd, args, timeoutMs) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { timeout: timeoutMs, maxBuffer: 16 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        err.stderrText = stderr;
        reject(err);
      } else {
        resolve(stdout);
      }
    });
  });
}

/** Map spawn/exec failures to a client-safe MediaError (never crash the app). */
function toMediaError(err, what) {
  if (err instanceof MediaError) return err;
  if (err.code === 'ENOENT') {
    return new MediaError(500, 'video processing unavailable — ffmpeg not installed');
  }
  const tail = (err.stderrText || err.message || '').trim().split('\n').slice(-3).join(' | ');
  console.error(`[media:${what}]`, tail || err);
  return new MediaError(422, 'Video processing failed — the file may be corrupt or unsupported');
}

async function probeVideo(srcPath) {
  let parsed;
  try {
    const out = await run(
      'ffprobe',
      ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', srcPath],
      60 * 1000,
    );
    parsed = JSON.parse(out);
  } catch (err) {
    throw toMediaError(err, 'probe');
  }
  const video = (parsed.streams || []).find((s) => s.codec_type === 'video');
  if (!video) throw new MediaError(415, 'No video stream found in the file');
  const audio = (parsed.streams || []).find((s) => s.codec_type === 'audio');
  return {
    videoCodec: video.codec_name || '',
    audioCodec: audio ? audio.codec_name || '' : null,
    duration: Number(parsed.format?.duration) || 0,
  };
}

/**
 * Transcode `srcPath` into `<id>.mp4` + `<id>.jpg` inside `destDir`.
 *
 * Policy (v4 contract):
 *  - video: stream-copy when the source is already h264; otherwise libx264
 *    -preset veryfast -crf 23, scaled to ≤1920 wide with even dimensions.
 *  - audio: copy when already aac, else aac 128k; sources with no audio pass.
 *  - always `-movflags +faststart` (moov atom first → instant streaming).
 *  - poster: frame from ~1s (or 0s for very short clips), ≤1280 wide, jpg ~q80.
 *
 * Exported for direct unit testing. Throws MediaError; cleans up its own
 * outputs on failure (the caller owns srcPath).
 */
export async function processVideo(srcPath, destDir, id = randomUUID()) {
  const probe = await probeVideo(srcPath);
  const videoName = `${id}.mp4`;
  const posterName = `${id}.jpg`;
  const videoPath = join(destDir, videoName);
  const posterPath = join(destDir, posterName);

  // Keep exactly one video + (optional) one audio stream — data/subtitle
  // tracks (e.g. QuickTime timecode) would break the mp4 mux with -c copy.
  const args = ['-y', '-i', srcPath, '-map', '0:v:0', '-map', '0:a:0?'];
  if (probe.videoCodec === 'h264') {
    args.push('-c:v', 'copy');
  } else {
    args.push(
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
      '-vf', "scale=w='trunc(min(1920,iw)/2)*2':h=-2",
      '-pix_fmt', 'yuv420p',
    );
  }
  if (probe.audioCodec === 'aac') args.push('-c:a', 'copy');
  else if (probe.audioCodec) args.push('-c:a', 'aac', '-b:a', '128k');
  args.push('-movflags', '+faststart', videoPath);

  try {
    await run('ffmpeg', args, 30 * 60 * 1000);
    // Poster comes from the finished mp4 (guaranteed decodable h264).
    const ss = probe.duration > 1.5 ? '1' : '0';
    await run(
      'ffmpeg',
      ['-y', '-ss', ss, '-i', videoPath, '-frames:v', '1',
       '-vf', "scale=w='min(1280,iw)':h=-2", '-q:v', '4', posterPath],
      60 * 1000,
    );
    const { size } = await stat(videoPath);
    return { videoName, posterName, videoPath, posterPath, size };
  } catch (err) {
    await unlink(videoPath).catch(() => {});
    await unlink(posterPath).catch(() => {});
    throw toMediaError(err, 'transcode');
  }
}

/**
 * Copy files to the public `media` bucket in the background, then record the
 * outcome once (done only when every file replicated).
 */
async function replicateToBucket(id, files) {
  try {
    for (const f of files) {
      const body = await readFile(f.path);
      const { error } = await supabase.storage
        .from('media')
        .upload(f.name, body, { contentType: f.mime, upsert: true });
      if (error) throw new Error(error.message);
    }
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

const bucketUrl = (filename) =>
  `${env.supabaseUrl}/storage/v1/object/public/media/${filename}`;

/** Multipart single field `file`; images ≤15 MB, videos ≤512 MB. */
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
    bb = busboy({ headers: req.headers, limits: { files: 1, fileSize: VIDEO_MAX } });
  } catch {
    return res.status(400).json({ error: 'Expected multipart/form-data with a `file` field' });
  }

  let responded = false;
  // Resolves { kind, id, path, size, mime, originalName } | null.
  // Images stream straight to their final MEDIA_DIR path; videos spool to a
  // temp file that ffmpeg reads afterwards (deleted on every exit path).
  let saving = null;

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
    const kind = IMAGE_EXT[info.mimeType] ? 'image' : VIDEO_EXT[info.mimeType] ? 'video' : null;
    if (!kind) {
      stream.resume();
      answer(415, {
        error: 'Unsupported file type (images: jpeg/png/webp/avif/gif; video: mp4/mov/webm)',
      });
      return;
    }
    const ext = kind === 'image' ? IMAGE_EXT[info.mimeType] : VIDEO_EXT[info.mimeType];

    const id = randomUUID();
    const filePath =
      kind === 'image' ? join(env.mediaDir, `${id}${ext}`) : join(tmpdir(), `shakur-src-${id}${ext}`);

    saving = new Promise((resolve) => {
      const out = createWriteStream(filePath, { flags: 'wx' });
      let size = 0;
      let failed = false;
      const fail = (code, payload) => {
        if (failed) return;
        failed = true;
        req.removeListener('close', onReqClose);
        stream.unpipe(out);
        out.destroy();
        unlink(filePath).catch(() => {});
        answer(code, payload);
        stream.resume(); // keep draining so busboy still reaches 'close'
        resolve(null);
      };
      // The client can abort mid-upload (XHR cancel) — busboy then never
      // reaches 'close', so discard the partial spool file here. On normal
      // completion req.readableEnded is true and this is a no-op.
      const onReqClose = () => {
        if (req.readableEnded || failed) return;
        failed = true;
        responded = true; // the socket is gone; there is nobody to answer
        stream.unpipe(out);
        out.destroy();
        unlink(filePath).catch(() => {});
        resolve(null);
      };
      req.once('close', onReqClose);
      stream.on('data', (chunk) => {
        size += chunk.length;
        // busboy's fileSize limit is the video cap; images get the tighter one.
        if (kind === 'image' && size > IMAGE_MAX) {
          fail(413, { error: 'File too large (max 15 MB)' });
        }
      });
      // busboy truncates the stream at the fileSize limit and signals it here.
      stream.on('limit', () => fail(413, { error: 'File too large (max 512 MB)' }));
      out.on('error', (err) => {
        if (failed) return;
        console.error('[media]', err.message);
        fail(500, { error: 'Could not store the file' });
      });
      out.on('finish', () => {
        if (failed) return;
        req.removeListener('close', onReqClose);
        resolve({
          kind,
          id,
          path: filePath,
          size,
          mime: info.mimeType,
          originalName: info.filename || `${id}${ext}`,
        });
      });
      stream.pipe(out);
    });
  });

  bb.on('error', () => answer(400, { error: 'Malformed multipart request' }));

  bb.on('close', async () => {
    const file = saving ? await saving : null;
    if (responded) {
      // Already answered (limit/mime/multipart error) — remove anything saved.
      if (file) unlink(file.path).catch(() => {});
      return;
    }
    if (!file) return answer(400, { error: 'Missing `file` field' });

    if (file.kind === 'image') return finishImage(file, answer);
    return finishVideo(file, answer);
  });

  req.pipe(bb);
}

/**
 * Insert a media_assets row, tolerating a pre-migrate-v4 database: when the
 * insert fails because `kind`/`poster_path` don't exist yet (PostgREST PGRST204
 * / Postgres 42703), retry with the v3 column set so uploads keep working
 * until the user runs supabase/migrate-v4.sql. Poster metadata is lost on the
 * fallback row, but the files themselves are stored and served either way.
 */
async function insertMediaRow(row) {
  let res = await supabase.from('media_assets').insert(row).select('id').single();
  const missingV4Column =
    res.error &&
    (res.error.code === 'PGRST204' || res.error.code === '42703') &&
    /kind|poster_path/.test(res.error.message || '');
  if (missingV4Column) {
    console.warn('[media:create] media_assets has no v4 columns — run supabase/migrate-v4.sql');
    const { kind: _k, poster_path: _p, ...v3Row } = row;
    res = await supabase.from('media_assets').insert(v3Row).select('id').single();
  }
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/** v3 image path — unchanged behavior/response shape (row now carries kind). */
async function finishImage(file, answer) {
  const filename = file.path.slice(file.path.lastIndexOf('/') + 1);
  const publicPath = `/media/${filename}`;
  const supabaseUrl = bucketUrl(filename);
  try {
    const row = await insertMediaRow({
      filename,
      original_name: file.originalName,
      mime: file.mime,
      size: file.size,
      public_path: publicPath,
      supabase_url: supabaseUrl,
      replication_status: 'pending',
      kind: 'image',
    });

    answer(201, { id: row.id, path: publicPath, supabaseUrl, replication: 'pending' });
    // Fire-and-forget: replicate to the `media` bucket after responding.
    replicateToBucket(row.id, [{ path: file.path, name: filename, mime: file.mime }]);
  } catch (err) {
    console.error('[media:create]', err.message);
    unlink(file.path).catch(() => {});
    answer(502, { error: 'Could not record the upload' });
  }
}

/** Video path: synchronous ffmpeg (mp4 + poster), then the same insert/replicate. */
async function finishVideo(file, answer) {
  let outputs = null;
  try {
    outputs = await processVideo(file.path, env.mediaDir, file.id);

    const publicPath = `/media/${outputs.videoName}`;
    const posterPublicPath = `/media/${outputs.posterName}`;
    const supabaseUrl = bucketUrl(outputs.videoName);
    const posterSupabaseUrl = bucketUrl(outputs.posterName);

    const row = await insertMediaRow({
      filename: outputs.videoName,
      original_name: file.originalName,
      mime: 'video/mp4', // the stored (transcoded) file, not the source
      size: outputs.size,
      public_path: publicPath,
      supabase_url: supabaseUrl,
      replication_status: 'pending',
      kind: 'video',
      poster_path: posterPublicPath,
    });

    answer(201, {
      id: row.id,
      kind: 'video',
      path: publicPath,
      poster: posterPublicPath,
      supabaseUrl,
      posterSupabaseUrl,
      replication: 'pending',
      size: outputs.size,
    });
    replicateToBucket(row.id, [
      { path: outputs.videoPath, name: outputs.videoName, mime: 'video/mp4' },
      { path: outputs.posterPath, name: outputs.posterName, mime: 'image/jpeg' },
    ]);
  } catch (err) {
    if (outputs) {
      // Transcode succeeded but the DB insert failed — remove the orphans.
      unlink(outputs.videoPath).catch(() => {});
      unlink(outputs.posterPath).catch(() => {});
      console.error('[media:create]', err.message);
      answer(502, { error: 'Could not record the upload' });
    } else {
      const me = err instanceof MediaError ? err : toMediaError(err, 'process');
      answer(me.status, { error: me.message });
    }
  } finally {
    unlink(file.path).catch(() => {}); // the spooled source temp file
  }
}
