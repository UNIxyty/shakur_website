import { useEffect, useRef, useState } from 'react';
import type { MediaItem } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import { assetUrl } from '../../lib/assets';
import { useAdminShell } from './context';
import { IconClose, IconPlay, IconRetry, Spinner } from './ui';

/**
 * Google-Drive-style media manager (drawer top section from
 * ShakurAdminPanel.dc.html): drop zone, upload rows with real progress via
 * XHR POSTs to /api/media (local-first pipeline: nginx-served /media/ files,
 * background Supabase replication; videos are transcoded to faststart mp4
 * with an auto-generated poster), and the gallery grid with set-cover /
 * move / delete / replace-poster actions.
 */

const MAX_ITEMS = 20;
/** Video types POST /api/media accepts (images are image/*). */
const VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/webm'];

/** 201 payload from POST /api/media (kind is absent on v3-era image shape). */
type MediaUploadResponse = {
  id: string;
  kind?: 'image' | 'video';
  path: string;
  poster?: string;
  supabaseUrl?: string;
  posterSupabaseUrl?: string;
  replication?: string;
  size?: number;
};

type UploadRow = {
  id: string;
  file: File;
  name: string;
  sizeMb: number;
  thumb: string; // object URL for images, '' for videos
  isVideo: boolean;
  /** `processing` = bytes fully sent, waiting on server ffmpeg/DB response. */
  status: 'uploading' | 'processing' | 'error' | 'done';
  pct: number;
  errMsg?: string;
  /** When set, the finished image becomes the poster of this media item. */
  posterFor: string | null;
  xhr?: XMLHttpRequest;
};

export default function MediaManager({
  recordType,
  media,
  cover,
  onChange,
}: {
  recordType: 'projects' | 'services';
  media: MediaItem[];
  cover: string;
  onChange: (media: MediaItem[], cover: string) => void;
}) {
  const { toast } = useAdminShell();
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const posterTarget = useRef<string | null>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  // Latest media/cover/uploads for async completions (avoids stale closures;
  // side effects stay OUT of state updaters — StrictMode double-invokes them).
  const latest = useRef({ media, cover, onChange });
  latest.current = { media, cover, onChange };
  const uploadsRef = useRef<UploadRow[]>([]);
  uploadsRef.current = uploads;

  useEffect(
    () => () => {
      // Abort in-flight uploads and release object URLs when the drawer closes.
      uploadsRef.current.forEach((r) => {
        r.xhr?.abort();
        if (r.thumb.startsWith('blob:')) URL.revokeObjectURL(r.thumb);
      });
    },
    []
  );

  const patchUpload = (id: string, patch: Partial<UploadRow>) =>
    setUploads((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const finishUpload = (id: string, resp: MediaUploadResponse) => {
    patchUpload(id, { status: 'done', pct: 100 });
    // The design shows the green check for a beat, then moves it to the gallery.
    setTimeout(() => {
      const row = uploadsRef.current.find((r) => r.id === id);
      if (row) {
        const { media: m, cover: c, onChange: apply } = latest.current;
        if (row.posterFor) {
          apply(
            m.map((it) => (it.id === row.posterFor ? { ...it, poster: resp.path } : it)),
            c
          );
          toast('Poster frame updated');
        } else {
          const item: MediaItem = {
            id: crypto.randomUUID(),
            type: resp.kind === 'video' ? 'video' : 'image',
            src: resp.path,
            // Videos come back with a server-generated poster frame.
            ...(resp.kind === 'video' && resp.poster ? { poster: resp.poster } : {}),
          };
          apply([...m, item], c || item.id);
        }
        if (row.thumb.startsWith('blob:')) URL.revokeObjectURL(row.thumb);
      }
      setUploads((rows) => rows.filter((r) => r.id !== id));
    }, 600);
  };

  const startUpload = async (row: UploadRow) => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      patchUpload(row.id, { status: 'error', errMsg: 'Session expired — sign in again' });
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/media');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.responseType = 'json';
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      patchUpload(row.id, { pct: Math.min(100, (e.loaded / e.total) * 100) });
    };
    // All bytes sent — the server is now transcoding (video) / storing.
    xhr.upload.onload = () => patchUpload(row.id, { status: 'processing', pct: 100 });
    xhr.onload = () => {
      const body = xhr.response as MediaUploadResponse | { error?: string } | null;
      if (xhr.status === 201 && body && 'path' in body && body.path) {
        finishUpload(row.id, body);
      } else {
        const msg = body && 'error' in body && body.error ? body.error : `Upload failed (${xhr.status})`;
        patchUpload(row.id, { status: 'error', errMsg: msg });
      }
    };
    xhr.onerror = () =>
      patchUpload(row.id, { status: 'error', errMsg: 'Upload failed — network error' });
    // onabort: cancelUpload already removed the row; nothing to patch.
    patchUpload(row.id, { xhr, status: 'uploading', pct: Math.max(row.pct, 1), errMsg: undefined });
    const form = new FormData();
    form.append('file', row.file);
    xhr.send(form);
  };

  const addFiles = (files: FileList | File[], posterFor: string | null = null) => {
    const arr = [...files].filter(
      (f) => f.type && (f.type.startsWith('image') || (!posterFor && VIDEO_MIMES.includes(f.type)))
    );
    if (!arr.length) return;
    const room = MAX_ITEMS - media.length - uploads.length;
    if (!posterFor && arr.length > room) {
      toast(`Up to ${MAX_ITEMS} files per ${recordType === 'projects' ? 'project' : 'service'}`);
      arr.length = Math.max(0, room);
      if (!arr.length) return;
    }
    const rows: UploadRow[] = arr.map((f) => {
      const isVideo = f.type.startsWith('video');
      return {
        id: crypto.randomUUID(),
        file: f,
        name: f.name,
        sizeMb: +(f.size / 1048576).toFixed(1),
        thumb: isVideo ? '' : URL.createObjectURL(f),
        isVideo,
        status: 'uploading',
        pct: 0,
        posterFor,
      };
    });
    setUploads((prev) => [...rows, ...prev]);
    rows.forEach((r) => void startUpload(r));
  };

  const cancelUpload = (id: string) => {
    const row = uploadsRef.current.find((r) => r.id === id);
    row?.xhr?.abort();
    if (row?.thumb.startsWith('blob:')) URL.revokeObjectURL(row.thumb);
    setUploads((rows) => rows.filter((r) => r.id !== id));
  };

  const retryUpload = (id: string) => {
    const row = uploads.find((r) => r.id === id);
    if (row) void startUpload({ ...row, pct: 0 });
  };

  // ---- gallery actions (design semantics: first item is the cover) ----
  const setCover = (i: number) => {
    const m = [...media];
    const [it] = m.splice(i, 1);
    m.unshift(it);
    onChange(m, it.id);
    toast('Cover updated');
  };
  const moveMedia = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= media.length) return;
    const m = [...media];
    [m[i], m[j]] = [m[j], m[i]];
    onChange(m, cover);
  };
  const delMedia = (i: number) => {
    const m = media.filter((_, x) => x !== i);
    let c = cover;
    if (!m.find((it) => it.id === c)) c = m.length ? m[0].id : '';
    onChange(m, c);
  };
  const pickPoster = (id: string) => {
    posterTarget.current = id;
    posterInputRef.current?.click();
  };

  const coverId = cover || media[0]?.id || '';

  const galleryBtn = (
    onClick: () => void,
    label: string,
    danger: boolean,
    child: React.ReactNode
  ) => (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      aria-label={label}
      title={label}
      style={{
        width: 26,
        height: 26,
        border: 'none',
        borderRadius: 7,
        background: danger ? 'rgba(214,69,69,0.92)' : 'rgba(255,255,255,0.92)',
        cursor: 'pointer',
        color: danger ? '#fff' : '#160C00',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {child}
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>
        Media <span style={{ color: '#A8A29E', fontWeight: 400 }}>— images &amp; video</span>
      </span>

      {/* drop zone */}
      <label
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!dragActive) setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          minHeight: 150,
          border: `1.5px dashed ${dragActive ? '#FB8500' : '#D6D3D1'}`,
          borderRadius: 12,
          cursor: 'pointer',
          background: dragActive ? '#FFF9F1' : '#FAFAF9',
          textAlign: 'center',
          padding: 20,
          transition: 'border-color .15s ease, background .15s ease',
        }}
      >
        <div
          style={{
            width: 46,
            height: 46,
            borderRadius: 12,
            background: '#FFF3E4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FB8500',
          }}
        >
          <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#160C00' }}>
          Drag images or video here or <span style={{ color: '#FB8500' }}>browse</span>
        </span>
        <span style={{ fontSize: 13, color: '#A8A29E' }}>
          PNG, JPG, MP4 or MOV · up to 20 files
        </span>
        <input
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => {
            addFiles(e.target.files ?? []);
            e.target.value = '';
          }}
          style={{ display: 'none' }}
        />
      </label>

      {/* hidden poster-replacement input (images only) */}
      <input
        ref={posterInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => {
          if (e.target.files?.length && posterTarget.current) {
            addFiles(e.target.files, posterTarget.current);
          }
          posterTarget.current = null;
          e.target.value = '';
        }}
        style={{ display: 'none' }}
      />

      {/* upload rows */}
      {uploads.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {uploads.map((u) => {
            const pctR = Math.round(u.pct);
            const uploading = u.status === 'uploading';
            const processing = u.status === 'processing';
            const err = u.status === 'error';
            const done = u.status === 'done';
            const meta = uploading
              ? `${pctR}%`
              : processing
                ? 'Processing…'
                : err
                  ? 'Failed'
                  : `${u.sizeMb} MB`;
            const metaColor =
              uploading || processing ? '#FB8500' : err ? '#D64545' : done ? '#1F8A5B' : '#A8A29E';
            return (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  border: '1px solid #EAEAE8',
                  borderRadius: 11,
                  background: '#FAFAF9',
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 8,
                    overflow: 'hidden',
                    background: u.isVideo ? '#2A241E' : '#F0EFEC',
                    flexShrink: 0,
                    position: 'relative',
                  }}
                >
                  {u.thumb && (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundImage: `url(${JSON.stringify(u.thumb)})`,
                        backgroundSize: 'cover',
                        backgroundPosition: '50% 50%',
                        opacity: uploading || processing ? 0.45 : 1,
                      }}
                    />
                  )}
                  {(uploading || processing) && (
                    <span
                      style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Spinner />
                    </span>
                  )}
                  {u.isVideo && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 3,
                        right: 3,
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        background: 'rgba(22,12,0,0.72)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconPlay />
                    </span>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {u.name}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: metaColor, flexShrink: 0 }}>
                      {meta}
                    </span>
                  </div>
                  {(uploading || processing) && (
                    <div
                      style={{
                        marginTop: 7,
                        height: 5,
                        borderRadius: 999,
                        background: '#EAEAE8',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${pctR}%`,
                          background: '#FB8500',
                          borderRadius: 999,
                          transition: 'width .25s ease',
                        }}
                      />
                    </div>
                  )}
                  {err && (
                    <span style={{ fontSize: 12, color: '#D64545' }}>
                      {u.errMsg || 'Upload failed — network error'}
                    </span>
                  )}
                </div>
                {uploading && (
                  <button
                    type="button"
                    onClick={() => cancelUpload(u.id)}
                    aria-label="Cancel"
                    style={{
                      width: 30,
                      height: 30,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      color: '#A8A29E',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <IconClose size={17} />
                  </button>
                )}
                {err && (
                  <button
                    type="button"
                    onClick={() => retryUpload(u.id)}
                    aria-label="Retry"
                    style={{
                      width: 30,
                      height: 30,
                      border: '1px solid #E7E5E4',
                      background: '#fff',
                      borderRadius: 8,
                      cursor: 'pointer',
                      color: '#54504D',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <IconRetry />
                  </button>
                )}
                {done && (
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: '#E6F4EC',
                      color: '#1F8A5B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width={16}
                      height={16}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* gallery grid */}
      {media.length > 0 && (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: 4,
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 600, color: '#54504D' }}>
              Gallery ({media.length})
            </span>
            <span style={{ fontSize: 12, color: '#A8A29E' }}>First item is the cover</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {media.map((m, i) => {
              const isCover = m.id === coverId;
              const thumbSrc = m.type === 'video' ? m.poster || '' : m.src;
              return (
                <div
                  key={m.id}
                  className="adm-gal-item"
                  style={{
                    position: 'relative',
                    aspectRatio: '4/3',
                    borderRadius: 10,
                    overflow: 'hidden',
                    background: m.type === 'video' && !thumbSrc ? '#2A241E' : '#F0EFEC',
                    border: `2px solid ${isCover ? '#FB8500' : 'transparent'}`,
                  }}
                >
                  {thumbSrc && (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundImage: `url(${JSON.stringify(assetUrl(thumbSrc))})`,
                        backgroundSize: 'cover',
                        backgroundPosition: '50% 50%',
                      }}
                    />
                  )}
                  {m.type === 'video' && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%,-50%)',
                        width: 30,
                        height: 30,
                        borderRadius: '50%',
                        background: 'rgba(22,12,0,0.62)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <IconPlay size={14} />
                    </span>
                  )}
                  {isCover && (
                    <span
                      style={{
                        position: 'absolute',
                        top: 6,
                        left: 6,
                        background: '#FB8500',
                        color: '#160C00',
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 999,
                        textTransform: 'uppercase',
                        letterSpacing: 0.4,
                      }}
                    >
                      Cover
                    </span>
                  )}
                  <div
                    className="adm-gal-actions"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'space-between',
                      gap: 4,
                      padding: 6,
                      background: 'linear-gradient(to top, rgba(22,12,0,0.6), transparent 55%)',
                      opacity: 0,
                      transition: 'opacity .15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 4 }}>
                      {galleryBtn(
                        () => setCover(i),
                        'Set as cover',
                        false,
                        <svg
                          width={14}
                          height={14}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      )}
                      {m.type === 'video' &&
                        galleryBtn(
                          () => pickPoster(m.id),
                          'Replace poster',
                          false,
                          <svg
                            width={14}
                            height={14}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {galleryBtn(
                        () => moveMedia(i, -1),
                        'Move left',
                        false,
                        <svg
                          width={14}
                          height={14}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.4}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                      )}
                      {galleryBtn(
                        () => moveMedia(i, 1),
                        'Move right',
                        false,
                        <svg
                          width={14}
                          height={14}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.4}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      )}
                      {galleryBtn(
                        () => delMedia(i),
                        'Delete',
                        true,
                        <IconClose size={14} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
