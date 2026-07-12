import { Link } from 'react-router-dom';
import { useLang } from '../lang';
import { FramerMark } from './icons';

export default function Footer() {
  const { t } = useLang();

  const linkCls = 'text-ink hover:text-orange transition-colors duration-200';

  return (
    <footer
      className="bg-white"
      style={{ borderTop: '1px solid #EEEDEA', padding: '84px 30px 40px' }}
    >
      <div className="mx-auto" style={{ maxWidth: 1320 }}>
        <div className="flex flex-wrap justify-between" style={{ gap: 56 }}>
          <div className="flex flex-col" style={{ maxWidth: 300, gap: 26 }}>
            <img
              src="/images/shakur-logo.svg"
              alt="SHAKUR"
              className="self-start"
              style={{ height: 24, width: 'auto', filter: 'brightness(0)' }}
            />
            <p className="m-0 text-muted" style={{ fontSize: 16, lineHeight: 1.7 }}>
              {t.foot_tagline}
            </p>
            <div className="flex" style={{ gap: 16 }}>
              <a
                href="#"
                aria-label="G2"
                className="flex items-center justify-center bg-ink text-white font-bold hover:text-white"
                style={{ width: 30, height: 30, borderRadius: 7, fontSize: 13 }}
              >
                G2
              </a>
              <a
                href="#"
                aria-label="Framer"
                className="flex items-center justify-center"
                style={{ width: 30, height: 30 }}
              >
                <FramerMark />
              </a>
            </div>
          </div>

          <nav className="flex flex-col" style={{ gap: 16 }} aria-label="Footer navigation">
            <span className="text-ink font-medium" style={{ fontSize: 14, opacity: 0.7 }}>
              {t.foot_nav}
            </span>
            <Link to="/" className={linkCls} style={{ fontSize: 16 }}>
              {t.foot_home}
            </Link>
            <Link to="/services" className={linkCls} style={{ fontSize: 16 }}>
              {t.foot_services}
            </Link>
            <Link to="/" className={linkCls} style={{ fontSize: 16 }}>
              {t.foot_company}
            </Link>
            <Link to="/" className={linkCls} style={{ fontSize: 16 }}>
              {t.foot_review}
            </Link>
          </nav>

          <nav className="flex flex-col" style={{ gap: 16 }} aria-label="Footer services">
            <span className="text-ink font-medium" style={{ fontSize: 14, opacity: 0.7 }}>
              {t.foot_services}
            </span>
            <Link to="/service/drywall" className={linkCls} style={{ fontSize: 16 }}>
              {t.sv_drywall}
            </Link>
            <Link to="/service/interior" className={linkCls} style={{ fontSize: 16 }}>
              {t.sv_interior}
            </Link>
            <Link to="/service/emergency" className={linkCls} style={{ fontSize: 16 }}>
              {t.sv_emergency}
            </Link>
            <Link to="/services" className={linkCls} style={{ fontSize: 16 }}>
              {t.sv_mgmt}
            </Link>
          </nav>

          <div className="flex items-start" style={{ gap: 30 }}>
            <div
              className="flex flex-col items-center justify-center bg-ink text-white box-border"
              style={{ width: 88, height: 99, borderRadius: 8, gap: 3, padding: 8 }}
            >
              <div
                className="flex items-center justify-center text-white font-extrabold"
                style={{ width: 22, height: 22, borderRadius: 5, background: '#FB5C35', fontSize: 12 }}
              >
                G2
              </div>
              <span className="font-semibold text-center" style={{ fontSize: 11, lineHeight: 1.15 }}>
                Users
                <br />
                Love Us
              </span>
              <span style={{ fontSize: 12, letterSpacing: '1px', color: '#FCCC2C' }}>★★★★★</span>
              <span className="font-bold" style={{ fontSize: 11 }}>
                2024
              </span>
            </div>

            <div
              className="flex flex-col items-center justify-center box-border"
              style={{
                width: 88,
                height: 118,
                border: '1.5px solid #160C00',
                borderRadius: 4,
                gap: 4,
                padding: 8,
              }}
            >
              <span className="font-semibold" style={{ fontSize: 10, letterSpacing: '0.5px' }}>
                Certified
              </span>
              <div
                className="flex items-center justify-center font-bold"
                style={{
                  width: 44,
                  height: 44,
                  border: '2px solid #160C00',
                  borderRadius: '50%',
                  fontFamily: 'Georgia, serif',
                  fontSize: 26,
                }}
              >
                B
              </div>
              <span
                className="font-semibold text-center"
                style={{ fontSize: 9, letterSpacing: '0.5px' }}
              >
                Corporation
              </span>
            </div>
          </div>
        </div>

        <div
          className="flex flex-wrap items-center justify-between"
          style={{
            marginTop: 64,
            paddingTop: 20,
            borderTop: '1px solid rgba(84,80,77,0.35)',
            gap: 16,
          }}
        >
          <span className="text-muted" style={{ fontSize: 15 }}>
            {t.copyright}
          </span>
          <div className="flex" style={{ gap: 28 }}>
            <Link to="/contact" className={linkCls} style={{ fontSize: 15 }}>
              {t.nav_contact}
            </Link>
            <Link to="/" className={linkCls} style={{ fontSize: 15 }}>
              {t.privacy}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
