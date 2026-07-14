import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Dropdown from '../../components/Dropdown';
import { useAdminShell } from '../components/context';
import {
  FONT,
  Field,
  IconEye,
  PrimaryBtn,
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
 */

type TabKey = 'profile' | 'site' | 'integrations' | 'notifications';

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
  const { toast, setSubtitle } = useAdminShell();
  const [tab, setTab] = useState<TabKey>('profile');

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
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

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
    const { error } = await supabase.from('site_settings').upsert({
      id: 1,
      title: site.title,
      tagline: site.tagline,
      email: site.email,
      phone: site.phone,
      lang: site.lang,
      announcement_enabled: site.ann,
      announcement_text: site.annText,
    });
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
