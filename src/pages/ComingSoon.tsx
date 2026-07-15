import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../lang';
import { LANGS, type Lang } from '../i18n';
import { ArrowRight, Close, Phone } from '../components/icons';

/**
 * ShakurComingSoon.dc.html — dark holding page (no Header/Footer).
 *
 * Discreet admin entry: the low-contrast corner dot bottom-left AND a 600ms
 * long-press on the logo (mouse + touch) both reveal a small "Team access"
 * card linking to /admin/login.
 */
export default function ComingSoon() {
  const { t, lang, setLang } = useLang();
  const [revealed, setRevealed] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  }, []);

  const logoDown = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => setRevealed(true), 600);
  };
  const logoUp = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  return (
    <div
      className="relative flex w-full flex-col overflow-hidden bg-ink text-white"
      style={{ minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}
    >
      {/* blueprint dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '34px 34px',
          opacity: 0.6,
        }}
      />
      {/* warm glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '-18%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 780,
          height: 780,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(251,133,0,0.16), rgba(251,133,0,0) 62%)',
        }}
      />
      {/* rings */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 'min(88vw, 780px)',
          height: 'min(88vw, 780px)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '50%',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          width: 'min(64vw, 560px)',
          height: 'min(64vw, 560px)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '50%',
        }}
      />
      {/* corner brackets */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: 40,
          left: 40,
          width: 46,
          height: 46,
          borderTop: '2px solid rgba(251,133,0,0.5)',
          borderLeft: '2px solid rgba(251,133,0,0.5)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: 40,
          right: 40,
          width: 46,
          height: 46,
          borderBottom: '2px solid rgba(251,133,0,0.5)',
          borderRight: '2px solid rgba(251,133,0,0.5)',
        }}
      />
      {/* drifting accents */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '22%',
          right: '14%',
          width: 20,
          height: 20,
          background: '#FCCC2C',
          transform: 'rotate(45deg)',
          opacity: 0.8,
          animation: 'cs-drift 6s ease-in-out infinite',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: '26%',
          left: '12%',
          width: 12,
          height: 12,
          border: '2px solid #FB8500',
          transform: 'rotate(45deg)',
          opacity: 0.7,
          animation: 'cs-drift 7.5s ease-in-out infinite',
        }}
      />

      {/* language switch */}
      <div className="relative flex justify-end" style={{ zIndex: 5, padding: '30px 34px 0' }}>
        <div
          className="inline-flex"
          style={{
            gap: 4,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: 5,
            borderRadius: 11,
          }}
        >
          {LANGS.map((l: Lang) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className="cursor-pointer border-0 font-semibold"
              style={{
                fontSize: 13,
                padding: '6px 13px',
                borderRadius: 7,
                background: lang === l ? '#FB8500' : 'transparent',
                color: lang === l ? '#160C00' : 'rgba(255,255,255,0.7)',
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* center content */}
      <div
        className="relative flex flex-col items-center justify-center text-center"
        style={{ zIndex: 5, flex: 1, padding: '40px 24px 80px', gap: 26 }}
      >
        <img
          onMouseDown={logoDown}
          onMouseUp={logoUp}
          onMouseLeave={logoUp}
          onTouchStart={logoDown}
          onTouchEnd={logoUp}
          src="/images/shakur-logo.svg"
          alt="SHAKUR"
          className="select-none"
          style={{
            height: 30,
            width: 'auto',
            filter: 'brightness(0) invert(1)',
            animation: 'cs-fade .7s ease both',
            cursor: 'default',
          }}
        />
        <div
          className="inline-flex items-center font-semibold uppercase"
          style={{
            gap: 9,
            background: 'rgba(251,133,0,0.12)',
            border: '1px solid rgba(251,133,0,0.28)',
            color: '#FDB454',
            fontSize: 12.5,
            letterSpacing: '0.14em',
            padding: '8px 16px',
            borderRadius: 999,
            animation: 'cs-fade .7s .05s ease both',
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#FB8500',
              boxShadow: '0 0 0 4px rgba(251,133,0,0.2)',
            }}
          />
          {t.cs_kicker}
        </div>
        <h1
          className="m-0 font-serif font-bold"
          style={{
            fontSize: 'clamp(46px, 10vw, 116px)',
            lineHeight: 0.98,
            letterSpacing: '-1.5px',
            maxWidth: '14ch',
            animation: 'cs-fade .8s .1s ease both',
          }}
        >
          {t.cs_headline}
        </h1>
        <p
          className="m-0"
          style={{
            fontSize: 'clamp(15px, 2.4vw, 18px)',
            lineHeight: 1.7,
            color: 'rgba(255,255,255,0.66)',
            maxWidth: 520,
            animation: 'cs-fade .8s .18s ease both',
          }}
        >
          {t.cs_sub}
        </p>
        <div
          className="flex flex-col items-center"
          style={{ gap: 12, marginTop: 8, animation: 'cs-fade .8s .26s ease both' }}
        >
          <span
            className="font-semibold uppercase"
            style={{ fontSize: 12, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)' }}
          >
            {t.cs_reach}
          </span>
          <div className="flex flex-wrap justify-center" style={{ gap: 12 }}>
            <a
              href="tel:+37126872727"
              className="inline-flex items-center bg-orange text-ink font-semibold transition-colors duration-200 hover:bg-orange-hover hover:text-ink"
              style={{ gap: 9, fontSize: 15, padding: '13px 22px', borderRadius: 11 }}
            >
              <Phone size={17} stroke="#160C00" />
              +371 2687 2727
            </a>
            <a
              href="mailto:info.andrey.shakur@gmail.com"
              className="inline-flex items-center text-white font-semibold transition-colors duration-200 hover:text-white hover:bg-[rgba(255,255,255,0.12)]"
              style={{
                gap: 9,
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.14)',
                fontSize: 15,
                padding: '13px 22px',
                borderRadius: 11,
              }}
            >
              <svg
                width={17}
                height={17}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FB8500"
                strokeWidth={2.1}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m2 7 10 6 10-6" />
              </svg>
              {t.cs_email_label}
            </a>
          </div>
        </div>
      </div>

      {/* footer line */}
      <div
        className="relative text-center"
        style={{ zIndex: 5, padding: '0 24px 34px', fontSize: 12.5, color: 'rgba(255,255,255,0.32)' }}
      >
        {t.cs_foot}
      </div>

      {/* discreet admin trigger (corner dot) */}
      <button
        onClick={() => setRevealed((r) => !r)}
        aria-label="."
        className="fixed border-0 p-0 hover:bg-[rgba(251,133,0,0.55)]"
        style={{
          bottom: 18,
          left: 18,
          zIndex: 40,
          width: 14,
          height: 14,
          borderRadius: '50%',
          cursor: 'default',
          background: 'rgba(255,255,255,0.1)',
          transition: 'background .2s ease',
        }}
      />

      {/* reveal panel */}
      {revealed && (
        <div
          className="fixed bg-white text-ink"
          style={{
            bottom: 44,
            left: 18,
            zIndex: 41,
            borderRadius: 14,
            padding: 16,
            width: 250,
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            animation: 'cs-pop .22s cubic-bezier(0.22,1,0.36,1)',
          }}
        >
          <div className="flex items-center justify-between" style={{ gap: 10, marginBottom: 10 }}>
            <span className="inline-flex items-center font-bold" style={{ gap: 7, fontSize: 13 }}>
              <svg
                width={15}
                height={15}
                viewBox="0 0 24 24"
                fill="none"
                stroke="#FB8500"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              {t.cs_admin_title}
            </span>
            <button
              onClick={() => setRevealed(false)}
              aria-label="Close"
              className="flex cursor-pointer items-center justify-center border-0 text-muted"
              style={{ width: 24, height: 24, background: '#F5F5F4', borderRadius: 7 }}
            >
              <Close size={13} stroke="currentColor" strokeWidth={2.4} />
            </button>
          </div>
          <p className="m-0" style={{ marginBottom: 12, fontSize: 12.5, lineHeight: 1.5, color: '#8A8580' }}>
            {t.cs_admin_sub}
          </p>
          <Link
            to="/admin/login"
            className="flex items-center justify-center bg-ink text-white font-semibold transition-colors hover:bg-[#2A1E10] hover:text-white"
            style={{ gap: 8, fontSize: 14, padding: 11, borderRadius: 10 }}
          >
            {t.cs_admin_btn}
            <ArrowRight size={15} stroke="currentColor" strokeWidth={2.2} />
          </Link>
        </div>
      )}
    </div>
  );
}
