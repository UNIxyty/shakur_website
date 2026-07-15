import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { SiteStatus } from '../../lib/useSiteStatus';
import { assetUrl } from '../../lib/assets';
import Dropdown from '../../components/Dropdown';
import { SITE_STATUS_EVENT, useAdminShell } from '../components/context';
import { ListError } from '../components/RecordCards';
import {
  FONT,
  Field,
  IconEye,
  IconTrash,
  PrimaryBtn,
  Spinner,
  Toggle,
  focusHandlers,
  inputStyle,
  maskValue,
} from '../components/ui';

/**
 * Settings view from ShakurAdminPanel.dc.html — Profile / Site settings /
 * Integrations / Notifications tabs. Site settings persist to the single
 * site_settings row (id = 1); notification prefs live in localStorage because
 * the schema has no notif column (noted deviation).
 *
 * v4 additions on the Site settings tab:
 *  - Site status — the designed Live / Coming soon segmented control. Flips
 *    persist IMMEDIATELY (design's setLive/askComingSoon flow: live →
 *    coming_soon confirms first via the shell modal, both directions toast),
 *    then broadcast via SITE_STATUS_EVENT for the top-bar pill.
 *  - Logo carousel — marquee speed (site_settings.marquee_speed_s) and the
 *    site_logos rows (upload via POST /api/media like HomeView, rename,
 *    replace, delete, drag-to-reorder with a batched sort_order upsert).
 */

type TabKey = 'profile' | 'site' | 'integrations' | 'notifications';

const TAB_KEYS: TabKey[] = ['profile', 'site', 'integrations', 'notifications'];

type SiteLogo = {
  id: string;
  row: 1 | 2;
  name: string;
  img: string;
  sort_order: number;
};

type LogoUpload =
  | { state: 'idle' }
  | { state: 'uploading'; pct: number; name: string; row: 1 | 2; forId: string | null }
  | { state: 'error'; msg: string };

/** HomeView's accepted image set — the same /api/media pipeline. */
const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
const LOGO_MAX = 15 * 1024 * 1024;

const SPEED_MIN = 5;
const SPEED_MAX = 120;
const clampSpeed = (v: number) =>
  Math.min(SPEED_MAX, Math.max(SPEED_MIN, Math.round(Number.isFinite(v) ? v : 30)));

const STATUS_CACHE_KEY = 'shakur_site_status';

/** Column-missing shapes PostgREST returns before migrate-v4 has run. */
function isMissingColumn(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return err.code === '42703' || err.code === 'PGRST204' || /column/i.test(err.message ?? '');
}

function isMissingTable(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  return (
    err.code === '42P01' ||
    err.code === 'PGRST205' ||
    /does not exist|schema cache/i.test(err.message ?? '')
  );
}

const IconGlobe = () => (
  <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const IconClock = () => (
  <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconWarnAmber = () => (
  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#B7791F" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

const NOTIF_KEY = 'shakur_admin_notif';
type NotifPrefs = { newBooking: boolean; cancels: boolean; weekly: boolean; marketing: boolean };
const NOTIF_DEFAULTS: NotifPrefs = { newBooking: true, cancels: true, weekly: false, marketing: false };
const NOTIF_DEFS: [keyof NotifPrefs, string, string][] = [
  ['newBooking', 'New booking', 'Email me when someone books a meeting.'],
  ['cancels', 'Cancellations & reschedules', 'Email me when a booking changes.'],
  ['weekly', 'Weekly summary', 'A digest of the week ahead every Monday.'],
  ['marketing', 'Product updates', 'Occasional news about new features.'],
];

type SiteForm = {
  title: string;
  tagline: string;
  email: string;
  phone: string;
  lang: string;
  ann: boolean;
  annText: string;
};

const card: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #EAEAE8',
  borderRadius: 16,
  padding: 24,
};

const SUPA_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '';
const SUPA_ANON = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '';

function RevealInput({ value, masked }: { value: string; masked: boolean }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        readOnly
        value={masked && !revealed ? maskValue(value, 4) : value}
        style={{
          ...inputStyle,
          padding: '11px 44px 11px 13px',
          fontSize: 14,
          color: '#54504D',
          letterSpacing: 0.5,
        }}
      />
      {masked && (
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          aria-label="Reveal"
          style={{
            position: 'absolute',
            right: 6,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 32,
            height: 32,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: revealed ? '#FB8500' : '#A8A29E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <IconEye size={17} />
        </button>
      )}
    </div>
  );
}

export default function SettingsView() {
  const { toast, confirm, setSubtitle } = useAdminShell();
  const location = useLocation();
  const [tab, setTab] = useState<TabKey>(() => {
    const q = new URLSearchParams(location.search).get('tab');
    return TAB_KEYS.includes(q as TabKey) ? (q as TabKey) : 'profile';
  });

  // Deep link from the top-bar status pill: /admin/settings?tab=site.
  useEffect(() => {
    const q = new URLSearchParams(location.search).get('tab');
    if (TAB_KEYS.includes(q as TabKey)) setTab(q as TabKey);
  }, [location.search]);

  // ---- profile ----
  const [profile, setProfile] = useState({ name: 'Admin', email: '', cur: '', next: '', conf: '' });
  // ---- site ----
  const [site, setSite] = useState<SiteForm>({
    title: '',
    tagline: '',
    email: '',
    phone: '',
    lang: 'English',
    ann: false,
    annText: '',
  });
  // ---- notifications ----
  const [notif, setNotif] = useState<NotifPrefs>(() => {
    try {
      const raw = localStorage.getItem(NOTIF_KEY);
      return raw ? { ...NOTIF_DEFAULTS, ...(JSON.parse(raw) as Partial<NotifPrefs>) } : NOTIF_DEFAULTS;
    } catch {
      return NOTIF_DEFAULTS;
    }
  });
  const [saving, setSaving] = useState(false);

  // ---- v4: site status + logo carousel ----
  const [status, setStatus] = useState<SiteStatus>('live');
  const [speed, setSpeed] = useState(30);
  /** false once the loaded site_settings row lacks the v4 columns. */
  const [v4Cols, setV4Cols] = useState(true);
  const [logos, setLogos] = useState<SiteLogo[] | null>(null);
  const [logosError, setLogosError] = useState<'schema' | 'query' | null>(null);
  const [logoUpload, setLogoUpload] = useState<LogoUpload>({ state: 'idle' });
  const [dragging, setDragging] = useState<string | null>(null);

  const logoXhrRef = useRef<XMLHttpRequest | null>(null);
  const filePickRef = useRef<HTMLInputElement | null>(null);
  /** What the hidden file input is picking for: add-to-row or replace-image. */
  const pickTargetRef = useRef<{ row: 1 | 2; forId: string | null }>({ row: 1, forId: null });

  useEffect(() => () => logoXhrRef.current?.abort(), []);

  useEffect(() => {
    setSubtitle('Manage your account and site');
    return () => setSubtitle(null);
  }, [setSubtitle]);

  const loadAll = useCallback(async () => {
    if (!supabase) return;
    const [{ data: userData }, { data: settings }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
    ]);
    const user = userData.user;
    if (user) {
      setProfile((p) => ({
        ...p,
        name: (user.user_metadata?.name as string | undefined) ?? 'Admin',
        email: user.email ?? '',
      }));
    }
    if (settings) {
      setSite({
        title: settings.title as string,
        tagline: settings.tagline as string,
        email: settings.email as string,
        phone: settings.phone as string,
        lang: settings.lang as string,
        ann: settings.announcement_enabled as boolean,
        annText: settings.announcement_text as string,
      });
      // v4 columns: present only after supabase/migrate-v4.sql has run.
      const hasV4 = Object.prototype.hasOwnProperty.call(settings, 'status');
      setV4Cols(hasV4);
      if (hasV4) {
        const st = settings.status as unknown;
        if (st === 'live' || st === 'coming_soon') setStatus(st);
        const sp = settings.marquee_speed_s as unknown;
        if (typeof sp === 'number') setSpeed(clampSpeed(sp));
      }
    }
  }, []);

  const loadLogos = useCallback(async () => {
    if (!supabase) return;
    setLogosError(null);
    const { data, error: err } = await supabase
      .from('site_logos')
      .select('*')
      .order('row', { ascending: true })
      .order('sort_order', { ascending: true });
    if (err) {
      setLogosError(isMissingTable(err) ? 'schema' : 'query');
      setLogos(null);
      return;
    }
    setLogos(
      ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        id: String(r.id),
        row: r.row === 2 ? 2 : 1,
        name: typeof r.name === 'string' ? r.name : '',
        img: typeof r.img === 'string' ? r.img : '',
        sort_order: typeof r.sort_order === 'number' ? r.sort_order : 0,
      }))
    );
  }, []);

  useEffect(() => {
    void loadAll();
    void loadLogos();
  }, [loadAll, loadLogos]);

  /* ---- v4: site status (immediate persist per the design's askComingSoon flow) ---- */

  const persistStatus = async (next: SiteStatus) => {
    if (!supabase) return;
    if (!v4Cols) {
      toast('Run supabase/migrate-v4.sql first — the database has no status column yet');
      return;
    }
    const prev = status;
    setStatus(next); // optimistic — the design flips instantly on confirm
    const { error } = await supabase.from('site_settings').upsert({ id: 1, status: next });
    if (error) {
      setStatus(prev);
      toast(
        isMissingColumn(error)
          ? 'Run supabase/migrate-v4.sql first — the database has no status column yet'
          : "Couldn't update the site status"
      );
      return;
    }
    try {
      localStorage.setItem(STATUS_CACHE_KEY, next);
    } catch {
      /* best-effort cache */
    }
    window.dispatchEvent(new CustomEvent(SITE_STATUS_EVENT, { detail: next }));
    toast(
      next === 'live' ? 'Site is now Live' : 'Site set to Coming soon — public site is now hidden'
    );
  };

  /** Design setLive: switching back to Live is immediate, no confirm. */
  const setLive = () => {
    if (status === 'live') return;
    void persistStatus('live');
  };

  /** Design askComingSoon: confirm with the exact copy, then flip + toast. */
  const askComingSoon = async () => {
    if (status !== 'live') return;
    const ok = await confirm({
      title: 'Take the site offline?',
      message:
        'Visitors will see the “Coming soon” page instead of your website until you switch back to Live. Bookings and forms will be unavailable.',
      label: 'Switch to Coming soon',
    });
    if (ok) void persistStatus('coming_soon');
  };

  /* ---- v4: marquee speed (persist on slider release / number blur) ---- */

  const commitSpeed = async (raw: number) => {
    if (!supabase) return;
    const next = clampSpeed(raw);
    setSpeed(next);
    if (!v4Cols) return; // saved silently once the migration has run
    const { error } = await supabase
      .from('site_settings')
      .upsert({ id: 1, marquee_speed_s: next });
    if (error) toast("Couldn't save the marquee speed");
  };

  /* ---- v4: logo carousel CRUD (site_logos) ---- */

  const rowLogos = (row: 1 | 2) => (logos ?? []).filter((l) => l.row === row);

  const openFilePick = (row: 1 | 2, forId: string | null) => {
    pickTargetRef.current = { row, forId };
    filePickRef.current?.click();
  };

  /** HomeView's XHR /api/media pattern — real progress, Bearer session token. */
  const uploadLogoFile = (file: File) => {
    if (!supabase) return;
    const { row, forId } = pickTargetRef.current;
    if (!LOGO_TYPES.includes(file.type)) {
      setLogoUpload({ state: 'error', msg: 'Only JPG, PNG, WebP, AVIF or GIF images are allowed.' });
      return;
    }
    if (file.size > LOGO_MAX) {
      setLogoUpload({ state: 'error', msg: 'That image is over 15 MB — pick a smaller file.' });
      return;
    }
    const client = supabase;
    setLogoUpload({ state: 'uploading', pct: 0, name: file.name, row, forId });
    void (async () => {
      const { data } = await client.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setLogoUpload({ state: 'error', msg: 'Your session expired — sign in again.' });
        return;
      }
      const fd = new FormData();
      fd.append('file', file);
      const xhr = new XMLHttpRequest();
      logoXhrRef.current = xhr;
      xhr.open('POST', '/api/media');
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setLogoUpload({
            state: 'uploading',
            pct: Math.round((e.loaded / e.total) * 100),
            name: file.name,
            row,
            forId,
          });
        }
      };
      xhr.onerror = () => setLogoUpload({ state: 'error', msg: 'Upload failed — network error.' });
      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const res = JSON.parse(xhr.responseText) as { path: string };
            void placeUploadedLogo(res.path, row, forId, file.name);
          } catch {
            setLogoUpload({ state: 'error', msg: 'Upload failed — unexpected server response.' });
          }
        } else if (xhr.status === 503) {
          setLogoUpload({ state: 'error', msg: "The media service isn't configured on the server." });
        } else {
          setLogoUpload({ state: 'error', msg: `Upload failed (${xhr.status}) — try again.` });
        }
      };
      xhr.send(fd);
    })();
  };

  const placeUploadedLogo = async (
    img: string,
    row: 1 | 2,
    forId: string | null,
    fileName: string
  ) => {
    if (!supabase) return;
    if (forId) {
      // Replace an existing logo's image.
      const { error } = await supabase.from('site_logos').update({ img }).eq('id', forId);
      if (error) {
        setLogoUpload({ state: 'error', msg: "Couldn't save the new image — try again." });
        return;
      }
      setLogos((ls) => (ls ?? []).map((l) => (l.id === forId ? { ...l, img } : l)));
      setLogoUpload({ state: 'idle' });
      toast('Logo image replaced');
      return;
    }
    // Add a new logo at the end of the row; default name = the file name.
    const name = fileName.replace(/\.[a-z0-9]+$/i, '').trim();
    const sort = rowLogos(row).reduce((m, l) => Math.max(m, l.sort_order + 1), 0);
    const { data, error } = await supabase
      .from('site_logos')
      .insert({ row, name, img, sort_order: sort })
      .select()
      .single();
    if (error || !data) {
      setLogoUpload({
        state: 'error',
        msg: isMissingTable(error)
          ? 'Run supabase/migrate-v4.sql first — the site_logos table is missing.'
          : "Couldn't add the logo — try again.",
      });
      return;
    }
    const r = data as Record<string, unknown>;
    setLogos((ls) => [
      ...(ls ?? []),
      { id: String(r.id), row, name, img, sort_order: sort },
    ]);
    setLogoUpload({ state: 'idle' });
    toast('Logo added');
  };

  /** Name field: controlled locally, persisted on blur (silent like HomeView drafts). */
  const setLogoName = (id: string, name: string) =>
    setLogos((ls) => (ls ?? []).map((l) => (l.id === id ? { ...l, name } : l)));

  const persistLogoName = async (id: string) => {
    if (!supabase) return;
    const current = (logos ?? []).find((l) => l.id === id);
    if (!current) return;
    const { error } = await supabase
      .from('site_logos')
      .update({ name: current.name })
      .eq('id', id);
    if (error) toast("Couldn't save the logo name");
  };

  const deleteLogo = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from('site_logos').delete().eq('id', id);
    if (error) {
      toast("Couldn't delete the logo");
      return;
    }
    setLogos((ls) => (ls ?? []).filter((l) => l.id !== id));
    toast('Logo removed');
  };

  /** Drop handler: reorder within the row, then batch-persist sort_order. */
  const dropLogo = (row: 1 | 2, targetId: string) => {
    const from = dragging;
    setDragging(null);
    if (!from || from === targetId || !logos) return;
    const inRow = rowLogos(row);
    const fromIdx = inRow.findIndex((l) => l.id === from);
    const toIdx = inRow.findIndex((l) => l.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return; // cross-row drags are ignored
    const next = [...inRow];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    const renumbered = next.map((l, i) => ({ ...l, sort_order: i }));
    setLogos((ls) =>
      (ls ?? []).map((l) => renumbered.find((n) => n.id === l.id) ?? l)
    );
    if (!supabase) return;
    void supabase
      .from('site_logos')
      .upsert(renumbered.map(({ id, row: r, name, img, sort_order }) => ({ id, row: r, name, img, sort_order })))
      .then(({ error }) => {
        if (error) {
          toast("Couldn't save the new order");
          void loadLogos();
        }
      });
  };

  const saveProfile = async () => {
    if (!supabase || saving) return;
    const wantsPassword = profile.cur || profile.next || profile.conf;
    if (wantsPassword) {
      if (!profile.cur) return toast('Enter your current password');
      if (profile.next.length < 8) return toast('New password must be at least 8 characters');
      if (profile.next !== profile.conf) return toast("New passwords don't match");
    }
    setSaving(true);
    try {
      if (wantsPassword) {
        // Verify the current password before changing it.
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: profile.email,
          password: profile.cur,
        });
        if (signInErr) {
          toast('Current password is incorrect');
          return;
        }
        const { error } = await supabase.auth.updateUser({ password: profile.next });
        if (error) {
          toast(error.message);
          return;
        }
      }
      const { error } = await supabase.auth.updateUser({ data: { name: profile.name } });
      if (error) {
        toast(error.message);
        return;
      }
      setProfile((p) => ({ ...p, cur: '', next: '', conf: '' }));
      toast(wantsPassword ? 'Password updated' : 'Settings saved');
    } finally {
      setSaving(false);
    }
  };

  const saveSite = async () => {
    if (!supabase || saving) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      id: 1,
      title: site.title,
      tagline: site.tagline,
      email: site.email,
      phone: site.phone,
      lang: site.lang,
      announcement_enabled: site.ann,
      announcement_text: site.annText,
    };
    if (v4Cols) {
      // status/speed already persist on toggle; Save keeps them consistent.
      payload.status = status;
      payload.marquee_speed_s = clampSpeed(speed);
    }
    const { error } = await supabase.from('site_settings').upsert(payload);
    setSaving(false);
    if (error) toast("Couldn't save site settings");
    else toast('Settings saved');
  };

  const saveNotif = () => {
    try {
      localStorage.setItem(NOTIF_KEY, JSON.stringify(notif));
    } catch {
      /* ignore */
    }
    toast('Settings saved');
  };

  const textField = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    type = 'text',
    placeholder = ''
  ) => (
    <Field label={label}>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, padding: '11px 13px' }}
        {...focusHandlers()}
      />
    </Field>
  );

  const saveRow = (onClick: () => void) => (
    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
      <PrimaryBtn onClick={onClick} disabled={saving} style={{ padding: '12px 22px' }}>
        {saving ? 'Saving…' : 'Save changes'}
      </PrimaryBtn>
    </div>
  );

  const tabs: [TabKey, string][] = [
    ['profile', 'Profile'],
    ['site', 'Site settings'],
    ['integrations', 'Integrations'],
    ['notifications', 'Notifications'],
  ];

  return (
    <>
      <div
        className="adm-scroll"
        style={{
          display: 'flex',
          gap: 6,
          borderBottom: '1px solid #EAEAE8',
          marginBottom: 26,
          overflowX: 'auto',
        }}
      >
        {tabs.map(([key, label]) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontFamily: FONT,
                fontWeight: 600,
                fontSize: 15,
                padding: '12px 6px',
                marginRight: 18,
                color: active ? '#160C00' : '#A8A29E',
                borderBottom: `2px solid ${active ? '#FB8500' : 'transparent'}`,
                whiteSpace: 'nowrap',
                marginBottom: -1,
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Profile */}
      {tab === 'profile' && (
        <div style={{ maxWidth: 620, display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={card}>
            <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700 }}>Account</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
              <div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: '#160C00',
                  color: '#FB8500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 24,
                  fontWeight: 700,
                }}
              >
                {(profile.name[0] ?? 'A').toUpperCase()}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => toast('Avatar upload is not available yet')}
                  style={{
                    border: '1px solid #E7E5E4',
                    background: '#fff',
                    cursor: 'pointer',
                    fontFamily: FONT,
                    fontWeight: 600,
                    fontSize: 14,
                    padding: '9px 14px',
                    borderRadius: 9,
                    color: '#160C00',
                  }}
                >
                  Change avatar
                </button>
                <span style={{ fontSize: 12, color: '#A8A29E' }}>JPG or PNG, max 2 MB</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {textField('Full name', profile.name, (v) => setProfile((p) => ({ ...p, name: v })))}
              {textField(
                'Email address',
                profile.email,
                (v) => setProfile((p) => ({ ...p, email: v })),
                'email'
              )}
            </div>
          </div>
          <div style={card}>
            <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700 }}>Change password</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {textField(
                'Current password',
                profile.cur,
                (v) => setProfile((p) => ({ ...p, cur: v })),
                'password',
                '••••••••'
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {textField(
                  'New password',
                  profile.next,
                  (v) => setProfile((p) => ({ ...p, next: v })),
                  'password',
                  '••••••••'
                )}
                {textField(
                  'Confirm new password',
                  profile.conf,
                  (v) => setProfile((p) => ({ ...p, conf: v })),
                  'password',
                  '••••••••'
                )}
              </div>
            </div>
          </div>
          {saveRow(() => void saveProfile())}
        </div>
      )}

      {/* Site settings */}
      {tab === 'site' && (
        <div style={{ maxWidth: 620, display: 'flex', flexDirection: 'column', gap: 22 }}>
          {/* hidden picker shared by "Add logo" and "Replace" */}
          <input
            ref={filePickRef}
            type="file"
            accept={LOGO_TYPES.join(',')}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadLogoFile(f);
              e.target.value = '';
            }}
            style={{ display: 'none' }}
          />

          {/* ---- Site status (design: two-cell segmented control) ---- */}
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
              }}
            >
              <div style={{ minWidth: 200 }}>
                <h3 style={{ margin: '0 0 3px', fontSize: 16, fontWeight: 700 }}>Site status</h3>
                <p style={{ margin: 0, fontSize: 13, color: '#A8A29E', lineHeight: 1.5 }}>
                  Choose whether the public website is live or shows the coming-soon page.
                </p>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 13,
                  fontWeight: 700,
                  padding: '7px 13px',
                  borderRadius: 999,
                  background: status === 'live' ? '#E6F4EC' : '#FDF0DC',
                  color: status === 'live' ? '#1F8A5B' : '#B7791F',
                  border: `1px solid ${status === 'live' ? '#C7E6D3' : '#F0D8B8'}`,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: status === 'live' ? '#1F8A5B' : '#B7791F',
                    boxShadow: `0 0 0 3px ${
                      status === 'live' ? 'rgba(31,138,91,0.18)' : 'rgba(183,121,31,0.18)'
                    }`,
                  }}
                />
                {status === 'live' ? 'Live' : 'Coming soon'}
              </span>
            </div>

            <div
              role="group"
              aria-label="Site status"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                background: '#F5F5F4',
                padding: 6,
                borderRadius: 15,
              }}
            >
              {(
                [
                  {
                    key: 'live' as const,
                    title: 'Live',
                    sub: 'Visible to everyone',
                    activeBorder: '#C7E6D3',
                    iconBg: '#E6F4EC',
                    iconColor: '#1F8A5B',
                    icon: <IconGlobe />,
                    onClick: setLive,
                  },
                  {
                    key: 'coming_soon' as const,
                    title: 'Coming soon',
                    sub: 'Public site hidden',
                    activeBorder: '#F0D8B8',
                    iconBg: '#FDF0DC',
                    iconColor: '#B7791F',
                    icon: <IconClock />,
                    onClick: () => void askComingSoon(),
                  },
                ]
              ).map((seg) => {
                const active = status === seg.key;
                return (
                  <button
                    key={seg.key}
                    type="button"
                    onClick={seg.onClick}
                    style={{
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: FONT,
                      border: `1px solid ${active ? seg.activeBorder : 'transparent'}`,
                      background: active ? '#FFFFFF' : 'transparent',
                      boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                      borderRadius: 11,
                      padding: '14px 15px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      transition: 'all .15s ease',
                    }}
                  >
                    <span
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: active ? seg.iconBg : '#ECEBE9',
                        color: active ? seg.iconColor : '#A8A29E',
                      }}
                    >
                      {seg.icon}
                    </span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: active ? '#160C00' : '#A8A29E',
                        }}
                      >
                        {seg.title}
                      </span>
                      <span style={{ fontSize: 12, color: '#A8A29E' }}>{seg.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {status === 'coming_soon' && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  background: '#FDF0DC',
                  border: '1px solid #F0D8B8',
                  borderRadius: 11,
                  padding: '12px 14px',
                }}
              >
                <IconWarnAmber />
                <span style={{ fontSize: 13, color: '#8A6A2E', lineHeight: 1.55 }}>
                  Your website is currently <strong>hidden</strong>. Visitors see the coming-soon
                  page and cannot book or submit forms. Switch to <strong>Live</strong> to bring
                  it back.
                </span>
              </div>
            )}

            {!v4Cols && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  background: '#FDF0DC',
                  border: '1px solid #F0D8B8',
                  borderRadius: 11,
                  padding: '12px 14px',
                }}
              >
                <IconWarnAmber />
                <span style={{ fontSize: 13, color: '#8A6A2E', lineHeight: 1.55 }}>
                  The database doesn&apos;t have the v4 columns yet — run{' '}
                  <strong>supabase/migrate-v4.sql</strong> in the Supabase SQL editor to enable
                  the site-status switch and the carousel speed.
                </span>
              </div>
            )}
          </div>

          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>General</h3>
            {textField('Site title', site.title, (v) => setSite((s) => ({ ...s, title: v })))}
            {textField('Tagline', site.tagline, (v) => setSite((s) => ({ ...s, tagline: v })))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {textField(
                'Contact email',
                site.email,
                (v) => setSite((s) => ({ ...s, email: v })),
                'email'
              )}
              {textField('Phone', site.phone, (v) => setSite((s) => ({ ...s, phone: v })), 'tel')}
            </div>
            <Field label="Default language">
              <Dropdown
                value={site.lang}
                options={['English', 'Latviešu', 'Русский']}
                onChange={(v) => setSite((s) => ({ ...s, lang: v }))}
              />
            </Field>
          </div>
          <div style={card}>
            <div
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
            >
              <div>
                <h3 style={{ margin: '0 0 3px', fontSize: 16, fontWeight: 700 }}>
                  Announcement bar
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: '#A8A29E' }}>
                  Yellow banner shown above the site header.
                </p>
              </div>
              <Toggle
                on={site.ann}
                onToggle={() => setSite((s) => ({ ...s, ann: !s.ann }))}
                ariaLabel="Announcement bar"
              />
            </div>
            {site.ann && (
              <input
                type="text"
                value={site.annText}
                onChange={(e) => setSite((s) => ({ ...s, annText: e.target.value }))}
                style={{ ...inputStyle, marginTop: 16, padding: '11px 13px' }}
                {...focusHandlers()}
              />
            )}
          </div>

          {/* ---- Logo carousel (v4) ---- */}
          <div style={{ ...card, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h3 style={{ margin: '0 0 3px', fontSize: 16, fontWeight: 700 }}>Logo carousel</h3>
              <p style={{ margin: 0, fontSize: 13, color: '#A8A29E', lineHeight: 1.5 }}>
                Partner logos on the home page — two rows scrolling in opposite directions.
              </p>
            </div>

            {logosError ? (
              <ListError
                noun="the logo carousel"
                detail={
                  logosError === 'schema'
                    ? "The database doesn't have the site_logos table yet — run supabase/migrate-v4.sql in the Supabase SQL editor, then try again."
                    : undefined
                }
                onRetry={() => void loadLogos()}
              />
            ) : logos === null ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="adm-skel" style={{ height: 52, borderRadius: 10 }} />
                ))}
              </div>
            ) : (
              <>
                {/* speed */}
                <Field label="Speed">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <input
                      type="range"
                      min={SPEED_MIN}
                      max={SPEED_MAX}
                      value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))}
                      onPointerUp={(e) => void commitSpeed(Number(e.currentTarget.value))}
                      onBlur={(e) => void commitSpeed(Number(e.currentTarget.value))}
                      aria-label="Marquee speed, seconds per loop"
                      style={{ flex: 1, minWidth: 160, accentColor: '#FB8500' }}
                    />
                    <input
                      type="number"
                      min={SPEED_MIN}
                      max={SPEED_MAX}
                      value={speed}
                      onChange={(e) => setSpeed(Number(e.target.value))}
                      aria-label="Marquee speed in seconds"
                      style={{ ...inputStyle, width: 78, padding: '9px 10px', fontSize: 14 }}
                      {...focusHandlers()}
                      onBlur={(e) => {
                        focusHandlers().onBlur(e);
                        void commitSpeed(Number(e.currentTarget.value));
                      }}
                    />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#54504D' }}>
                      {clampSpeed(speed)}s per loop
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: '#A8A29E', fontWeight: 400 }}>
                    Row 1 loops in {clampSpeed(speed)}s; row 2 keeps the designed ratio (~
                    {Math.round((clampSpeed(speed) * 25) / 30)}s).
                  </span>
                </Field>

                {/* logo rows */}
                {([1, 2] as const).map((row) => {
                  const items = rowLogos(row);
                  return (
                    <div key={row} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        Row {row}{' '}
                        <span style={{ color: '#A8A29E', fontWeight: 500 }}>
                          · scrolls {row === 1 ? 'left' : 'right'}
                        </span>
                      </div>

                      {items.length === 0 && (
                        <div
                          style={{
                            border: '1px dashed #E0DEDB',
                            borderRadius: 10,
                            padding: '14px 12px',
                            fontSize: 13,
                            color: '#A8A29E',
                            textAlign: 'center',
                          }}
                        >
                          No logos in this row yet.
                        </div>
                      )}

                      {items.map((l) => (
                        <div
                          key={l.id}
                          draggable
                          onDragStart={() => setDragging(l.id)}
                          onDragEnd={() => setDragging(null)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => dropLogo(row, l.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            border: '1px solid #EAEAE8',
                            borderRadius: 10,
                            padding: '8px 10px',
                            background: '#fff',
                            opacity: dragging === l.id ? 0.5 : 1,
                            cursor: 'grab',
                          }}
                        >
                          <svg width={14} height={14} viewBox="0 0 24 24" fill="#A8A29E" style={{ flexShrink: 0 }} aria-hidden="true">
                            <circle cx="9" cy="5" r="1.6" />
                            <circle cx="15" cy="5" r="1.6" />
                            <circle cx="9" cy="12" r="1.6" />
                            <circle cx="15" cy="12" r="1.6" />
                            <circle cx="9" cy="19" r="1.6" />
                            <circle cx="15" cy="19" r="1.6" />
                          </svg>
                          <div
                            style={{
                              width: 64,
                              height: 36,
                              borderRadius: 7,
                              background: '#FAFAF9',
                              border: '1px solid #F0EFEC',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              flexShrink: 0,
                            }}
                          >
                            {l.img ? (
                              <img
                                src={assetUrl(l.img)}
                                alt=""
                                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                              />
                            ) : (
                              <span style={{ fontSize: 10, color: '#A8A29E' }}>—</span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={l.name}
                            placeholder="Logo name"
                            onChange={(e) => setLogoName(l.id, e.target.value)}
                            aria-label="Logo name"
                            style={{ ...inputStyle, flex: 1, minWidth: 0, padding: '8px 10px', fontSize: 14 }}
                            {...focusHandlers()}
                            onBlur={(e) => {
                              focusHandlers().onBlur(e);
                              void persistLogoName(l.id);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => openFilePick(row, l.id)}
                            style={{
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                              color: '#FB8500',
                              fontWeight: 600,
                              fontSize: 12,
                              padding: '4px 2px',
                              fontFamily: FONT,
                              flexShrink: 0,
                            }}
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteLogo(l.id)}
                            aria-label={`Delete ${l.name || 'logo'}`}
                            style={{
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                              color: '#A8A29E',
                              display: 'flex',
                              padding: 4,
                              flexShrink: 0,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#D64545';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = '#A8A29E';
                            }}
                          >
                            <IconTrash />
                          </button>
                        </div>
                      ))}

                      {logoUpload.state === 'uploading' && logoUpload.row === row ? (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 7,
                            background: '#FFF9F1',
                            border: '1px solid #F0D8B8',
                            borderRadius: 10,
                            padding: '10px 12px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Spinner size={14} />
                            <span
                              style={{
                                flex: 1,
                                fontSize: 12,
                                fontWeight: 600,
                                color: '#160C00',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {logoUpload.name}
                            </span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#FB8500' }}>
                              {logoUpload.pct}%
                            </span>
                          </div>
                          <div
                            style={{
                              height: 5,
                              borderRadius: 999,
                              background: '#EAEAE8',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${logoUpload.pct}%`,
                                background: '#FB8500',
                                borderRadius: 999,
                                transition: 'width .25s ease',
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openFilePick(row, null)}
                          disabled={logoUpload.state === 'uploading'}
                          style={{
                            border: '1px dashed #E0DEDB',
                            background: '#FAFAF9',
                            cursor: logoUpload.state === 'uploading' ? 'default' : 'pointer',
                            borderRadius: 10,
                            padding: '10px 12px',
                            fontFamily: FONT,
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#54504D',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 7,
                            opacity: logoUpload.state === 'uploading' ? 0.6 : 1,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#FB8500';
                            e.currentTarget.style.color = '#FB8500';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#E0DEDB';
                            e.currentTarget.style.color = '#54504D';
                          }}
                        >
                          <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          Add logo — JPG, PNG, WebP, AVIF or GIF · up to 15 MB
                        </button>
                      )}
                    </div>
                  );
                })}

                {logoUpload.state === 'error' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#FDF3F3',
                      border: '1px solid #F3D6D6',
                      borderRadius: 10,
                      padding: '9px 12px',
                    }}
                  >
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#D64545' }}>
                      {logoUpload.msg}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLogoUpload({ state: 'idle' })}
                      aria-label="Dismiss"
                      style={{
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                        color: '#A8A29E',
                        padding: 0,
                        fontFamily: FONT,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {saveRow(() => void saveSite())}
        </div>
      )}

      {/* Integrations */}
      {tab === 'integrations' && (
        <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={card}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 18,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Supabase</h3>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: SUPA_URL ? '#E6F4EC' : '#FDF0DC',
                  color: SUPA_URL ? '#1F8A5B' : '#B7791F',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: SUPA_URL ? '#1F8A5B' : '#B7791F',
                  }}
                />
                {SUPA_URL ? 'Connected' : 'Action needed'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="Project URL">
                <RevealInput value={SUPA_URL || 'Not configured'} masked={false} />
              </Field>
              <Field label="Anon key">
                <RevealInput value={SUPA_ANON || 'Not configured'} masked={Boolean(SUPA_ANON)} />
              </Field>
              <Field label="Service role key">
                <RevealInput value="••• set on the server" masked={false} />
              </Field>
            </div>
          </div>
          <div style={card}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 18,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Resend (email)</h3>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: '#FDF0DC',
                  color: '#B7791F',
                }}
              >
                <span
                  style={{ width: 7, height: 7, borderRadius: '50%', background: '#B7791F' }}
                />
                Action needed
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field label="API key">
                <RevealInput value="••• set on the server" masked={false} />
              </Field>
              <Field label="From email">
                <RevealInput value="••• set on the server" masked={false} />
              </Field>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#A8A29E', lineHeight: 1.6 }}>
            These values are read-only. Environment variables are the source of truth — browser
            keys come from the site build (VITE_*), server keys live only in the API service’s
            environment and never reach the browser.
          </p>
        </div>
      )}

      {/* Notifications */}
      {tab === 'notifications' && (
        <div style={{ maxWidth: 620, display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            {NOTIF_DEFS.map(([key, title, desc], i) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 20,
                  padding: '20px 24px',
                  borderTop: i === 0 ? 'none' : '1px solid #F2F1EF',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{title}</div>
                  <div style={{ fontSize: 13, color: '#A8A29E' }}>{desc}</div>
                </div>
                <Toggle
                  on={notif[key]}
                  onToggle={() => setNotif((n) => ({ ...n, [key]: !n[key] }))}
                  ariaLabel={title}
                />
              </div>
            ))}
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#A8A29E' }}>
            Stored in this browser — the database schema has no notification column yet.
          </p>
          {saveRow(saveNotif)}
        </div>
      )}
    </>
  );
}
