import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { pick } from '../../lib/db';
import type { L10n } from '../../lib/db';
import { useAdminShell } from '../components/context';
import { FONT, IconCalendar, IconPlus, IconProjects, IconServices, fmtDate } from '../components/ui';

/**
 * Dashboard overview — the ShakurDashboard.dc.html visual grammar (stat cards,
 * the orange area chart, activity list, quick actions) driven by real data:
 * live counts from projects / services / meetings / consultation_requests, a
 * per-day "requests" series (new meetings + consultation requests combined),
 * and a merged recent-activity feed. The design's visitor analytics (trend
 * pills, Top Pages) are placeholder data we do not have, so they are
 * intentionally absent rather than fabricated.
 */

export type Range = 7 | 30 | 90;

/* ------------------------------------------------------------------ */
/* Data layer — pure and injectable so unit tests can mock the client  */
/* ------------------------------------------------------------------ */

type DbErr = { code?: string; message?: string } | null | undefined;

export type DashResult = {
  count?: number | null;
  data?: unknown[] | null;
  error?: DbErr;
};

/** The subset of the PostgREST filter builder the dashboard uses. */
export interface DashFilter extends PromiseLike<DashResult> {
  eq(column: string, value: unknown): DashFilter;
  gte(column: string, value: string): DashFilter;
  lt(column: string, value: string): DashFilter;
  order(column: string, opts: { ascending: boolean }): DashFilter;
  limit(count: number): DashFilter;
}

export interface DashClient {
  from(table: string): {
    select(columns: string, options?: { count?: 'exact'; head?: boolean }): DashFilter;
  };
}

/** Missing-table shapes PostgREST returns on a pre-v3/v5 DB (SettingsView pattern). */
export function isMissingTable(err: DbErr): boolean {
  if (!err) return false;
  return (
    err.code === '42P01' ||
    err.code === 'PGRST205' ||
    /does not exist|schema cache/i.test(err.message ?? '')
  );
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** Local-time 'YYYY-MM-DD' key for a date (meeting_date string compare is valid). */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayISO(now: Date): string {
  return dayKey(now);
}

/** Bucket created_at timestamps into a per-local-day series ending today. */
export function buildSeries(
  dates: string[],
  range: Range,
  now: Date
): { labels: string[]; values: number[]; total: number } {
  const labels: string[] = [];
  const index = new Map<string, number>();
  for (let i = range - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    index.set(dayKey(d), labels.length);
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }
  const values = new Array<number>(labels.length).fill(0);
  let total = 0;
  for (const iso of dates) {
    const t = new Date(iso);
    if (Number.isNaN(t.getTime())) continue;
    const i = index.get(dayKey(t));
    if (i !== undefined) {
      values[i] += 1;
      total += 1;
    }
  }
  return { labels, values, total };
}

/** '2 hours ago' / 'yesterday' / '3 days ago' relative times (en admin locale). */
export function relTime(iso: string, now: Date): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const mins = Math.floor(Math.max(0, now.getTime() - t) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins === 1 ? '1 minute ago' : `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const dayDiff = Math.max(
    1,
    Math.round((startOfDay(now) - startOfDay(new Date(iso))) / 86400000)
  );
  if (dayDiff <= 1) return 'yesterday';
  if (dayDiff < 30) return `${dayDiff} days ago`;
  const months = Math.floor(dayDiff / 30);
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;
  const years = Math.floor(dayDiff / 365);
  return years <= 1 ? '1 year ago' : `${years} years ago`;
}

export type ActivityEvent = { color: string; text: string; ts: string };

/** Newest-first merge of the per-source event lists, capped at 6 rows. */
export function mergeActivity(events: ActivityEvent[]): ActivityEvent[] {
  return [...events]
    .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
    .slice(0, 6);
}

export type TrafficDaily = { day: string; device: string; views: number; visits: number };
export type TrafficPath = { day: string; path: string; views: number };
/** 'missing' = pre-migrate-v6 DB (show the run-migration hint, not an error). */
export type TrafficData = { daily: TrafficDaily[]; paths: TrafficPath[] } | 'missing' | null;

export type DashboardData = {
  /** null = the query failed (card shows an em-dash + "Couldn't load"). */
  projects: { published: number; total: number } | null;
  services: { published: number; total: number } | null;
  meetings: { upcoming: number; past: number; canceled: number } | null;
  consultations: { pending: number; total: number } | null;
  /** created_at ISO strings (last 90 local days); null = chart couldn't load. */
  chartDates: string[] | null;
  activity: ActivityEvent[] | null;
  traffic: TrafficData;
};

/** Human label for a tracked path ('/' → 'Home', '/projects/x' → 'Project · x'). */
export function pathLabel(path: string): string {
  if (path === '/') return 'Home';
  const seg = path.split('/').filter(Boolean);
  const top: Record<string, string> = {
    projects: 'Projects',
    services: 'Services',
    contact: 'Contact',
    booking: 'Manage booking',
  };
  if (seg.length === 1) return top[seg[0]] ?? path;
  if (seg[0] === 'projects') return `Project · ${seg[1]}`;
  if (seg[0] === 'services') return `Service · ${seg[1]}`;
  return path;
}

/** Aggregate the traffic view rows into the selected range (day keys are local 'YYYY-MM-DD'). */
export function buildTraffic(
  data: { daily: TrafficDaily[]; paths: TrafficPath[] },
  range: Range,
  now: Date
): {
  labels: string[];
  views: number[];
  totalViews: number;
  totalVisits: number;
  mobileShare: number | null;
  topPaths: { path: string; views: number }[];
} {
  const labels: string[] = [];
  const index = new Map<string, number>();
  for (let i = range - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    index.set(dayKey(d), labels.length);
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }
  const views = new Array<number>(labels.length).fill(0);
  let totalViews = 0;
  let totalVisits = 0;
  let mobileViews = 0;
  for (const row of data.daily) {
    const i = index.get(row.day.slice(0, 10));
    if (i === undefined) continue;
    views[i] += row.views;
    totalViews += row.views;
    totalVisits += row.visits;
    if (row.device === 'mobile') mobileViews += row.views;
  }
  const byPath = new Map<string, number>();
  for (const row of data.paths) {
    if (!index.has(row.day.slice(0, 10))) continue;
    byPath.set(row.path, (byPath.get(row.path) ?? 0) + row.views);
  }
  const topPaths = [...byPath.entries()]
    .map(([path, v]) => ({ path, views: v }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);
  return {
    labels,
    views,
    totalViews,
    totalVisits,
    mobileShare: totalViews > 0 ? mobileViews / totalViews : null,
    topPaths,
  };
}

type TitledRow = { i18n: { title?: L10n } | null; updated_at: string };

function titleEn(i18n: TitledRow['i18n']): string {
  return pick(i18n?.title ?? null, 'en') || 'Untitled';
}

/**
 * All dashboard queries in parallel. Never throws: a missing table (pre-v3/v5
 * DB) counts as zero rows silently; any other failure marks just that card as
 * unavailable (console.warn, em-dash in the UI).
 */
export async function fetchDashboard(client: DashClient, now: Date): Promise<DashboardData> {
  const today = todayISO(now);
  const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 89);
  const sinceIso = since.toISOString();

  const count = async (
    table: string,
    refine?: (q: DashFilter) => DashFilter
  ): Promise<number | null> => {
    try {
      let q = client.from(table).select('*', { count: 'exact', head: true });
      if (refine) q = refine(q);
      const res = await q;
      if (res.error) {
        if (isMissingTable(res.error)) return 0;
        console.warn(`[dashboard] count(${table}) failed`, res.error);
        return null;
      }
      return res.count ?? 0;
    } catch (err) {
      console.warn(`[dashboard] count(${table}) failed`, err);
      return null;
    }
  };

  const rows = async <T,>(
    table: string,
    columns: string,
    refine?: (q: DashFilter) => DashFilter
  ): Promise<T[] | null> => {
    try {
      let q = client.from(table).select(columns);
      if (refine) q = refine(q);
      const res = await q;
      if (res.error) {
        if (isMissingTable(res.error)) return [];
        console.warn(`[dashboard] select(${table}) failed`, res.error);
        return null;
      }
      return (res.data ?? []) as T[];
    } catch (err) {
      console.warn(`[dashboard] select(${table}) failed`, err);
      return null;
    }
  };

  /**
   * Page-view aggregates (v6). Unlike count()/rows(), a missing view here maps
   * to 'missing' — the card shows the run-migrate-v6 hint instead of zeros.
   * page_view_paths is ordered views-desc so PostgREST's row cap keeps the top.
   */
  const traffic = (async (): Promise<TrafficData> => {
    try {
      const [d, p] = await Promise.all([
        client
          .from('page_view_daily')
          .select('day,device,views,visits')
          .order('day', { ascending: false })
          .limit(1000),
        client
          .from('page_view_paths')
          .select('day,path,views')
          .order('views', { ascending: false })
          .limit(1000),
      ]);
      if (d.error || p.error) {
        if (isMissingTable(d.error) || isMissingTable(p.error)) return 'missing';
        console.warn('[dashboard] traffic queries failed', d.error ?? p.error);
        return null;
      }
      return {
        daily: (d.data ?? []) as TrafficDaily[],
        paths: (p.data ?? []) as TrafficPath[],
      };
    } catch (err) {
      console.warn('[dashboard] traffic queries failed', err);
      return null;
    }
  })();

  const [
    projTotal,
    projPublished,
    svcTotal,
    svcPublished,
    mUpcoming,
    mCompleted,
    mScheduledPast,
    mCanceled,
    cPending,
    cTotal,
    chartMeetings,
    chartConsults,
    actConsults,
    actBooked,
    actCanceled,
    actProjects,
    actServices,
  ] = await Promise.all([
    count('projects'),
    count('projects', (q) => q.eq('published', true)),
    count('services'),
    count('services', (q) => q.eq('published', true)),
    count('meetings', (q) => q.eq('status', 'scheduled').gte('meeting_date', today)),
    count('meetings', (q) => q.eq('status', 'completed')),
    count('meetings', (q) => q.eq('status', 'scheduled').lt('meeting_date', today)),
    count('meetings', (q) => q.eq('status', 'canceled')),
    count('consultation_requests', (q) => q.eq('status', 'new')),
    count('consultation_requests'),
    rows<{ created_at: string }>('meetings', 'created_at', (q) => q.gte('created_at', sinceIso)),
    rows<{ created_at: string }>('consultation_requests', 'created_at', (q) =>
      q.gte('created_at', sinceIso)
    ),
    rows<{ name: string; created_at: string }>('consultation_requests', 'name,created_at', (q) =>
      q.order('created_at', { ascending: false }).limit(6)
    ),
    rows<{ name: string; meeting_date: string; created_at: string }>(
      'meetings',
      'name,meeting_date,created_at',
      (q) => q.order('created_at', { ascending: false }).limit(6)
    ),
    rows<{ name: string; meeting_date: string; updated_at: string }>(
      'meetings',
      'name,meeting_date,updated_at',
      (q) => q.eq('status', 'canceled').order('updated_at', { ascending: false }).limit(6)
    ),
    rows<TitledRow>('projects', 'i18n,updated_at', (q) =>
      q.order('updated_at', { ascending: false }).limit(6)
    ),
    rows<TitledRow>('services', 'i18n,updated_at', (q) =>
      q.eq('published', true).order('updated_at', { ascending: false }).limit(6)
    ),
  ]);

  const chartDates =
    chartMeetings === null || chartConsults === null
      ? null
      : [...chartMeetings, ...chartConsults].map((r) => r.created_at);

  let activity: ActivityEvent[] | null;
  const sources = [actConsults, actBooked, actCanceled, actProjects, actServices];
  if (sources.every((s) => s === null)) {
    activity = null;
  } else {
    const events: ActivityEvent[] = [];
    for (const r of actConsults ?? []) {
      events.push({
        color: '#1F8A5B',
        text: `New consultation request — ${r.name}`,
        ts: r.created_at,
      });
    }
    for (const r of actBooked ?? []) {
      events.push({
        color: '#2A6FDB',
        text: `Meeting booked — ${r.name} · ${fmtDate(r.meeting_date)}`,
        ts: r.created_at,
      });
    }
    for (const r of actCanceled ?? []) {
      events.push({
        color: '#D64545',
        text: `Meeting canceled — ${r.name} · ${fmtDate(r.meeting_date)}`,
        ts: r.updated_at,
      });
    }
    for (const r of actProjects ?? []) {
      events.push({
        color: '#2A6FDB',
        text: `Project "${titleEn(r.i18n)}" updated`,
        ts: r.updated_at,
      });
    }
    for (const r of actServices ?? []) {
      events.push({
        color: '#FB8500',
        text: `Service "${titleEn(r.i18n)}" published`,
        ts: r.updated_at,
      });
    }
    activity = mergeActivity(events);
  }

  return {
    traffic: await traffic,
    projects:
      projTotal === null || projPublished === null
        ? null
        : { published: projPublished, total: projTotal },
    services:
      svcTotal === null || svcPublished === null
        ? null
        : { published: svcPublished, total: svcTotal },
    meetings:
      mUpcoming === null || mCompleted === null || mScheduledPast === null || mCanceled === null
        ? null
        : { upcoming: mUpcoming, past: mCompleted + mScheduledPast, canceled: mCanceled },
    consultations:
      cPending === null || cTotal === null ? null : { pending: cPending, total: cTotal },
    chartDates,
    activity,
  };
}

/* ------------------------------------------------------------------ */
/* Chart (inline SVG — design's orange treatment, no chart libraries)  */
/* ------------------------------------------------------------------ */

/** Catmull-Rom smoothing ≈ Chart.js tension 0.35, clamped to the plot box. */
function smoothPath(pts: [number, number][], yMin: number, yMax: number): string {
  if (pts.length < 2) return '';
  const clampY = (y: number) => Math.min(yMax, Math.max(yMin, y));
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = clampY(p1[1] + (p2[1] - p0[1]) / 6);
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = clampY(p2[1] - (p3[1] - p1[1]) / 6);
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

function RequestsChart({
  labels,
  values,
  unit = 'request',
}: {
  labels: string[];
  values: number[];
  unit?: string;
}) {
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

  const padTop = 8;
  const padBottom = 4;
  // Integer y scale for counts: a multiple of 4 so quarter gridlines stay whole.
  const yMax = Math.max(4, Math.ceil(Math.max(...values, 0) / 4) * 4);
  const plotH = height - padTop - padBottom;
  const xFor = (i: number) => (values.length === 1 ? 0 : (i / (values.length - 1)) * width);
  const yFor = (v: number) => padTop + plotH - (v / yMax) * plotH;
  const pts: [number, number][] = values.map((v, i) => [xFor(i), yFor(v)]);
  const line = smoothPath(pts, padTop, height - padBottom);
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
            role="img"
            aria-label={`New ${unit}s per day`}
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
              <span style={{ color: '#A8A29E' }}>{labels[hover]}</span> · {values[hover]}{' '}
              {values[hover] === 1 ? unit : `${unit}s`}
            </div>
          )}
        </div>
        {/* x labels — M/D, sparse */}
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
            .map((l, i) => (
              <span key={`${l}-${i}`}>{l}</span>
            ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

const card: CSSProperties = {
  background: '#fff',
  border: '1px solid #EAEAE8',
  borderRadius: 14,
};

const chartPlaceholder: CSSProperties = {
  height: 280,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
  color: '#A8A29E',
};

const IconConsultations = () => (
  <svg
    width={19}
    height={19}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

function StatSkeleton() {
  return (
    <div style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="adm-skel" style={{ width: 19, height: 19 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div className="adm-skel" style={{ width: 90, height: 13 }} />
        <div className="adm-skel" style={{ width: 64, height: 26 }} />
        <div className="adm-skel" style={{ width: 120, height: 12 }} />
      </div>
    </div>
  );
}

export default function DashboardView() {
  const { setSubtitle } = useAdminShell();
  const [range, setRange] = useState<Range>(7);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    setSubtitle('Live statistics and recent activity');
    return () => setSubtitle(null);
  }, [setSubtitle]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      if (!supabase) {
        console.warn('[dashboard] Supabase is not configured — stats unavailable');
        if (alive) {
          setData({
            projects: null,
            services: null,
            meetings: null,
            consultations: null,
            chartDates: null,
            activity: null,
            traffic: null,
          });
        }
        return;
      }
      const d = await fetchDashboard(supabase as unknown as DashClient, new Date());
      if (alive) setData(d);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const loading = data === null;
  const loadedAt = useMemo(() => new Date(), [data]);
  const series = useMemo(
    () => (data?.chartDates ? buildSeries(data.chartDates, range, loadedAt) : null),
    [data, range, loadedAt]
  );
  const traffic = useMemo(
    () =>
      data?.traffic && data.traffic !== 'missing'
        ? buildTraffic(data.traffic, range, loadedAt)
        : null,
    [data, range, loadedAt]
  );

  const stats = loading
    ? null
    : [
        {
          key: 'projects',
          label: 'Projects',
          icon: <IconProjects size={19} strokeWidth={1.8} />,
          value: data.projects ? data.projects.published.toLocaleString('en-US') : '—',
          sub: data.projects
            ? `of ${data.projects.total.toLocaleString('en-US')} total`
            : "Couldn't load",
        },
        {
          key: 'services',
          label: 'Services',
          icon: <IconServices size={19} strokeWidth={1.8} />,
          value: data.services ? data.services.published.toLocaleString('en-US') : '—',
          sub: data.services
            ? `of ${data.services.total.toLocaleString('en-US')} total`
            : "Couldn't load",
        },
        {
          key: 'meetings',
          label: 'Meetings',
          icon: <IconCalendar size={19} strokeWidth={1.8} />,
          value: data.meetings ? data.meetings.upcoming.toLocaleString('en-US') : '—',
          sub: data.meetings
            ? `${data.meetings.past.toLocaleString('en-US')} past · ${data.meetings.canceled.toLocaleString('en-US')} canceled`
            : "Couldn't load",
        },
        {
          key: 'consultations',
          label: 'Pending consultations',
          icon: <IconConsultations />,
          value: data.consultations ? data.consultations.pending.toLocaleString('en-US') : '—',
          sub: data.consultations
            ? `${data.consultations.total.toLocaleString('en-US')} total`
            : "Couldn't load",
        },
      ];

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

  const quickAction = (icon: ReactNode, label: string, to: string, external = false) => {
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
    const style: CSSProperties = {
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
        {stats === null
          ? [0, 1, 2, 3].map((i) => <StatSkeleton key={i} />)
          : stats.map((s) => (
              <div
                key={s.key}
                style={{ ...card, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}
              >
                <span style={{ color: '#A8A29E', display: 'flex' }}>{s.icon}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 13, color: '#A8A29E' }}>{s.label}</span>
                  <span style={{ fontSize: 26, fontWeight: 500, letterSpacing: -0.5 }}>
                    {s.value}
                  </span>
                  <span style={{ fontSize: 12, color: '#A8A29E' }}>{s.sub}</span>
                </div>
              </div>
            ))}
      </div>

      {/* requests chart */}
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
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Requests</h2>
            <span style={{ fontSize: 13, color: '#A8A29E' }}>Last {range} days</span>
          </div>
          <div style={{ display: 'flex', gap: 4, background: '#F2F1EF', padding: 4, borderRadius: 11 }}>
            {rangeBtn('Last 7 days', 7)}
            {rangeBtn('Last 30 days', 30)}
            {rangeBtn('Last 90 days', 90)}
          </div>
        </div>
        {loading ? (
          <div className="adm-skel" style={{ height: 250, borderRadius: 10 }} />
        ) : data.chartDates === null ? (
          <div style={chartPlaceholder}>Couldn't load</div>
        ) : series && series.total > 0 ? (
          <RequestsChart labels={series.labels} values={series.values} />
        ) : (
          <div style={chartPlaceholder}>No requests in this period</div>
        )}
      </div>

      {/* site traffic (v6 — self-hosted, cookieless page views) */}
      <div style={{ ...card, padding: '22px 24px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 10,
            flexWrap: 'wrap',
            marginBottom: 16,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Site traffic</h2>
          <span style={{ fontSize: 13, color: '#A8A29E' }}>Last {range} days</span>
        </div>
        {loading ? (
          <div className="adm-skel" style={{ height: 250, borderRadius: 10 }} />
        ) : data.traffic === 'missing' ? (
          <div style={chartPlaceholder}>
            Run supabase/migrate-v6.sql to start collecting page views
          </div>
        ) : data.traffic === null ? (
          <div style={chartPlaceholder}>Couldn't load</div>
        ) : traffic && traffic.totalViews > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 14,
              }}
            >
              {[
                { label: 'Page views', value: traffic.totalViews.toLocaleString('en-US') },
                { label: 'Unique visits', value: traffic.totalVisits.toLocaleString('en-US') },
                {
                  label: 'Mobile share',
                  value:
                    traffic.mobileShare === null
                      ? '—'
                      : `${Math.round(traffic.mobileShare * 100)}%`,
                },
                {
                  label: 'Top page',
                  value: traffic.topPaths[0] ? pathLabel(traffic.topPaths[0].path) : '—',
                },
              ].map((tile) => (
                <div
                  key={tile.label}
                  style={{
                    background: '#FAF9F7',
                    border: '1px solid #F2F1EF',
                    borderRadius: 11,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  }}
                >
                  <span style={{ fontSize: 12, color: '#A8A29E' }}>{tile.label}</span>
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      letterSpacing: -0.4,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {tile.value}
                  </span>
                </div>
              ))}
            </div>
            <RequestsChart labels={traffic.labels} values={traffic.views} unit="view" />
            {traffic.topPaths.length > 0 && (
              <div>
                <h3 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>Top pages</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {traffic.topPaths.map((p) => (
                    <div
                      key={p.path}
                      style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                    >
                      <span
                        style={{
                          width: 190,
                          flexShrink: 0,
                          fontSize: 13,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={p.path}
                      >
                        {pathLabel(p.path)}
                      </span>
                      <span
                        style={{
                          flex: 1,
                          height: 8,
                          background: '#F2F1EF',
                          borderRadius: 4,
                          overflow: 'hidden',
                        }}
                      >
                        <span
                          style={{
                            display: 'block',
                            height: '100%',
                            borderRadius: 4,
                            background: '#FB8500',
                            width: `${Math.max(
                              4,
                              Math.round((p.views / traffic.topPaths[0].views) * 100)
                            )}%`,
                          }}
                        />
                      </span>
                      <span
                        style={{
                          width: 52,
                          flexShrink: 0,
                          textAlign: 'right',
                          fontSize: 13,
                          color: '#54504D',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {p.views.toLocaleString('en-US')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={chartPlaceholder}>No page views in this period — collecting…</div>
        )}
      </div>

      {/* recent activity */}
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
          {loading &&
            [0, 1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '11px 0',
                  borderBottom: '1px solid #F5F4F2',
                }}
              >
                <div className="adm-skel" style={{ width: 9, height: 9, borderRadius: '50%' }} />
                <div className="adm-skel" style={{ flex: 1, height: 13 }} />
                <div className="adm-skel" style={{ width: 64, height: 12 }} />
              </div>
            ))}
          {!loading && data.activity === null && (
            <div style={{ padding: '14px 0', fontSize: 14, color: '#A8A29E' }}>Couldn't load</div>
          )}
          {!loading && data.activity !== null && data.activity.length === 0 && (
            <div style={{ padding: '14px 0', fontSize: 14, color: '#A8A29E' }}>No activity yet</div>
          )}
          {!loading &&
            data.activity !== null &&
            data.activity.map((a, i) => (
              <div
                key={`${a.ts}-${i}`}
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
                  {relTime(a.ts, loadedAt)}
                </span>
              </div>
            ))}
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
