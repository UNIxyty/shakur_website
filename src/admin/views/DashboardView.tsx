import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminShell } from '../components/context';
import { FONT, IconPlus, IconServices } from '../components/ui';

/**
 * Dashboard overview from ShakurDashboard.dc.html — stat cards, the visitor
 * chart (inline SVG matching the Chart.js orange gradient line; the data is
 * the design's demo generator, no analytics backend exists), top pages,
 * recent activity, and quick actions into the other panel views.
 */

type Range = 7 | 30 | 90;

/** Ported verbatim from the design's dataFor(). */
function dataFor(range: Range): { labels: string[]; values: number[] } {
  const step = range === 90 ? 3 : 1;
  const labels: string[] = [];
  const values: number[] = [];
  const today = new Date();
  const base = range === 7 ? 72 : range === 30 ? 60 : 54;
  const wob = range === 7 ? 1.4 : range === 30 ? 4 : 9;
  for (let i = range - 1; i >= 0; i -= step) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
    const v = Math.round(base + 26 * Math.sin(i / wob) + (i % 7 === 0 ? 22 : 0) + (range - i) * 0.28);
    values.push(Math.max(18, v));
  }
  return { labels, values };
}

/** Catmull-Rom smoothing ≈ Chart.js tension 0.35. */
function smoothPath(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

const STATS = [
  {
    label: 'Visitors Today',
    value: '84',
    delta: '↑ 12%',
    up: true,
    icon: (
      <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    label: 'Visitors This Week',
    value: '542',
    delta: '↑ 8%',
    up: true,
    icon: (
      <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <line x1="8" y1="15" x2="16" y2="15" />
      </svg>
    ),
  },
  {
    label: 'Visitors This Month',
    value: '2,341',
    delta: '↑ 5%',
    up: true,
    icon: (
      <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    label: 'Total Page Views',
    value: '8,920',
    delta: '↓ 3%',
    up: false,
    icon: (
      <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

const TOP_PAGES = [
  { page: '/ (Home)', views: '3,240', time: '2m 14s', bounce: '38%' },
  { page: '/projects', views: '1,820', time: '1m 52s', bounce: '44%' },
  { page: '/services', views: '1,105', time: '1m 38s', bounce: '51%' },
  { page: '/contact', views: '890', time: '0m 58s', bounce: '62%' },
  { page: '/projects/rimi-latvia', views: '445', time: '3m 10s', bounce: '29%' },
];

const ACTIVITY = [
  { color: '#1F8A5B', text: 'New contact form submission', time: '2 hours ago' },
  { color: '#2A6FDB', text: 'Project "Kepler Club" updated', time: '5 hours ago' },
  { color: '#FB8500', text: 'Service "Masonry Works" published', time: 'yesterday' },
  { color: '#2A6FDB', text: 'Project "MOHO Park" created', time: '2 days ago' },
  { color: '#D64545', text: 'Admin password changed', time: '3 days ago' },
];

const card: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #EAEAE8',
  borderRadius: 14,
};

function VisitorChart({ range }: { range: Range }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  const [hover, setHover] = useState<number | null>(null);
  const height = 250;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { labels, values } = useMemo(() => dataFor(range), [range]);

  const padTop = 8;
  const padBottom = 4;
  const yMax = Math.max(20, Math.ceil(Math.max(...values) / 20) * 20);
  const plotH = height - padTop - padBottom;
  const xFor = (i: number) => (values.length === 1 ? 0 : (i / (values.length - 1)) * width);
  const yFor = (v: number) => padTop + plotH - (v / yMax) * plotH;
  const pts: [number, number][] = values.map((v, i) => [xFor(i), yFor(v)]);
  const line = smoothPath(pts);
  const area = `${line} L ${width} ${height - padBottom} L 0 ${height - padBottom} Z`;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(yMax * f));
  const labelStep = Math.max(1, Math.ceil(labels.length / 10));

  return (
    <div style={{ display: 'flex', gap: 10 }}>
      {/* y axis */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column-reverse',
          justifyContent: 'space-between',
          height,
          fontSize: 11,
          color: '#A8A29E',
          fontFamily: FONT,
          textAlign: 'right',
          paddingBottom: padBottom,
          paddingTop: padTop - 6,
          width: 28,
          flexShrink: 0,
        }}
      >
        {yTicks.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div ref={wrapRef} style={{ position: 'relative', height }}>
          <svg
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = ((e.clientX - rect.left) / rect.width) * width;
              const i = Math.round((x / width) * (values.length - 1));
              setHover(Math.max(0, Math.min(values.length - 1, i)));
            }}
            onMouseLeave={() => setHover(null)}
            style={{ display: 'block' }}
          >
            <defs>
              <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(251,133,0,0.30)" />
                <stop offset="100%" stopColor="rgba(251,133,0,0.02)" />
              </linearGradient>
            </defs>
            {yTicks.map((t) => (
              <line
                key={t}
                x1={0}
                x2={width}
                y1={yFor(t)}
                y2={yFor(t)}
                stroke="#F2F1EF"
                strokeWidth={1}
              />
            ))}
            <path d={area} fill="url(#dashGrad)" />
            <path d={line} fill="none" stroke="#FB8500" strokeWidth={2.5} strokeLinecap="round" />
            {hover != null && (
              <>
                <line
                  x1={pts[hover][0]}
                  x2={pts[hover][0]}
                  y1={padTop}
                  y2={height - padBottom}
                  stroke="#E7E5E4"
                  strokeWidth={1}
                />
                <circle cx={pts[hover][0]} cy={pts[hover][1]} r={5} fill="#FB8500" />
              </>
            )}
          </svg>
          {hover != null && (
            <div
              style={{
                position: 'absolute',
                left: `${(pts[hover][0] / width) * 100}%`,
                top: Math.max(0, pts[hover][1] - 46),
                transform: 'translateX(-50%)',
                background: '#160C00',
                color: '#fff',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 12,
                fontFamily: FONT,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              <span style={{ color: '#A8A29E' }}>{labels[hover]}</span> · {values[hover]} visitors
            </div>
          )}
        </div>
        {/* x labels */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: '#A8A29E',
            fontFamily: FONT,
            marginTop: 6,
          }}
        >
          {labels
            .filter((_, i) => i % labelStep === 0)
            .map((l) => (
              <span key={l}>{l}</span>
            ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardView() {
  const { setSubtitle } = useAdminShell();
  const [range, setRange] = useState<Range>(7);

  useEffect(() => {
    setSubtitle('Site traffic and recent activity');
    return () => setSubtitle(null);
  }, [setSubtitle]);

  const rangeBtn = (label: string, r: Range) => {
    const active = range === r;
    return (
      <button
        key={r}
        type="button"
        onClick={() => setRange(r)}
        style={{
          border: 'none',
          cursor: 'pointer',
          fontFamily: FONT,
          fontWeight: 600,
          fontSize: 13,
          padding: '8px 14px',
          borderRadius: 8,
          background: active ? '#FB8500' : 'transparent',
          color: active ? '#160C00' : '#54504D',
        }}
      >
        {label}
      </button>
    );
  };

  const quickAction = (icon: React.ReactNode, label: string, to: string, external = false) => {
    const inner = (
      <>
        <span
          style={{
            width: 42,
            height: 42,
            flexShrink: 0,
            borderRadius: 11,
            background: '#FFF3E4',
            color: '#FB8500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </span>
        <span style={{ flex: 1, fontSize: 15, fontWeight: 600 }}>{label}</span>
        <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#A8A29E" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </>
    );
    const style: React.CSSProperties = {
      ...card,
      padding: 20,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      color: '#160C00',
      textDecoration: 'none',
      transition: 'border-color .15s ease',
    };
    return external ? (
      <a key={label} href={to} target="_blank" rel="noopener" style={style} className="adm-quick">
        {inner}
      </a>
    ) : (
      <Link key={label} to={to} style={style} className="adm-quick">
        {inner}
      </Link>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {/* stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 18,
        }}
      >
        {STATS.map((s) => (
          <div
            key={s.label}
            style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: '#A8A29E', display: 'flex' }}>{s.icon}</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  fontSize: 12,
                  fontWeight: 600,
                  color: s.up ? '#1F8A5B' : '#D64545',
                  background: s.up ? '#E6F4EC' : '#FBE7E7',
                  padding: '3px 8px',
                  borderRadius: 999,
                }}
              >
                {s.delta}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 13, color: '#A8A29E' }}>{s.label}</span>
              <span style={{ fontSize: 26, fontWeight: 500, letterSpacing: -0.5 }}>{s.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* chart */}
      <div style={{ ...card, padding: '22px 24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 14,
            flexWrap: 'wrap',
            marginBottom: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Visitor Overview</h2>
            <span style={{ fontSize: 12, color: '#A8A29E' }}>Demo data</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#A8A29E' }}>Last {range} days</span>
            <div style={{ display: 'flex', gap: 4, background: '#F2F1EF', padding: 4, borderRadius: 11 }}>
              {rangeBtn('Last 7 days', 7)}
              {rangeBtn('Last 30 days', 30)}
              {rangeBtn('Last 90 days', 90)}
            </div>
          </div>
        </div>
        <VisitorChart range={range} />
      </div>

      {/* top pages + activity */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(320px, 100%), 1fr))',
          gap: 22,
        }}
      >
        <div style={{ ...card, overflow: 'hidden' }}>
          <h2
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 600,
              padding: '18px 24px',
              borderBottom: '1px solid #F2F1EF',
            }}
          >
            Top Pages
          </h2>
          <div className="adm-scroll" style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 460 }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr 1fr',
                  gap: 12,
                  padding: '12px 24px',
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: 0.4,
                  textTransform: 'uppercase',
                  color: '#A8A29E',
                  borderBottom: '1px solid #F2F1EF',
                }}
              >
                <span>Page</span>
                <span>Views</span>
                <span>Avg. Time</span>
                <span>Bounce</span>
              </div>
              {TOP_PAGES.map((p) => (
                <div
                  key={p.page}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr 1fr 1fr',
                    gap: 12,
                    padding: '12px 24px',
                    borderBottom: '1px solid #F5F4F2',
                    fontSize: 14,
                  }}
                >
                  <span style={{ fontFamily: 'monospace', color: '#160C00' }}>{p.page}</span>
                  <span style={{ color: '#54504D' }}>{p.views}</span>
                  <span style={{ color: '#54504D' }}>{p.time}</span>
                  <span style={{ color: '#54504D' }}>{p.bounce}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={card}>
          <h2
            style={{
              margin: 0,
              fontSize: 17,
              fontWeight: 600,
              padding: '18px 24px',
              borderBottom: '1px solid #F2F1EF',
            }}
          >
            Recent Activity
          </h2>
          <div style={{ padding: '8px 24px 16px' }}>
            {ACTIVITY.map((a) => (
              <div
                key={a.text}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '11px 0',
                  borderBottom: '1px solid #F5F4F2',
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: a.color,
                  }}
                />
                <span style={{ fontSize: 14, flex: 1 }}>{a.text}</span>
                <span style={{ fontSize: 12, color: '#A8A29E', whiteSpace: 'nowrap' }}>
                  {a.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* quick actions */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 18,
        }}
      >
        {quickAction(
          <IconPlus size={20} stroke="currentColor" strokeWidth={2} />,
          'Add New Project',
          '/admin/projects?new=1'
        )}
        {quickAction(
          <IconServices size={20} strokeWidth={2} />,
          'Add New Service',
          '/admin/services?new=1'
        )}
        {quickAction(
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>,
          'View Live Site',
          '/',
          true
        )}
      </div>
    </div>
  );
}
