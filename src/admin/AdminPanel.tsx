import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AdminShellContext, type AdminShell, type ConfirmOptions } from './components/context';
import {
  FONT,
  IconCalendar,
  IconClose,
  IconProjects,
  IconServices,
  IconWarning,
} from './components/ui';
import DashboardView from './views/DashboardView';
import HomeView from './views/HomeView';
import ProjectsView from './views/ProjectsView';
import ServicesView from './views/ServicesView';
import AvailabilityView from './views/AvailabilityView';
import MeetingsView from './views/MeetingsView';
import SettingsView from './views/SettingsView';

/**
 * Admin panel shell from ShakurAdminPanel.dc.html (+ the Dashboard entry from
 * ShakurDashboard.dc.html): collapsible sidebar (236px ↔ 76px), top bar with
 * view title/subtitle + search, mobile drawer under 820px, view fade
 * transition, bottom-right toasts (3200 ms), and the global confirm modal.
 */

const STYLE = `
  @keyframes admSpinKf { to { transform: rotate(360deg); } }
  @keyframes admShimmer { 0% { background-position: -320px 0; } 100% { background-position: 320px 0; } }
  .adm-spin { animation: admSpinKf .7s linear infinite; }
  .adm-skel { background: linear-gradient(90deg, #F0EFEC 25%, #F7F6F4 50%, #F0EFEC 75%); background-size: 320px 100%; animation: admShimmer 1.2s infinite linear; border-radius: 6px; }
  .adm-wrap input::placeholder, .adm-wrap textarea::placeholder { color: #A8A29E; }
  .adm-wrap ::selection { background: #FB8500; color: #160C00; }
  .adm-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
  .adm-scroll::-webkit-scrollbar-thumb { background: #E0DEDB; border-radius: 8px; border: 2px solid transparent; background-clip: padding-box; }
  .adm-scroll::-webkit-scrollbar-thumb:hover { background: #CFCCC8; background-clip: padding-box; }
  .adm-card:hover { box-shadow: 0 12px 30px rgba(22,12,0,0.1); border-color: #DAD7D3 !important; }
  .adm-row:hover { background: #FAFAF9; }
  .adm-quick:hover { border-color: #FB8500 !important; }
  .adm-gal-item:hover .adm-gal-actions { opacity: 1 !important; }
  .adm-hamburger { display: none !important; }
  .adm-mobile-overlay { display: none; }
  @media (max-width: 820px) {
    .adm-aside { position: fixed !important; top: 0; left: 0; bottom: 0; z-index: 130; transform: translateX(-100%); transition: transform .28s cubic-bezier(0.22,1,0.36,1); width: 264px !important; }
    .adm-aside.adm-open { transform: translateX(0); box-shadow: 12px 0 44px rgba(0,0,0,0.22); }
    .adm-collapse-btn { display: none !important; }
    .adm-hamburger { display: inline-flex !important; }
    .adm-mobile-overlay.adm-show { display: block !important; }
    .adm-search { display: none !important; }
    .adm-topbar { padding: 16px 18px !important; }
    .adm-content { padding: 18px !important; }
    .adm-avatar-name { display: none !important; }
  }
`;

type ViewKey =
  | 'dashboard'
  | 'home'
  | 'projects'
  | 'services'
  | 'availability'
  | 'meetings'
  | 'settings';

const VIEW_META: Record<ViewKey, { title: string; subtitle: string; search?: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Site traffic and recent activity' },
  home: {
    title: 'Home page',
    subtitle: 'Edit the public home page — section by section, with a live preview',
    search: 'Search…',
  },
  projects: {
    title: 'Projects',
    subtitle: 'Manage your portfolio',
    search: 'Search projects…',
  },
  services: {
    title: 'Services',
    subtitle: 'Manage the public service cards',
    search: 'Search services…',
  },
  availability: { title: 'Availability', subtitle: 'Define when meetings can be booked' },
  meetings: {
    title: 'Meetings',
    subtitle: 'Bookings from the public site',
    search: 'Search attendees…',
  },
  settings: { title: 'Settings', subtitle: 'Manage your account and site' },
};

type Toast = { id: number; msg: string };
type ConfirmState = { opts: ConfirmOptions; resolve: (ok: boolean) => void };

const NavIconDashboard = ({ stroke }: { stroke: string }) => (
  <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>
);

const NavIconHome = ({ stroke }: { stroke: string }) => (
  <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

const NavIconMeetings = ({ stroke }: { stroke: string }) => (
  <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const NavIconSettings = ({ stroke }: { stroke: string }) => (
  <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </svg>
);

export default function AdminPanel() {
  const location = useLocation();
  const navigate = useNavigate();

  const view: ViewKey = useMemo(() => {
    const seg = location.pathname.replace(/^\/admin\/?/, '').split('/')[0];
    return (['home', 'projects', 'services', 'availability', 'meetings', 'settings'].includes(seg)
      ? seg
      : 'dashboard') as ViewKey;
  }, [location.pathname]);

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [subtitle, setSubtitleState] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('Admin');
  const toastId = useRef(0);

  // Design go(view): clears search and closes the mobile drawer on navigation.
  useEffect(() => {
    setSearch('');
    setMobileOpen(false);
  }, [view]);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setAdminEmail(data.user.email ?? '');
        const n = data.user.user_metadata?.name as string | undefined;
        if (n) setAdminName(n);
      }
    });
  }, []);

  const refreshUpcoming = useCallback(() => {
    if (!supabase) return;
    void supabase
      .from('meetings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'scheduled')
      .then(({ count }) => setUpcomingCount(count ?? 0));
  }, []);

  useEffect(() => {
    refreshUpcoming();
  }, [refreshUpcoming]);

  const toast = useCallback((msg: string) => {
    const id = ++toastId.current;
    setToasts((ts) => [...ts, { id, msg }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3200);
  }, []);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setConfirmState({ opts, resolve })),
    []
  );

  const setSubtitle = useCallback((s: string | null) => setSubtitleState(s), []);

  const shell: AdminShell = useMemo(
    () => ({ toast, confirm, search, setSubtitle, refreshUpcoming }),
    [toast, confirm, search, setSubtitle, refreshUpcoming]
  );

  const signOut = async () => {
    if (supabase) await supabase.auth.signOut();
    navigate('/admin/login', { replace: true });
  };

  const meta = VIEW_META[view];
  const showLabels = !collapsed;

  const navItem = (
    key: ViewKey,
    label: string,
    icon: (stroke: string) => React.ReactNode,
    badge?: number
  ) => {
    const active = view === key;
    const color = active ? '#160C00' : '#54504D';
    const iconStroke = active ? '#FB8500' : '#54504D';
    return (
      <button
        key={key}
        type="button"
        onClick={() => navigate(key === 'dashboard' ? '/admin' : `/admin/${key}`)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '11px 12px',
          border: 'none',
          borderRadius: 10,
          fontFamily: FONT,
          fontSize: 15,
          fontWeight: active ? 600 : 500,
          color,
          background: active ? '#FFF3E4' : 'transparent',
          cursor: 'pointer',
          justifyContent: collapsed ? 'center' : 'flex-start',
          whiteSpace: 'nowrap',
          textAlign: 'left',
          transition: 'background .15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = active ? '#FFEAD0' : '#F5F5F4';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = active ? '#FFF3E4' : 'transparent';
        }}
      >
        {icon(iconStroke)}
        {showLabels && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {label}
            {badge != null && badge > 0 && (
              <span
                style={{
                  background: '#FB8500',
                  color: '#160C00',
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: 999,
                  padding: '1px 7px',
                }}
              >
                {badge}
              </span>
            )}
          </span>
        )}
      </button>
    );
  };

  return (
    <AdminShellContext.Provider value={shell}>
      <style>{STYLE}</style>
      <div
        className="adm-wrap"
        style={{
          display: 'flex',
          minHeight: '100vh',
          height: '100vh',
          fontFamily: FONT,
          background: '#F5F5F4',
          color: '#160C00',
          overflow: 'hidden',
        }}
      >
        {/* ============ sidebar ============ */}
        <aside
          className={`adm-aside${mobileOpen ? ' adm-open' : ''}`}
          style={{
            width: collapsed ? 76 : 236,
            flexShrink: 0,
            background: '#FFFFFF',
            borderRight: '1px solid #EAEAE8',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 14px',
            transition: 'width .2s ease',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              padding: '4px 6px 0',
              height: 40,
              marginBottom: 26,
            }}
          >
            {showLabels ? (
              <img
                src="/images/shakur-logo.svg"
                alt="SHAKUR"
                style={{ height: 18, width: 'auto', filter: 'brightness(0)' }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                aria-label="Expand sidebar"
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 9,
                  border: 'none',
                  background: '#160C00',
                  color: '#FB8500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 17,
                  fontWeight: 800,
                  margin: '0 auto',
                  cursor: 'pointer',
                  fontFamily: FONT,
                }}
              >
                S
              </button>
            )}
            {!collapsed && (
              <button
                type="button"
                className="adm-collapse-btn"
                onClick={() => setCollapsed(true)}
                aria-label="Collapse sidebar"
                style={{
                  width: 30,
                  height: 30,
                  border: '1px solid #EAEAE8',
                  background: '#fff',
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#A8A29E',
                  flexShrink: 0,
                }}
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}
          </div>

          <nav style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {navItem('dashboard', 'Dashboard', (s) => <NavIconDashboard stroke={s} />)}
            {navItem('home', 'Home page', (s) => <NavIconHome stroke={s} />)}
            {navItem('projects', 'Projects', (s) => (
              <IconProjects stroke={s} />
            ))}
            {navItem('services', 'Services', (s) => (
              <IconServices stroke={s} />
            ))}
            {navItem('availability', 'Availability', (s) => (
              <IconCalendar size={19} stroke={s} strokeWidth={1.9} />
            ))}
            {navItem('meetings', 'Meetings', (s) => <NavIconMeetings stroke={s} />, upcomingCount)}
            {navItem('settings', 'Settings', (s) => <NavIconSettings stroke={s} />)}
          </nav>

          {/* identity block (ShakurDashboard sidebar bottom) */}
          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: collapsed ? '10px 0' : '10px 12px',
              borderTop: '1px solid #EAEAE8',
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#160C00',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {(adminName[0] ?? 'A').toUpperCase()}
            </div>
            {showLabels && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{adminName}</span>
                  <span
                    style={{
                      fontSize: 12,
                      color: '#A8A29E',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    SIA SHAKUR
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  aria-label="Log out"
                  style={{
                    marginLeft: 'auto',
                    width: 32,
                    height: 32,
                    border: '1px solid #EAEAE8',
                    background: '#fff',
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#54504D',
                    flexShrink: 0,
                  }}
                >
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </aside>
        <div
          className={`adm-mobile-overlay${mobileOpen ? ' adm-show' : ''}`}
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(22,12,0,0.4)',
            zIndex: 120,
          }}
        />

        {/* ============ main ============ */}
        <main
          style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh' }}
        >
          <header
            className="adm-topbar"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              padding: '18px 30px',
              background: '#FFFFFF',
              borderBottom: '1px solid #EAEAE8',
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              className="adm-hamburger"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              style={{
                width: 40,
                height: 40,
                border: '1px solid #EAEAE8',
                background: '#fff',
                borderRadius: 9,
                cursor: 'pointer',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#160C00',
                flexShrink: 0,
              }}
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: 23,
                  fontWeight: 700,
                  letterSpacing: -0.5,
                  whiteSpace: 'nowrap',
                }}
              >
                {meta.title}
              </h1>
              <span
                style={{
                  fontSize: 13,
                  color: '#A8A29E',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {subtitle ?? meta.subtitle}
              </span>
            </div>
            <div
              className="adm-search"
              style={{ marginLeft: 'auto', position: 'relative', width: 300, maxWidth: '34vw' }}
            >
                <span
                  style={{
                    position: 'absolute',
                    left: 13,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#A8A29E',
                    display: 'flex',
                    pointerEvents: 'none',
                  }}
                >
                  <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={meta.search ?? 'Search…'}
                  style={{
                    width: '100%',
                    border: '1px solid #E7E5E4',
                    borderRadius: 10,
                    padding: '11px 13px 11px 38px',
                    fontSize: 14,
                    outline: 'none',
                    fontFamily: FONT,
                    color: '#160C00',
                    background: '#FAFAF9',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#FB8500';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,133,0,0.15)';
                    e.currentTarget.style.background = '#fff';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#E7E5E4';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.background = '#FAFAF9';
                  }}
                />
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginLeft: 4,
                flexShrink: 0,
              }}
            >
              <div
                className="adm-avatar-name"
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}
              >
                <span style={{ fontSize: 13, fontWeight: 600 }}>{adminName}</span>
                <span style={{ fontSize: 12, color: '#A8A29E' }}>{adminEmail}</span>
              </div>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: '#160C00',
                  color: '#FB8500',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 15,
                  fontWeight: 700,
                }}
              >
                {(adminName[0] ?? 'A').toUpperCase()}
              </div>
              <button
                type="button"
                onClick={() => void signOut()}
                aria-label="Sign out"
                style={{
                  width: 38,
                  height: 38,
                  border: '1px solid #EAEAE8',
                  background: '#fff',
                  borderRadius: 9,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#54504D',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#D64545';
                  e.currentTarget.style.color = '#D64545';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#EAEAE8';
                  e.currentTarget.style.color = '#54504D';
                }}
              >
                <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </header>

          <div
            className="adm-content adm-scroll"
            style={{ flex: 1, overflowY: 'auto', padding: '28px 30px 40px' }}
          >
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <Routes>
                <Route index element={<DashboardView />} />
                <Route path="home" element={<HomeView />} />
                <Route path="projects" element={<ProjectsView />} />
                <Route path="services" element={<ServicesView />} />
                <Route path="availability" element={<AvailabilityView />} />
                <Route path="meetings" element={<MeetingsView />} />
                <Route path="settings" element={<SettingsView />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </motion.div>
          </div>
        </main>

        {/* ============ confirm modal ============ */}
        <AnimatePresence>
          {confirmState && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 220,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 24,
              }}
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => {
                  confirmState.resolve(false);
                  setConfirmState(null);
                }}
                style={{ position: 'absolute', inset: 0, background: 'rgba(22,12,0,0.45)' }}
              />
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  position: 'relative',
                  width: 400,
                  maxWidth: '100%',
                  background: '#FFFFFF',
                  borderRadius: 18,
                  padding: 28,
                  boxShadow: '0 30px 70px rgba(0,0,0,0.28)',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 14,
                    background: '#FBE7E7',
                    color: '#D64545',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <IconWarning size={26} />
                </div>
                <h2 style={{ margin: '0 0 8px', fontSize: 19, fontWeight: 700 }}>
                  {confirmState.opts.title}
                </h2>
                <p style={{ margin: '0 0 24px', fontSize: 14, lineHeight: 1.6, color: '#54504D' }}>
                  {confirmState.opts.message}
                </p>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => {
                      confirmState.resolve(false);
                      setConfirmState(null);
                    }}
                    style={{
                      flex: 1,
                      cursor: 'pointer',
                      background: '#fff',
                      color: '#160C00',
                      border: '1.5px solid #E7E5E4',
                      fontFamily: FONT,
                      fontWeight: 600,
                      fontSize: 15,
                      padding: 12,
                      borderRadius: 10,
                    }}
                  >
                    Keep
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      confirmState.resolve(true);
                      setConfirmState(null);
                    }}
                    style={{
                      flex: 1,
                      cursor: 'pointer',
                      background: '#D64545',
                      color: '#fff',
                      border: 'none',
                      fontFamily: FONT,
                      fontWeight: 600,
                      fontSize: 15,
                      padding: 12,
                      borderRadius: 10,
                    }}
                  >
                    {confirmState.opts.label}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ============ toasts ============ */}
        <div
          style={{
            position: 'fixed',
            right: 22,
            bottom: 22,
            zIndex: 300,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            pointerEvents: 'none',
          }}
        >
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  background: '#160C00',
                  color: '#fff',
                  padding: '13px 16px',
                  borderRadius: 11,
                  boxShadow: '0 12px 34px rgba(0,0,0,0.28)',
                  minWidth: 260,
                  maxWidth: 360,
                  pointerEvents: 'auto',
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#1F8A5B',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                <span style={{ fontSize: 14, fontWeight: 500, flex: 1 }}>{t.msg}</span>
                <button
                  type="button"
                  onClick={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))}
                  aria-label="Dismiss"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'rgba(255,255,255,0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  <IconClose size={15} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </AdminShellContext.Provider>
  );
}
