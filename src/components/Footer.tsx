import { Link } from 'react-router-dom';
import { useLang } from '../lang';
import { useServices } from '../lib/useServices';
import { pick } from '../lib/db';
import { REGISTRY_LINKS } from '../data';

/** Shield-check mark on the registry chips (Shakur.dc.html footer). */
const ShieldCheck = () => (
  <svg
    width={14}
    height={14}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0"
    style={{ opacity: 0.72 }}
    aria-hidden="true"
  >
    <path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5z" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const chipClass =
  'inline-flex items-center border border-[#E3E1DE] bg-white text-ink ' +
  'hover:border-orange hover:text-orange hover:-translate-y-[1px]';

const chipStyle: React.CSSProperties = {
  gap: 7,
  padding: '8px 13px',
  borderRadius: 9,
  transition: 'border-color .16s ease, color .16s ease, transform .16s ease',
};

export default function Footer() {
  const { t, lang } = useLang();
  const { services, loading } = useServices();

  const linkCls = 'text-ink hover:text-orange transition-colors duration-200';

  // Live services column: published rows in hook order, capped at 5 with a
  // "view all" link when there are more. While loading render no items (no
  // flash); zero services after load hides the whole column.
  const published = services.filter((s) => s.published);
  const columnServices = published.slice(0, 5);
  const showServicesColumn = loading || columnServices.length > 0;

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
            <div className="flex flex-col" style={{ gap: 10 }}>
              <span
                className="font-semibold uppercase"
                style={{ fontSize: 11, letterSpacing: '0.1em', color: '#A8A29E' }}
              >
                {t.foot_registered}
              </span>
              <div className="flex flex-wrap" style={{ gap: 10 }}>
                <a
                  href={REGISTRY_LINKS.lursoft}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View SIA SHAKUR on Lursoft"
                  title="View SIA SHAKUR on Lursoft"
                  className={chipClass}
                  style={chipStyle}
                >
                  <ShieldCheck />
                  <span className="font-bold" style={{ fontSize: 14, letterSpacing: '-0.2px' }}>
                    Lursoft
                  </span>
                </a>
                <a
                  href={REGISTRY_LINKS.firmas}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View SIA SHAKUR on Firmas.lv"
                  title="View SIA SHAKUR on Firmas.lv"
                  className={chipClass}
                  style={chipStyle}
                >
                  <ShieldCheck />
                  <span className="font-bold" style={{ fontSize: 14, letterSpacing: '-0.2px' }}>
                    firmas
                    <span style={{ color: '#FB8500' }}>.lv</span>
                  </span>
                </a>
              </div>
            </div>
          </div>

          <nav className="flex flex-col" style={{ gap: 16 }} aria-label={t.a11y_footer_nav}>
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

          {showServicesColumn && (
            <nav className="flex flex-col" style={{ gap: 16 }} aria-label={t.a11y_footer_services}>
              <span className="text-ink font-medium" style={{ fontSize: 14, opacity: 0.7 }}>
                {t.foot_services}
              </span>
              {!loading &&
                columnServices.map((svc) => (
                  <Link
                    key={svc.slug}
                    to={`/services/${svc.slug}`}
                    className={linkCls}
                    style={{ fontSize: 16 }}
                  >
                    {pick(svc.i18n.title, lang)}
                  </Link>
                ))}
              {!loading && published.length > 5 && (
                <Link to="/services" className={linkCls} style={{ fontSize: 16 }}>
                  {t.foot_services}
                </Link>
              )}
            </nav>
          )}
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
