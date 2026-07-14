import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import type { L10n, MediaItem, ProjectRow, ServiceRow } from '../../lib/db';
import { mediaCounts } from '../../lib/db';
import { supabase } from '../../lib/supabase';
import Dropdown from '../../components/Dropdown';
import { useAdminShell } from './context';
import EditorDrawer, { type DrawerRecord } from './EditorDrawer';
import { ListEmpty, ListError, ListSkeleton, RecordCardGrid, type CardRow } from './RecordCards';
import { IconPlus, IconProjects, IconServices, PrimaryBtn } from './ui';

/**
 * The Projects and Services views are the same view in the design (mirrored
 * state/logic) — this component implements both, parameterised by `kind`.
 */

type Kind = 'project' | 'service';
type Row = ProjectRow | ServiceRow;

const CONFIG = {
  project: {
    table: 'projects',
    nounOne: 'project',
    nounMany: 'projects',
    filterAll: 'All projects',
    addLabel: 'Add Project',
    deleteTitle: 'Delete project?',
    deleteMessage:
      'This project and its media will be permanently removed. This cannot be undone.',
    deletedToast: 'Project deleted',
    duplicatedToast: 'Project duplicated',
    emptyTitle: 'No projects yet',
    emptySub: 'Add your first project to show it on the public site.',
    emptyAction: 'Add your first project',
    subtitle: (n: number) => `${n} projects in the portfolio`,
  },
  service: {
    table: 'services',
    nounOne: 'service',
    nounMany: 'services',
    filterAll: 'All services',
    addLabel: 'Add Service',
    deleteTitle: 'Delete service?',
    deleteMessage:
      'This service and its media will be removed from the admin and the public site. This cannot be undone.',
    deletedToast: 'Service deleted',
    duplicatedToast: 'Service duplicated',
    emptyTitle: 'No services yet',
    emptySub: 'Add your first service card to show it on the public site.',
    emptyAction: 'Add your first service',
    subtitle: (n: number) => `${n} service cards on the public site`,
  },
} as const;

const copyL10n = (l: L10n, suffix: string): L10n => ({
  en: l.en ? l.en + suffix : l.en,
  lv: l.lv ? l.lv + suffix : l.lv,
  ru: l.ru ? l.ru + suffix : l.ru,
});

function coverOf(row: Row): { src: string; isVideo: boolean } {
  const m = row.media.find((x: MediaItem) => x.id === row.cover) ?? row.media[0];
  if (!m) return { src: '', isVideo: false };
  return { src: m.type === 'video' ? m.poster || '' : m.src, isVideo: m.type === 'video' };
}

function mediaLabel(media: MediaItem[]): string {
  const { images, videos } = mediaCounts(media);
  const parts: string[] = [];
  if (images) parts.push(`${images} ${images === 1 ? 'image' : 'images'}`);
  if (videos) parts.push(`${videos} ${videos === 1 ? 'video' : 'videos'}`);
  return parts.join(' · ') || 'No media';
}

export default function RecordListView({ kind }: { kind: Kind }) {
  const cfg = CONFIG[kind];
  const { toast, confirm, search, setSubtitle } = useAdminShell();
  const location = useLocation();
  const navigate = useNavigate();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<false | 'query' | 'schema'>(false);
  const [statusFilter, setStatusFilter] = useState<string>(cfg.filterAll);
  const [editor, setEditor] = useState<DrawerRecord | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError(false);
    const { data, error: err } = await supabase
      .from(cfg.table)
      .select('*')
      .order('sort_order', { ascending: true });
    if (err) {
      setError('query');
    } else if (
      (data ?? []).some(
        (r) => !r || typeof r.i18n !== 'object' || r.i18n === null || !Array.isArray(r.media)
      )
    ) {
      // v1 rows (before supabase/migrate-v2.sql) would crash every card render.
      setError('schema');
    } else {
      setRows((data ?? []) as Row[]);
    }
    setLoading(false);
  }, [cfg.table]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSubtitle(cfg.subtitle(rows.length));
    return () => setSubtitle(null);
  }, [rows.length, cfg, setSubtitle]);

  // Quick action from the dashboard: /admin/<view>?new=1 opens the drawer.
  useEffect(() => {
    if (new URLSearchParams(location.search).get('new') === '1') {
      setEditor(kind === 'project' ? { kind, row: null } : { kind, row: null });
      navigate(location.pathname, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // ---- filtering (design: status filter + shell search) ----
  const q = search.trim().toLowerCase();
  const filterState =
    statusFilter === 'Published' ? true : statusFilter === 'Draft' ? false : null;

  const visible = useMemo(() => {
    let indexed = rows.map((row, i) => ({ row, i }));
    if (filterState != null) indexed = indexed.filter((x) => x.row.published === filterState);
    if (q) {
      indexed = indexed.filter(({ row }) => {
        const cat = kind === 'project' ? (row as ProjectRow).service : (row as ServiceRow).category;
        const client = kind === 'project' ? (row as ProjectRow).client : '';
        return `${row.i18n.title.en} ${row.i18n.summary.en} ${client} ${cat}`
          .toLowerCase()
          .includes(q);
      });
    }
    return indexed;
  }, [rows, filterState, q, kind]);

  // ---- mutations ----
  const togglePublished = async (row: Row) => {
    const next = !row.published;
    setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, published: next } : r)));
    const { error: err } = await supabase!
      .from(cfg.table)
      .update({ published: next })
      .eq('id', row.id);
    if (err) {
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, published: !next } : r)));
      toast(`Couldn't update ${cfg.nounOne}`);
    }
  };

  const duplicate = async (row: Row) => {
    if (!supabase) return;
    const maxOrder = rows.reduce((m, r) => Math.max(m, r.sort_order), 0);
    const shared = {
      slug: `${row.slug}-copy`,
      published: false,
      sort_order: maxOrder + 1,
      cover: row.cover,
      media: row.media,
      i18n: { ...row.i18n, title: copyL10n(row.i18n.title, ' (copy)') },
    };
    let err: { message: string } | null;
    if (kind === 'project') {
      const p = row as ProjectRow;
      ({ error: err } = await supabase.from('projects').insert({
        ...shared,
        service: p.service,
        status: p.status,
        client: p.client,
        country: p.country,
        city: p.city,
        loc: p.loc,
        url: p.url,
        start_date: p.start_date,
        end_date: p.end_date,
        space_img: p.space_img,
        scope: p.scope,
      }));
    } else {
      const s = row as ServiceRow;
      ({ error: err } = await supabase.from('services').insert({
        ...shared,
        category: s.category,
        cta_label: s.cta_label,
        cta_link: s.cta_link,
        capabilities: s.capabilities,
        extras: s.extras,
      }));
    }
    if (err) {
      toast(`Couldn't duplicate ${cfg.nounOne}`);
      return;
    }
    toast(cfg.duplicatedToast);
    void load();
  };

  const remove = async (row: Row) => {
    const ok = await confirm({
      title: cfg.deleteTitle,
      message: cfg.deleteMessage,
      label: 'Delete',
    });
    if (!ok || !supabase) return;
    const { error: err } = await supabase.from(cfg.table).delete().eq('id', row.id);
    if (err) {
      toast(`Couldn't delete ${cfg.nounOne}`);
      return;
    }
    setRows((rs) => rs.filter((r) => r.id !== row.id));
    toast(cfg.deletedToast);
  };

  const reorder = (fromPos: number, toPos: number) => {
    // Positions are within the filtered view; map to master-array indexes
    // like the design (projIndexed keeps the original index).
    const from = visible[fromPos]?.i;
    const to = visible[toPos]?.i;
    if (from == null || to == null || from === to) return;
    const next = [...rows];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    const renumbered = next.map((r, i) => ({ ...r, sort_order: i }));
    setRows(renumbered);
    void (async () => {
      if (!supabase) return;
      const results = await Promise.all(
        renumbered.map((r) =>
          supabase!.from(cfg.table).update({ sort_order: r.sort_order }).eq('id', r.id)
        )
      );
      if (results.some((r) => r.error)) toast("Couldn't save the new order");
    })();
  };

  const openEditor = (row: Row | null) =>
    setEditor(
      kind === 'project'
        ? { kind: 'project', row: row as ProjectRow | null }
        : { kind: 'service', row: row as ServiceRow | null }
    );

  const cardRows: CardRow[] = visible.map(({ row }) => {
    const cover = coverOf(row);
    return {
      id: row.id,
      cover: cover.src,
      coverIsVideo: cover.isVideo,
      title: row.i18n.title.en || row.i18n.title.lv || row.i18n.title.ru,
      summary: row.i18n.summary.en || row.i18n.summary.lv || row.i18n.summary.ru,
      category: kind === 'project' ? (row as ProjectRow).service : (row as ServiceRow).category,
      mediaCount: mediaLabel(row.media),
      published: row.published,
      onToggle: () => void togglePublished(row),
      onEdit: () => openEditor(row),
      onDuplicate: () => void duplicate(row),
      onDelete: () => void remove(row),
    };
  });

  const filtered = Boolean(q || filterState != null);
  const emptyIcon = kind === 'project' ? <IconProjects size={30} strokeWidth={1.8} /> : <IconServices size={30} strokeWidth={1.8} />;

  return (
    <>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 20,
        }}
      >
        <span style={{ fontSize: 14, color: '#54504D' }}>
          {visible.length} {visible.length === 1 ? cfg.nounOne : cfg.nounMany} · drag cards to
          reorder
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 180 }}>
            <Dropdown
              value={statusFilter}
              options={[cfg.filterAll, 'Published', 'Draft']}
              onChange={setStatusFilter}
            />
          </div>
          <PrimaryBtn onClick={() => openEditor(null)}>
            <IconPlus />
            {cfg.addLabel}
          </PrimaryBtn>
        </div>
      </div>

      {loading && <ListSkeleton />}
      {!loading && error && (
        <ListError
          noun={cfg.nounMany}
          detail={
            error === 'schema'
              ? 'The database still has the old column layout — run supabase/migrate-v2.sql in the Supabase SQL editor, then try again.'
              : undefined
          }
          onRetry={() => void load()}
        />
      )}
      {!loading && !error && visible.length === 0 && (
        <ListEmpty
          icon={emptyIcon}
          title={filtered ? `No matching ${cfg.nounMany}` : cfg.emptyTitle}
          sub={filtered ? 'Try a different search or status filter.' : cfg.emptySub}
          actionLabel={filtered ? undefined : cfg.emptyAction}
          onAction={filtered ? undefined : () => openEditor(null)}
        />
      )}
      {!loading && !error && visible.length > 0 && (
        <RecordCardGrid rows={cardRows} onReorder={reorder} />
      )}

      <AnimatePresence>
        {editor && (
          <EditorDrawer
            record={editor}
            nextSortOrder={rows.reduce((m, r) => Math.max(m, r.sort_order), -1) + 1}
            onClose={() => setEditor(null)}
            onSaved={() => void load()}
          />
        )}
      </AnimatePresence>
    </>
  );
}
