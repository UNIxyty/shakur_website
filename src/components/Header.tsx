import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang } from '../lang';
import { LANGS, type Lang } from '../i18n';
import { CONTACT } from '../data';
import { ArrowRight, Burger, Close } from './icons';
import { tapPress } from '../motion';

const NAV = [
  { to: '/', key: 'nav_home' },
  { to: '/projects', key: 'nav_projects' },
  { to: '/services', key: 'nav_services' },
  { to: '/contact', key: 'nav_contact' },
] as const;

export default function Header({ showAnnouncement = true }: { showAnnouncement?: boolean }) {
  const { lang, t, setLang } = useLang();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const tel = `tel:${CONTACT.phone.replace(/[^+0-9]/g, '')}`;

  const langBtn = (l: Lang, active: boolean) => ({
    background: active ? '#FB8500' : 'transparent',
    color: active ? '#160C00' : '#FFFFFF',
    border: '1px solid rgba(255,255,255,0.25)',
    key: l,
  });

  return (
    <>
      {showAnnouncement && (
        <div
          className="bg-yellow text-ink text-center font-medium"
          style={{ padding: '10px 16px', fontSize: 14 }}
        >
          {t.ann}{' '}
          <a href={tel} className="text-ink font-bold no-underline hover:text-ink">
            {CONTACT.phone}
          </a>
        </div>
      )}

      <header
        className="sticky top-0 bg-ink"
        style={{ zIndex: 60, borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          className="mx-auto flex items-center justify-between"
          style={{ maxWidth: 1320, padding: '22px 30px', gap: 24 }}
        >
          <Link to="/" className="flex items-center" aria-label={t.a11y_home_link}>
            <img
              src="/images/shakur-logo.svg"
              alt="SHAKUR"
              style={{ height: 21, filter: 'brightness(0) invert(1)' }}
            />
          </Link>

          <nav className="hidden nav:flex items-center" style={{ gap: 38 }} aria-label={t.a11y_nav_main}>
            {NAV.map((item) => {
              // Detail pages keep their section highlighted (design: ProjectDetail
              // shows "Projects" active, ServiceDetail shows "Services" active).
              const active =
                pathname === item.to || (item.to !== '/' && pathname.startsWith(`${item.to}/`));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className="relative text-white font-normal transition-colors duration-200 hover:text-white"
                  style={{ fontSize: 15, padding: '4px 0' }}
                >
                  {t[item.key]}
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute bg-orange"
                      style={{ left: 0, right: 0, bottom: -7, height: 2, borderRadius: 2 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="hidden nav:flex items-center" style={{ gap: 14 }}>
            <div className="flex" style={{ gap: 3 }}>
              {LANGS.map((l) => {
                const s = langBtn(l, l === lang);
                return (
                  <motion.button
                    key={l}
                    onClick={() => setLang(l)}
                    whileTap={tapPress}
                    aria-pressed={l === lang}
                    className="cursor-pointer font-semibold transition-colors duration-200"
                    style={{
                      padding: '5px 9px',
                      fontSize: 12,
                      border: s.border,
                      borderRadius: 5,
                      background: s.background,
                      color: s.color,
                    }}
                  >
                    {l.toUpperCase()}
                  </motion.button>
                );
              })}
            </div>

            <motion.div whileHover={{ scale: 1.03 }} whileTap={tapPress}>
              <Link
                to="/contact"
                className="inline-flex items-center bg-orange text-ink font-semibold transition-colors duration-200 hover:bg-orange-hover hover:text-ink"
                style={{ gap: 9, fontSize: 15, padding: '12px 20px', borderRadius: 11 }}
              >
                {t.nav_cta}
                <ArrowRight size={16} />
              </Link>
            </motion.div>
          </div>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={t.a11y_menu}
            aria-expanded={menuOpen}
            className="flex nav:hidden items-center justify-center cursor-pointer bg-transparent shrink-0 text-white"
            style={{
              width: 44,
              height: 44,
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 9,
            }}
          >
            {menuOpen ? <Close size={22} /> : <Burger size={22} />}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="nav:hidden overflow-hidden"
              style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div className="flex flex-col" style={{ padding: '10px 30px 22px', gap: 2 }}>
                {NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMenuOpen(false)}
                    className="text-white font-medium hover:text-white"
                    style={{ fontSize: 16, padding: '13px 4px' }}
                  >
                    {t[item.key]}
                  </Link>
                ))}

                <div className="flex" style={{ gap: 8, margin: '12px 0 4px' }}>
                  {LANGS.map((l) => {
                    const s = langBtn(l, l === lang);
                    return (
                      <button
                        key={l}
                        onClick={() => setLang(l)}
                        aria-pressed={l === lang}
                        className="drawer-lang cursor-pointer font-semibold"
                        style={{
                          padding: '8px 14px',
                          fontSize: 13,
                          border: s.border,
                          borderRadius: 7,
                          background: s.background,
                          color: s.color,
                        }}
                      >
                        {l.toUpperCase()}
                      </button>
                    );
                  })}
                </div>

                <Link
                  to="/contact"
                  onClick={() => setMenuOpen(false)}
                  className="text-center bg-orange text-ink font-semibold hover:text-ink"
                  style={{ marginTop: 8, fontSize: 15, padding: 14, borderRadius: 11 }}
                >
                  {t.nav_cta}
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
