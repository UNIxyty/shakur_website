import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { L10n, Lang, MediaItem, ProjectRow, ServiceRow } from '../../lib/db';
import { emptyL10n } from '../../lib/db';
import {
  CATEGORIES,
  SERVICE_OPTIONS,
  STATUSES,
  slugify,
  supabase,
  type ProjectStatus,
  type ServiceCategory,
} from '../../lib/supabase';
import Dropdown from '../../components/Dropdown';
import DatePicker from '../../components/DatePicker';
import { useAdminShell } from './context';
import MediaManager from './MediaManager';
import CapabilitiesEditor, {
  emptyCapabilityItems,
  type CapabilitiesValue,
} from './CapabilitiesEditor';
import AiAction from './AiAction';
import { aiWriteCapabilities, aiWriteText, type AiState, type AiTextField } from './ai';
import { Field, FONT, IconClose, focusHandlers, inputStyle, monoInputStyle } from './ui';

/**
 * Right-side editor drawer from ShakurAdminPanel.dc.html, shared between
 * projects and services exactly like the design's mirrored logic: media
 * manager on top, EN/LV/RU tabs with completion dots, per-language fields
 * with "Write with AI", type-specific shared fields, the capabilities/scope
 * editor, and the Cancel / Save as draft / Publish footer with autosave.
 */

export type DrawerRecord =
  | { kind: 'project'; row: ProjectRow | null }
  | { kind: 'service'; row: ServiceRow | null };

type Draft = {
  id: string | null;
  slug: string;
  slugTouched: boolean;
  published: boolean;
  sortOrder: number;
  media: MediaItem[];
  cover: string;
  i18n: { title: L10n; summary: L10n; description: L10n };
  caps: CapabilitiesValue;
  // project-only
  service: string;
  status: ProjectStatus;
  start: string;
  end: string;
  country: string;
  city: string;
  client: string;
  loc: string;
  url: string;
  spaceImg: string;
  // service-only
  category: ServiceCategory;
  ctaLabel: L10n;
  ctaLink: string;
  extras: ServiceRow['extras'];
};

const LANGS: Lang[] = ['en', 'lv', 'ru'];
const LANG_LABELS: Record<Lang, string> = { en: 'EN', lv: 'LV', ru: 'RU' };

function makeDraft(record: DrawerRecord, nextSortOrder: number): Draft {
  const base: Draft = {
    id: null,
    slug: '',
    slugTouched: false,
    published: false,
    sortOrder: nextSortOrder,
    media: [],
    cover: '',
    i18n: { title: emptyL10n(), summary: emptyL10n(), description: emptyL10n() },
    caps: { title: emptyL10n(), intro: emptyL10n(), items: emptyCapabilityItems() },
    service: 'Drywall',
    status: 'In Progress',
    start: '',
    end: '',
    country: 'Latvia',
    city: '',
    client: '',
    loc: '',
    url: '',
    spaceImg: '',
    category: 'Construction',
    ctaLabel: { en: 'Book this service', lv: '', ru: '' },
    ctaLink: '/contact',
    extras: { highlights: [], facts: [] },
  };
  if (record.kind === 'project' && record.row) {
    const r = record.row;
    return {
      ...base,
      id: r.id,
      slug: r.slug,
      slugTouched: true,
      published: r.published,
      sortOrder: r.sort_order,
      media: r.media,
      cover: r.cover,
      i18n: r.i18n,
      caps: r.scope.items.length ? r.scope : { ...r.scope, items: emptyCapabilityItems() },
      service: r.service,
      status: r.status,
      start: r.start_date,
      end: r.end_date,
      country: r.country,
      city: r.city,
      client: r.client,
      loc: r.loc,
      url: r.url,
      spaceImg: r.space_img,
    };
  }
  if (record.kind === 'service' && record.row) {
    const r = record.row;
    return {
      ...base,
      id: r.id,
      slug: r.slug,
      slugTouched: true,
      published: r.published,
      sortOrder: r.sort_order,
      media: r.media,
      cover: r.cover,
      i18n: r.i18n,
      caps: r.capabilities.items.length
        ? r.capabilities
        : { ...r.capabilities, items: emptyCapabilityItems() },
      category: r.category,
      ctaLabel: r.cta_label,
      ctaLink: r.cta_link,
      extras: r.extras,
    };
  }
  return base;
}

const langComplete = (d: Draft, l: Lang) =>
  Boolean(d.i18n.title[l] && d.i18n.summary[l] && d.i18n.description[l]);
const langPartial = (d: Draft, l: Lang) =>
  Boolean(d.i18n.title[l] || d.i18n.summary[l] || d.i18n.description[l]);

function FieldHead({
  label,
  sub,
  action,
}: {
  label: string;
  sub?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        minHeight: 24,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600 }}>
        {label} {sub}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{action}</div>
    </div>
  );
}

export default function EditorDrawer({
  record,
  nextSortOrder,
  onClose,
  onSaved,
}: {
  record: DrawerRecord;
  nextSortOrder: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useAdminShell();
  const isProject = record.kind === 'project';
  const noun = isProject ? 'project' : 'service';
  const draftKey = `shakur_admin_draft_${record.kind}`;

  const [draft, setDraft] = useState<Draft>(() => makeDraft(record, nextSortOrder));
  const [lang, setLang] = useState<Lang>('en');
  const [ai, setAi] = useState<Record<string, AiState>>({});
  const [saving, setSaving] = useState(false);
  const [autosave, setAutosave] = useState<{ state: 'on' | 'dirty' | 'saved'; at: string }>({
    state: 'on',
    at: '',
  });
  const [restorable, setRestorable] = useState<Draft | null>(() => {
    if (record.row) return null;
    try {
      const raw = localStorage.getItem(draftKey);
      return raw ? (JSON.parse(raw) as Draft) : null;
    } catch {
      return null;
    }
  });

  // ---- client-side autosave: 2 s idle -> localStorage draft copy ----
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setAutosave((a) => ({ ...a, state: 'dirty' }));
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(draft));
      } catch {
        /* storage full/blocked — indicator only */
      }
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      setAutosave({ state: 'saved', at: `${hh}:${mm}` });
    }, 2000);
    return () => clearTimeout(t);
  }, [draft, draftKey]);

  const setI18nField = (field: AiTextField, value: string) =>
    setDraft((d) => {
      const next: Draft = {
        ...d,
        i18n: { ...d.i18n, [field]: { ...d.i18n[field], [lang]: value } },
      };
      // Slug auto-derives from the EN title on create only — never on edit.
      if (field === 'title' && lang === 'en' && d.id == null && !d.slugTouched) {
        next.slug = slugify(value);
      }
      return next;
    });

  const runAiText = async (field: AiTextField) => {
    setAi((a) => ({ ...a, [field]: 'gen' }));
    try {
      const note = draft.i18n[field][lang] || draft.i18n[field].en || '';
      const out = await aiWriteText(field, note, draft.i18n[field].en);
      setDraft((d) => ({ ...d, i18n: { ...d.i18n, [field]: out } }));
      setAi((a) => ({ ...a, [field]: 'done' }));
    } catch {
      setAi((a) => ({ ...a, [field]: 'err' }));
    }
  };

  const runAiCaps = async () => {
    setAi((a) => ({ ...a, caps: 'gen' }));
    try {
      const note =
        draft.caps.intro[lang] || draft.i18n.description[lang] || draft.i18n.title.en || noun;
      const items = await aiWriteCapabilities(note);
      setDraft((d) => ({ ...d, caps: { ...d.caps, items } }));
      setAi((a) => ({ ...a, caps: 'done' }));
    } catch {
      setAi((a) => ({ ...a, caps: 'err' }));
    }
  };

  // ---- persist to Supabase ----
  const commit = async (publish: boolean) => {
    if (!supabase || saving) return;
    setSaving(true);
    const d = { ...draft };
    if (!d.i18n.title.en.trim()) {
      d.i18n = {
        ...d.i18n,
        title: { ...d.i18n.title, en: isProject ? 'Untitled Project' : 'Untitled Service' },
      };
    }
    const slug = d.slug || slugify(d.i18n.title.en);
    const cover = d.cover || d.media[0]?.id || '';
    const shared = {
      slug,
      published: publish,
      cover,
      media: d.media,
      i18n: d.i18n,
    };
    const table = isProject ? 'projects' : 'services';
    const payload = isProject
      ? {
          ...shared,
          service: d.service,
          status: d.status,
          client: d.client,
          country: d.country,
          city: d.city,
          loc: d.loc,
          url: d.url,
          start_date: d.start,
          end_date: d.end,
          space_img: d.spaceImg,
          scope: d.caps,
        }
      : {
          ...shared,
          category: d.category,
          cta_label: d.ctaLabel,
          cta_link: d.ctaLink,
          capabilities: d.caps,
          extras: d.extras,
        };
    const { error } = d.id
      ? await supabase.from(table).update(payload).eq('id', d.id)
      : await supabase.from(table).insert({ ...payload, sort_order: d.sortOrder });
    setSaving(false);
    if (error) {
      toast(`Couldn't save ${noun} — try again`);
      return;
    }
    try {
      localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
    toast(publish ? (isProject ? 'Project published' : 'Service published') : 'Saved as draft');
    onSaved();
    onClose();
  };

  const isDraftStatus = !draft.published;
  const title =
    record.row == null ? `New ${noun}` : `Edit ${noun}`;
  const publishLabel = draft.id != null && !isDraftStatus ? 'Save changes' : 'Publish';

  const langSub = (
    <span style={{ color: '#C7C3BF', fontWeight: 500 }}>· {LANG_LABELS[lang]}</span>
  );
  const mutedSub = (text: string) => (
    <span style={{ color: '#A8A29E', fontWeight: 400 }}>
      — {text} · {LANG_LABELS[lang]}
    </span>
  );

  const dots = useMemo(
    () =>
      LANGS.map((l) => {
        if (langComplete(draft, l))
          return { dot: '#1F8A5B', ring: '0 0 0 3px rgba(31,138,91,0.16)' };
        if (langPartial(draft, l))
          return { dot: '#FB8500', ring: '0 0 0 3px rgba(251,133,0,0.16)' };
        return { dot: '#D6D3D1', ring: 'none' };
      }),
    [draft]
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200 }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(22,12,0,0.45)' }}
      />
      <motion.div
        className="adm-scroll"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 560,
          maxWidth: '96vw',
          background: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-20px 0 60px rgba(0,0,0,0.2)',
        }}
      >
        {/* header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '22px 28px',
            borderBottom: '1px solid #EAEAE8',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: -0.4,
                whiteSpace: 'nowrap',
              }}
            >
              {title}
            </h2>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 999,
                background: isDraftStatus ? '#F2F1EF' : '#E6F4EC',
                color: isDraftStatus ? '#8A8580' : '#1F8A5B',
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: isDraftStatus ? '#8A8580' : '#1F8A5B',
                }}
              />
              {isDraftStatus ? 'Draft' : 'Published'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontSize: 12,
                color: '#A8A29E',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: autosave.state === 'dirty' ? '#FB8500' : '#1F8A5B',
                }}
              />
              {autosave.state === 'on'
                ? 'Autosave on'
                : autosave.state === 'dirty'
                  ? 'Unsaved changes'
                  : `Draft saved ${autosave.at}`}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                width: 34,
                height: 34,
                border: 'none',
                background: '#F5F5F4',
                borderRadius: 9,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#54504D',
              }}
            >
              <IconClose />
            </button>
          </div>
        </div>

        {/* body */}
        <div
          className="adm-scroll"
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 28px',
            display: 'flex',
            flexDirection: 'column',
            gap: 20,
          }}
        >
          {restorable && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 14px',
                borderRadius: 11,
                background: '#FFF9F1',
                border: '1px solid #F0D8B8',
                fontSize: 13,
                color: '#C96A00',
                fontWeight: 600,
              }}
            >
              <span style={{ flex: 1 }}>You have an unsaved {noun} draft from earlier.</span>
              <button
                type="button"
                onClick={() => {
                  setDraft({ ...restorable, id: null });
                  setRestorable(null);
                }}
                style={{
                  border: 'none',
                  background: '#FB8500',
                  color: '#160C00',
                  fontFamily: FONT,
                  fontWeight: 600,
                  fontSize: 12,
                  padding: '6px 12px',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                Restore
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem(draftKey);
                  } catch {
                    /* ignore */
                  }
                  setRestorable(null);
                }}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#A8A29E',
                  fontFamily: FONT,
                  fontWeight: 600,
                  fontSize: 12,
                  padding: '6px 4px',
                  cursor: 'pointer',
                }}
              >
                Discard
              </button>
            </div>
          )}

          <MediaManager
            recordType={isProject ? 'projects' : 'services'}
            media={draft.media}
            cover={draft.cover}
            onChange={(media, cover) => setDraft((d) => ({ ...d, media, cover }))}
          />

          {/* language tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div
              style={{ display: 'flex', gap: 6, background: '#F5F5F4', padding: 5, borderRadius: 11 }}
            >
              {LANGS.map((l, i) => {
                const active = lang === l;
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    style={{
                      flex: 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 7,
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: FONT,
                      fontWeight: 600,
                      fontSize: 13,
                      padding: 9,
                      borderRadius: 8,
                      background: active ? '#FFFFFF' : 'transparent',
                      color: active ? '#160C00' : '#54504D',
                      boxShadow: active ? '0 1px 3px rgba(22,12,0,0.12)' : 'none',
                    }}
                  >
                    {LANG_LABELS[l]}
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: dots[i].dot,
                        boxShadow: dots[i].ring,
                      }}
                    />
                  </button>
                );
              })}
            </div>
            <span style={{ fontSize: 12, color: '#A8A29E', lineHeight: 1.5 }}>
              Title, summary &amp; description are per-language. Media &amp; settings are shared.
            </span>
          </div>

          {/* title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <FieldHead
              label="Title"
              sub={langSub}
              action={<AiAction state={ai.title ?? 'idle'} onRun={() => void runAiText('title')} />}
            />
            <input
              type="text"
              value={draft.i18n.title[lang]}
              onChange={(e) => setI18nField('title', e.target.value)}
              placeholder={isProject ? 'Project title' : 'Service title'}
              style={inputStyle}
              {...focusHandlers()}
            />
          </div>

          {!isProject && (
            <>
              <Field label="URL slug">
                <input
                  type="text"
                  value={draft.slug}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, slug: e.target.value, slugTouched: true }))
                  }
                  placeholder="service-slug"
                  style={monoInputStyle}
                  {...focusHandlers()}
                />
              </Field>
              <Field label="Category">
                <Dropdown
                  value={draft.category}
                  options={[...CATEGORIES]}
                  onChange={(v) => setDraft((d) => ({ ...d, category: v as ServiceCategory }))}
                />
              </Field>
            </>
          )}

          {/* summary */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <FieldHead
              label="Card summary"
              sub={mutedSub(isProject ? 'projects grid' : 'services grid')}
              action={
                <AiAction state={ai.summary ?? 'idle'} onRun={() => void runAiText('summary')} />
              }
            />
            <textarea
              rows={2}
              value={draft.i18n.summary[lang]}
              onChange={(e) => setI18nField('summary', e.target.value)}
              placeholder="One-line summary"
              style={{ ...inputStyle, resize: 'vertical' }}
              {...focusHandlers()}
            />
          </div>

          {/* description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <FieldHead
              label="Full description"
              sub={mutedSub(isProject ? 'detail view' : 'detail page')}
              action={
                <AiAction
                  state={ai.description ?? 'idle'}
                  onRun={() => void runAiText('description')}
                />
              }
            />
            <textarea
              rows={6}
              value={draft.i18n.description[lang]}
              onChange={(e) => setI18nField('description', e.target.value)}
              placeholder={
                isProject
                  ? 'Describe the project, scope, and outcomes…'
                  : 'Describe the service, materials, process, and outcomes…'
              }
              style={{ ...inputStyle, lineHeight: 1.6, resize: 'vertical' }}
              {...focusHandlers()}
            />
          </div>

          {!isProject && (
            <div style={{ display: 'flex', gap: 14 }}>
              <Field label={<span>CTA label {langSub}</span>} style={{ flex: 1 }}>
                <input
                  type="text"
                  value={draft.ctaLabel[lang]}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      ctaLabel: { ...d.ctaLabel, [lang]: e.target.value },
                    }))
                  }
                  placeholder="Book this service"
                  style={inputStyle}
                  {...focusHandlers()}
                />
              </Field>
              <Field label="CTA link" style={{ flex: 1 }}>
                <input
                  type="text"
                  value={draft.ctaLink}
                  onChange={(e) => setDraft((d) => ({ ...d, ctaLink: e.target.value }))}
                  placeholder="/contact"
                  style={monoInputStyle}
                  {...focusHandlers()}
                />
              </Field>
            </div>
          )}

          {isProject && (
            <>
              <div style={{ display: 'flex', gap: 14 }}>
                <Field label="Service type" style={{ flex: 1 }}>
                  <Dropdown
                    value={draft.service}
                    options={[...SERVICE_OPTIONS]}
                    onChange={(v) => setDraft((d) => ({ ...d, service: v }))}
                  />
                </Field>
                <Field label="Project status" style={{ flex: 1 }}>
                  <Dropdown
                    value={draft.status}
                    options={[...STATUSES]}
                    onChange={(v) => setDraft((d) => ({ ...d, status: v as ProjectStatus }))}
                  />
                </Field>
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                <Field label="Client" style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={draft.client}
                    onChange={(e) => setDraft((d) => ({ ...d, client: e.target.value }))}
                    placeholder="Client name"
                    style={inputStyle}
                    {...focusHandlers()}
                  />
                </Field>
                <Field label="Location details" style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={draft.loc}
                    onChange={(e) => setDraft((d) => ({ ...d, loc: e.target.value }))}
                    placeholder="District / address"
                    style={inputStyle}
                    {...focusHandlers()}
                  />
                </Field>
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                <Field label="Start date" style={{ flex: 1 }}>
                  <DatePicker
                    value={draft.start}
                    placeholder="Start date"
                    onChange={(v) => setDraft((d) => ({ ...d, start: v }))}
                  />
                </Field>
                <Field label="End date" style={{ flex: 1 }}>
                  <DatePicker
                    value={draft.end}
                    placeholder="End date"
                    onChange={(v) => setDraft((d) => ({ ...d, end: v }))}
                  />
                </Field>
              </div>
              <div style={{ display: 'flex', gap: 14 }}>
                <Field label="Country" style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={draft.country}
                    onChange={(e) => setDraft((d) => ({ ...d, country: e.target.value }))}
                    placeholder="Latvia"
                    style={inputStyle}
                    {...focusHandlers()}
                  />
                </Field>
                <Field label="City" style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={draft.city}
                    onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                    placeholder="Rīga"
                    style={inputStyle}
                    {...focusHandlers()}
                  />
                </Field>
              </div>
              <Field label="Official website URL">
                <input
                  type="url"
                  value={draft.url}
                  onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
                  placeholder="https://…"
                  style={monoInputStyle}
                  {...focusHandlers()}
                />
              </Field>
            </>
          )}

          <CapabilitiesEditor
            heading={isProject ? 'Scope of work' : 'What we can do'}
            value={draft.caps}
            lang={lang}
            onChange={(caps) => setDraft((d) => ({ ...d, caps }))}
            aiState={ai.caps ?? 'idle'}
            onAiRun={() => void runAiCaps()}
          />
        </div>

        {/* footer */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            padding: '18px 28px',
            borderTop: '1px solid #EAEAE8',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              cursor: 'pointer',
              background: '#fff',
              color: '#160C00',
              border: '1.5px solid #E7E5E4',
              fontFamily: FONT,
              fontWeight: 600,
              fontSize: 15,
              padding: '13px 18px',
              borderRadius: 10,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void commit(false)}
            disabled={saving}
            style={{
              flex: 1,
              cursor: saving ? 'default' : 'pointer',
              background: '#F5F5F4',
              color: '#160C00',
              border: '1.5px solid transparent',
              fontFamily: FONT,
              fontWeight: 600,
              fontSize: 15,
              padding: 13,
              borderRadius: 10,
              opacity: saving ? 0.6 : 1,
            }}
          >
            Save as draft
          </button>
          <button
            type="button"
            onClick={() => void commit(true)}
            disabled={saving}
            style={{
              flex: 1.3,
              border: 'none',
              cursor: saving ? 'default' : 'pointer',
              background: '#FB8500',
              color: '#160C00',
              fontFamily: FONT,
              fontWeight: 600,
              fontSize: 15,
              padding: 13,
              borderRadius: 10,
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : publishLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
