import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  supabase,
  slugify,
  SERVICE_OPTIONS,
  STATUSES,
  type ProjectRow,
  type ProjectStatus,
} from '../lib/supabase';
import { bgImage } from '../lib/assets';
import SupabaseMissing from './SupabaseMissing';

const PER_PAGE = 5;
const MAX_IMAGES = 20;
const BUCKET = 'project-images';

type Form = {
  cover: string;
  images: string[];
  title: string;
  loc: string;
  shortDesc: string;
  fullDesc: string;
  service: string;
  start: string;
  end: string;
  country: string;
  city: string;
  client: string;
  status: ProjectStatus;
  url: string;
};

const emptyForm: Form = {
  cover: '',
  images: [],
  title: '',
  loc: '',
  shortDesc: '',
  fullDesc: '',
  service: 'Drywall',
  start: '',
  end: '',
  country: 'Latvia',
  city: '',
  client: '',
  status: 'In Progress',
  url: '',
};

/** Badge palette from the design's `badge()` helper. */
function badge(status: string): [string, string] {
  if (status === 'Completed') return ['#E6F4EC', '#1F8A5B'];
  if (status === 'Paused') return ['#FBE7E7', '#D64545'];
  return ['#FDF0DC', '#B7791F'];
}

/** The table shows only the year, like the design's `yr()`. */
const yr = (d: string) => (d ? String(d).slice(0, 4) : '—');

const field: React.CSSProperties = {
  border: '1px solid #E7E5E4',
  borderRadius: 10,
  padding: '12px 13px',
  fontSize: 15,
  outline: 'none',
  fontFamily: "'Inter', sans-serif",
};

const labelCls = 'flex flex-col font-semibold';
const labelStyle: React.CSSProperties = { gap: 7, fontSize: 13 };

const iconBtn: React.CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 9,
  background: '#fff',
  cursor: 'pointer',
};

/** ShakurAdmin.dc.html */
export default function AdminDashboard() {
  const [rows, setRows] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);

  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectRow | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<ProjectRow | null>(null);

  const coverInput = useRef<HTMLInputElement>(null);
  const imagesInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error: e } = await supabase
      .from('projects')
      .select('*')
      .order('sort_order', { ascending: true });

    if (e) setError(e.message);
    else {
      setError('');
      setRows((data ?? []) as ProjectRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!supabase) return <SupabaseMissing />;
  const client = supabase;

  const upd = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  /** Upload to Supabase Storage and return the public URL. */
  const upload = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await client.storage.from(BUCKET).upload(path, file, {
      cacheControl: '31536000',
      upsert: false,
    });

    if (upErr) {
      setError(
        `Image upload failed: ${upErr.message}. Create a public "${BUCKET}" storage bucket (see supabase/schema.sql).`
      );
      return null;
    }
    return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  };

  const onCoverFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    const url = await upload(file);
    setUploading(false);
    if (url) upd('cover', url);
  };

  const onAddImages = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files).slice(0, MAX_IMAGES - form.images.length)) {
      const url = await upload(file);
      if (url) urls.push(url);
    }
    setUploading(false);
    if (urls.length) setForm((f) => ({ ...f, images: [...f.images, ...urls].slice(0, MAX_IMAGES) }));
  };

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setPanelOpen(true);
  };

  const openEdit = (r: ProjectRow) => {
    setEditing(r);
    setForm({
      cover: r.img,
      images: r.images ?? [],
      title: r.title,
      loc: r.loc,
      shortDesc: r.short_desc,
      fullDesc: r.full_desc,
      service: r.service,
      start: r.start_date,
      end: r.end_date,
      country: r.country,
      city: r.city,
      client: r.client,
      status: r.status,
      url: r.official_url ?? '',
    });
    setPanelOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError('');

    const title = form.title.trim() || 'Untitled Project';
    const payload = {
      title,
      loc: form.loc.trim() || form.city.trim(),
      img: form.cover,
      images: form.images,
      short_desc: form.shortDesc,
      full_desc: form.fullDesc,
      service: form.service,
      start_date: form.start,
      end_date: form.end,
      country: form.country,
      city: form.city,
      client: form.client,
      status: form.status,
      official_url: form.url || null,
      official_label: form.url ? null : null,
    };

    const { error: e } = editing
      ? // The slug is deliberately not recomputed on edit — public /project/:slug URLs
        // must survive a title change.
        await client.from('projects').update(payload).eq('id', editing.id)
      : await client.from('projects').insert({
          ...payload,
          slug: slugify(title),
          space_img: form.cover,
          sort_order: rows.length + 1,
          published: true,
        });

    setSaving(false);
    if (e) {
      setError(e.message);
      return;
    }
    setPanelOpen(false);
    setEditing(null);
    await load();
  };

  const remove = async (r: ProjectRow) => {
    setConfirmDelete(null);
    const { error: e } = await client.from('projects').delete().eq('id', r.id);
    if (e) setError(e.message);
    else await load();
  };

  const totalPages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const pg = Math.min(page, totalPages - 1);
  const startI = pg * PER_PAGE;
  const slice = rows.slice(startI, startI + PER_PAGE);
  const rangeStart = rows.length ? startI + 1 : 0;
  const rangeEnd = Math.min(startI + PER_PAGE, rows.length);

  const GRID = '76px 2fr 1.3fr 128px 68px 68px 92px';

  const navItem = (label: string, active: boolean, icon: React.ReactNode) => (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center ${active ? '' : 'hover:bg-surface'}`}
      style={{
        gap: 11,
        padding: '11px 12px',
        borderRadius: 10,
        fontSize: 15,
        fontWeight: active ? 600 : 500,
        color: active ? '#160C00' : '#54504D',
        background: active ? '#FFF3E4' : undefined,
      }}
    >
      {icon}
      {label}
    </a>
  );

  return (
    <div className="flex min-h-screen bg-surface text-ink" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ---------- SIDEBAR ---------- */}
      <aside
        className="flex shrink-0 flex-col bg-white"
        style={{
          width: 200,
          borderRight: '1px solid #EAEAE8',
          padding: '26px 16px',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <img
          src="/images/shakur-logo.svg"
          alt="SHAKUR"
          className="self-start"
          style={{ height: 19, width: 'auto', margin: '6px 8px 34px', filter: 'brightness(0)' }}
        />

        <nav className="flex flex-col" style={{ gap: 4 }} aria-label="Admin">
          {navItem(
            'Dashboard',
            false,
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
          )}
          {navItem(
            'Projects',
            true,
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FB8500" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 7v13h18V7" />
              <path d="M3 7l2-4h14l2 4" />
              <path d="M9 12h6" />
            </svg>
          )}
          {navItem(
            'Services',
            false,
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 4l2 2-8 8-2-2z" />
              <path d="M4 14l6 6" />
              <path d="M18 8l2 2" />
            </svg>
          )}
          {navItem(
            'Settings',
            false,
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
            </svg>
          )}
        </nav>

        <div
          className="flex items-center"
          style={{ marginTop: 'auto', gap: 10, padding: '10px 12px', borderTop: '1px solid #EAEAE8' }}
        >
          <div
            className="flex items-center justify-center bg-ink text-white font-bold"
            style={{ width: 32, height: 32, borderRadius: '50%', fontSize: 13 }}
          >
            A
          </div>
          <div className="flex flex-col">
            <span className="font-semibold" style={{ fontSize: 13 }}>
              Admin
            </span>
            <span className="text-placeholder" style={{ fontSize: 12 }}>
              SIA SHAKUR
            </span>
          </div>
          <button
            onClick={() => client.auth.signOut()}
            aria-label="Log out"
            className="ml-auto flex items-center justify-center text-muted hover:border-error hover:text-error"
            style={{ ...iconBtn, width: 32, height: 32, border: '1px solid #EAEAE8', borderRadius: 8 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      {/* ---------- MAIN ---------- */}
      <main className="flex flex-1 flex-col" style={{ minWidth: 0 }}>
        <header
          className="flex items-center justify-between bg-white"
          style={{ gap: 20, padding: '26px 34px', borderBottom: '1px solid #EAEAE8' }}
        >
          <div className="flex flex-col" style={{ gap: 3 }}>
            <h1 className="m-0 font-bold" style={{ fontSize: 26, letterSpacing: '-0.6px' }}>
              Projects
            </h1>
            <span className="text-placeholder" style={{ fontSize: 14 }}>
              {rows.length} projects total
            </span>
          </div>

          <motion.button
            onClick={openAdd}
            whileTap={{ scale: 0.97 }}
            className="inline-flex cursor-pointer items-center border-0 bg-orange text-ink font-semibold transition-colors hover:bg-orange-hover"
            style={{ gap: 8, fontSize: 15, padding: '12px 20px', borderRadius: 10 }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#160C00" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add New Project
          </motion.button>
        </header>

        <div style={{ padding: '28px 34px', flex: 1 }}>
          {error && (
            <div
              role="alert"
              className="flex items-center font-medium"
              style={{
                gap: 9,
                background: '#FBE7E7',
                color: '#D64545',
                fontSize: 14,
                padding: '12px 16px',
                borderRadius: 10,
                marginBottom: 16,
              }}
            >
              {error}
            </div>
          )}

          <div
            className="overflow-hidden bg-white"
            style={{ border: '1px solid #EAEAE8', borderRadius: 16 }}
          >
            <div className="overflow-x-auto">
              <div style={{ minWidth: 800 }}>
                <div
                  className="grid items-center uppercase text-placeholder font-semibold"
                  style={{
                    gridTemplateColumns: GRID,
                    gap: 14,
                    padding: '15px 24px',
                    background: '#FAFAF9',
                    borderBottom: '1px solid #EAEAE8',
                    fontSize: 12,
                    letterSpacing: '0.4px',
                  }}
                >
                  <span>Cover</span>
                  <span>Title</span>
                  <span>Location</span>
                  <span>Status</span>
                  <span>Start</span>
                  <span>End</span>
                  <span style={{ textAlign: 'right' }}>Actions</span>
                </div>

                {loading && (
                  <div className="text-placeholder" style={{ padding: '40px 24px', fontSize: 14 }}>
                    Loading projects…
                  </div>
                )}

                {!loading && !rows.length && (
                  <div className="text-placeholder" style={{ padding: '40px 24px', fontSize: 14 }}>
                    No projects yet. Use “Add New Project” to create the first one.
                  </div>
                )}

                <AnimatePresence initial={false}>
                  {slice.map((r) => {
                    const [bg, color] = badge(r.status);
                    return (
                      <motion.div
                        key={r.id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid items-center"
                        style={{
                          gridTemplateColumns: GRID,
                          gap: 14,
                          padding: '12px 24px',
                          borderBottom: '1px solid #F2F1EF',
                        }}
                      >
                        <div
                          style={{
                            width: 60,
                            height: 42,
                            borderRadius: 8,
                            overflow: 'hidden',
                            background: '#F0EFEC',
                          }}
                        >
                          {r.img && (
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                backgroundImage: bgImage(r.img),
                                backgroundSize: 'cover',
                                backgroundPosition: '50% 50%',
                              }}
                            />
                          )}
                        </div>

                        <span
                          className="overflow-hidden font-semibold"
                          style={{ fontSize: 15, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {r.title}
                        </span>

                        <span
                          className="overflow-hidden text-muted"
                          style={{ fontSize: 14, textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        >
                          {r.loc}
                        </span>

                        <span>
                          <span
                            className="inline-flex items-center font-semibold"
                            style={{
                              gap: 6,
                              fontSize: 13,
                              padding: '5px 11px',
                              borderRadius: 999,
                              background: bg,
                              color,
                            }}
                          >
                            <span
                              style={{ width: 7, height: 7, borderRadius: '50%', background: color }}
                            />
                            {r.status}
                          </span>
                        </span>

                        <span className="text-muted" style={{ fontSize: 14 }}>
                          {yr(r.start_date)}
                        </span>
                        <span className="text-muted" style={{ fontSize: 14 }}>
                          {yr(r.end_date)}
                        </span>

                        <div className="flex justify-end" style={{ gap: 8 }}>
                          <button
                            onClick={() => openEdit(r)}
                            aria-label={`Edit ${r.title}`}
                            className="flex items-center justify-center text-muted hover:border-orange hover:text-orange"
                            style={{ ...iconBtn, border: '1px solid #E7E5E4' }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M12 20h9" />
                              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                            </svg>
                          </button>

                          <button
                            onClick={() => setConfirmDelete(r)}
                            aria-label={`Delete ${r.title}`}
                            className="flex items-center justify-center"
                            style={{
                              ...iconBtn,
                              border: '1px solid #F3D6D6',
                              color: '#D64545',
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            <div
              className="flex items-center justify-between"
              style={{ gap: 16, padding: '16px 24px' }}
            >
              <span className="text-placeholder" style={{ fontSize: 13 }}>
                Showing {rangeStart}–{rangeEnd} of {rows.length}
              </span>

              <div className="flex items-center" style={{ gap: 6 }}>
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  aria-label="Previous"
                  className="flex items-center justify-center text-muted hover:border-orange hover:text-orange"
                  style={{ ...iconBtn, border: '1px solid #E7E5E4' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>

                {Array.from({ length: totalPages }, (_, n) => {
                  const active = n === pg;
                  return (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      aria-current={active ? 'page' : undefined}
                      className="cursor-pointer font-semibold"
                      style={{
                        minWidth: 34,
                        height: 34,
                        padding: '0 10px',
                        borderRadius: 9,
                        fontSize: 14,
                        border: `1px solid ${active ? '#FB8500' : '#E7E5E4'}`,
                        background: active ? '#FB8500' : '#ffffff',
                        color: active ? '#160C00' : '#54504D',
                      }}
                    >
                      {n + 1}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  aria-label="Next"
                  className="flex items-center justify-center text-muted hover:border-orange hover:text-orange"
                  style={{ ...iconBtn, border: '1px solid #E7E5E4' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ---------- DRAWER ---------- */}
      <AnimatePresence>
        {panelOpen && (
          <div className="fixed inset-0" style={{ zIndex: 100 }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setPanelOpen(false)}
              className="absolute inset-0"
              style={{ background: 'rgba(22,12,0,0.45)' }}
            />

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={editing ? 'Edit Project' : 'Add New Project'}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="absolute flex flex-col bg-white"
              style={{
                top: 0,
                right: 0,
                bottom: 0,
                width: 520,
                maxWidth: '94vw',
                boxShadow: '-20px 0 50px rgba(0,0,0,0.18)',
              }}
            >
              <div
                className="flex shrink-0 items-center justify-between"
                style={{ padding: '22px 28px', borderBottom: '1px solid #EAEAE8' }}
              >
                <h2 className="m-0 font-bold" style={{ fontSize: 20, letterSpacing: '-0.4px' }}>
                  {editing ? 'Edit Project' : 'Add New Project'}
                </h2>
                <button
                  onClick={() => setPanelOpen(false)}
                  aria-label="Close"
                  className="flex items-center justify-center border-0 text-muted hover:bg-border-card"
                  style={{ width: 34, height: 34, background: '#F5F5F4', borderRadius: 9, cursor: 'pointer' }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <div
                className="flex flex-1 flex-col overflow-y-auto"
                style={{ padding: '24px 28px', gap: 20 }}
              >
                {/* Cover */}
                <div className="flex flex-col" style={{ gap: 8 }}>
                  <span className="font-semibold" style={{ fontSize: 13 }}>
                    Cover Image
                  </span>
                  <button
                    type="button"
                    onClick={() => coverInput.current?.click()}
                    onDrop={(e: DragEvent) => {
                      e.preventDefault();
                      void onCoverFile(e.dataTransfer?.files?.[0]);
                    }}
                    onDragOver={(e: DragEvent) => e.preventDefault()}
                    className="relative flex flex-col items-center justify-center overflow-hidden text-center hover:border-orange"
                    style={{
                      gap: 8,
                      minHeight: 150,
                      border: '1.5px dashed #D6D3D1',
                      borderRadius: 12,
                      cursor: 'pointer',
                      background: '#FAFAF9',
                      padding: 16,
                    }}
                  >
                    {form.cover && (
                      <div
                        className="absolute inset-0"
                        style={{
                          backgroundImage: bgImage(form.cover),
                          backgroundSize: 'cover',
                          backgroundPosition: '50% 50%',
                        }}
                      />
                    )}
                    {!form.cover && (
                      <>
                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span className="text-muted" style={{ fontSize: 14 }}>
                          {uploading ? 'Uploading…' : 'Drag & drop an image here'}
                        </span>
                        <span
                          className="inline-block font-semibold text-orange"
                          style={{
                            fontSize: 13,
                            border: '1px solid #FB8500',
                            padding: '7px 14px',
                            borderRadius: 8,
                          }}
                        >
                          Browse files
                        </span>
                      </>
                    )}
                  </button>
                  <input
                    ref={coverInput}
                    type="file"
                    accept="image/*"
                    onChange={(e) => void onCoverFile(e.target.files?.[0])}
                    style={{ display: 'none' }}
                  />
                </div>

                {/* Additional images */}
                <div className="flex flex-col" style={{ gap: 8 }}>
                  <span className="font-semibold" style={{ fontSize: 13 }}>
                    Additional Images{' '}
                    <span className="text-placeholder" style={{ fontWeight: 400 }}>
                      ({form.images.length} / {MAX_IMAGES})
                    </span>
                  </span>
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    {form.images.map((src, i) => (
                      <div
                        key={`${src}-${i}`}
                        className="relative overflow-hidden"
                        style={{ aspectRatio: '1', borderRadius: 9, background: '#F0EFEC' }}
                      >
                        <div
                          className="absolute inset-0"
                          style={{
                            backgroundImage: bgImage(src),
                            backgroundSize: 'cover',
                            backgroundPosition: '50% 50%',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setForm((f) => ({ ...f, images: f.images.filter((_, x) => x !== i) }))
                          }
                          aria-label="Remove image"
                          className="absolute flex items-center justify-center border-0 text-white"
                          style={{
                            top: 4,
                            right: 4,
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: 'rgba(22,12,0,0.72)',
                            cursor: 'pointer',
                            fontSize: 13,
                            lineHeight: 1,
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}

                    {form.images.length < MAX_IMAGES && (
                      <button
                        type="button"
                        onClick={() => imagesInput.current?.click()}
                        className="flex items-center justify-center text-placeholder hover:border-orange hover:text-orange"
                        style={{
                          aspectRatio: '1',
                          border: '1.5px dashed #D6D3D1',
                          borderRadius: 9,
                          cursor: 'pointer',
                          background: '#FAFAF9',
                        }}
                        aria-label="Add images"
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                          <line x1="12" y1="5" x2="12" y2="19" />
                          <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <input
                    ref={imagesInput}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => void onAddImages(e.target.files)}
                    style={{ display: 'none' }}
                  />
                </div>

                <label className={labelCls} style={labelStyle}>
                  Title
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => upd('title', e.target.value)}
                    placeholder="Project title"
                    style={field}
                  />
                </label>

                {/*
                  Not in the design's drawer, but the table and the public project card
                  both render `location`, and without it a newly created project would
                  show a blank chip. Kept adjacent to City, which it shadows.
                */}
                <label className={labelCls} style={labelStyle}>
                  Location
                  <input
                    type="text"
                    value={form.loc}
                    onChange={(e) => upd('loc', e.target.value)}
                    placeholder="RIMI Milgrāvis — defaults to City if left blank"
                    style={field}
                  />
                </label>

                <label className={labelCls} style={labelStyle}>
                  Short Description
                  <textarea
                    rows={2}
                    value={form.shortDesc}
                    onChange={(e) => upd('shortDesc', e.target.value)}
                    placeholder="One-line summary"
                    style={{ ...field, resize: 'vertical' }}
                  />
                </label>

                <label className={labelCls} style={labelStyle}>
                  Full Description
                  <textarea
                    rows={4}
                    value={form.fullDesc}
                    onChange={(e) => upd('fullDesc', e.target.value)}
                    placeholder="Detailed project description"
                    style={{ ...field, resize: 'vertical' }}
                  />
                </label>

                <label className={labelCls} style={labelStyle}>
                  Service Type
                  <select
                    value={form.service}
                    onChange={(e) => upd('service', e.target.value)}
                    style={{ ...field, background: '#fff' }}
                  >
                    {/* Seeded rows carry richer free-text service copy than the six
                        options; preserve it rather than silently rewriting it. */}
                    {!(SERVICE_OPTIONS as readonly string[]).includes(form.service) && form.service && (
                      <option value={form.service}>{form.service}</option>
                    )}
                    {SERVICE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex" style={{ gap: 14 }}>
                  <label className={labelCls} style={{ ...labelStyle, flex: 1 }}>
                    Start Date
                    <input
                      type="date"
                      value={form.start}
                      onChange={(e) => upd('start', e.target.value)}
                      style={{ ...field, padding: '11px 13px' }}
                    />
                  </label>
                  <label className={labelCls} style={{ ...labelStyle, flex: 1 }}>
                    End Date
                    <input
                      type="date"
                      value={form.end}
                      onChange={(e) => upd('end', e.target.value)}
                      style={{ ...field, padding: '11px 13px' }}
                    />
                  </label>
                </div>

                <div className="flex" style={{ gap: 14 }}>
                  <label className={labelCls} style={{ ...labelStyle, flex: 1 }}>
                    Country
                    <input
                      type="text"
                      value={form.country}
                      onChange={(e) => upd('country', e.target.value)}
                      placeholder="Latvia"
                      style={field}
                    />
                  </label>
                  <label className={labelCls} style={{ ...labelStyle, flex: 1 }}>
                    City
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => upd('city', e.target.value)}
                      placeholder="Rīga"
                      style={field}
                    />
                  </label>
                </div>

                <label className={labelCls} style={labelStyle}>
                  Client / Construction Company
                  <input
                    type="text"
                    value={form.client}
                    onChange={(e) => upd('client', e.target.value)}
                    placeholder="Company name"
                    style={field}
                  />
                </label>

                <label className={labelCls} style={labelStyle}>
                  Status
                  <select
                    value={form.status}
                    onChange={(e) => upd('status', e.target.value as ProjectStatus)}
                    style={{ ...field, background: '#fff' }}
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={labelCls} style={labelStyle}>
                  Official Website URL
                  <input
                    type="url"
                    value={form.url}
                    onChange={(e) => upd('url', e.target.value)}
                    placeholder="https://..."
                    style={field}
                  />
                </label>
              </div>

              <div
                className="flex shrink-0"
                style={{ gap: 12, padding: '18px 28px', borderTop: '1px solid #EAEAE8' }}
              >
                <button
                  onClick={() => setPanelOpen(false)}
                  className="cursor-pointer bg-white text-ink font-semibold hover:border-ink"
                  style={{
                    flex: 1,
                    border: '1.5px solid #E7E5E4',
                    fontSize: 15,
                    padding: 13,
                    borderRadius: 10,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving || uploading}
                  className="cursor-pointer border-0 bg-orange text-ink font-semibold transition-colors hover:bg-orange-hover disabled:opacity-60"
                  style={{ flex: 1.4, fontSize: 15, padding: 13, borderRadius: 10 }}
                >
                  {saving ? 'Saving…' : 'Save Project'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------- DELETE CONFIRM ---------- */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setConfirmDelete(null)}
            className="fixed inset-0 flex items-center justify-center"
            style={{ zIndex: 150, background: 'rgba(22,12,0,0.45)', padding: 16 }}
          >
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-label="Confirm delete"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col bg-white"
              style={{ width: 400, maxWidth: '100%', borderRadius: 16, padding: 28, gap: 14 }}
            >
              <h2 className="m-0 font-bold" style={{ fontSize: 19, letterSpacing: '-0.4px' }}>
                Delete project?
              </h2>
              <p className="m-0 text-muted" style={{ fontSize: 15, lineHeight: 1.6 }}>
                <strong className="text-ink">{confirmDelete.title}</strong> will be permanently
                removed from the site. This cannot be undone.
              </p>
              <div className="flex" style={{ gap: 12, marginTop: 6 }}>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="cursor-pointer bg-white text-ink font-semibold hover:border-ink"
                  style={{
                    flex: 1,
                    border: '1.5px solid #E7E5E4',
                    fontSize: 15,
                    padding: 13,
                    borderRadius: 10,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => remove(confirmDelete)}
                  className="cursor-pointer border-0 text-white font-semibold"
                  style={{
                    flex: 1,
                    background: '#D64545',
                    fontSize: 15,
                    padding: 13,
                    borderRadius: 10,
                  }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
