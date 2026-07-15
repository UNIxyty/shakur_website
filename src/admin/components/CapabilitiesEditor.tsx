import { useState } from 'react';
import type { Capability, L10n, Lang } from '../../lib/db';
import { emptyL10n } from '../../lib/db';
import { aiWriteCapabilities } from './ai';
import { FONT, Field, IconWarning, focusHandlers, inputStyle } from './ui';

/**
 * Dynamic capabilities/scope editor — ShakurAdminPanel.dc.html v3:
 * a "Scope of work" describe box turns a brief into 1–6 capability cards
 * (describe → generating → generated → error, with Regenerate / Try again /
 * Add manually). Cards stay fully editable: add/remove card (1..6), per-card
 * title + description per language, checkmark bullets add/remove (1..4),
 * numbering re-normalised 01..NN automatically.
 */

export type CapabilitiesValue = { title: L10n; intro: L10n; items: Capability[] };

type CapPhase = 'idle' | 'gen' | 'done' | 'err';

const renumber = (items: Capability[]): Capability[] =>
  items.map((it, i) => ({ ...it, number: String(i + 1).padStart(2, '0') }));

const emptyCard = (): Capability => ({
  number: '01',
  title: emptyL10n(),
  description: emptyL10n(),
  bullets: [emptyL10n()],
});

const smallInput = { ...inputStyle, padding: '9px 11px', fontSize: 14 };

const IconSparkleInk = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#160C00">
    <path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9z" />
  </svg>
);

const IconSparkleOrange = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#FB8500"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2l1.9 5.1L19 9l-5.1 1.9L12 16l-1.9-5.1L5 9l5.1-1.9z" />
  </svg>
);

const IconRetrySmall = ({ size = 13 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const IconCheckOrange = ({ size = 15 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#FB8500"
    strokeWidth={2.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0 }}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconX = ({ size = 14, strokeWidth = 2.2 }: { size?: number; strokeWidth?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const IconPlusSmall = ({ size = 13 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.4}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export default function CapabilitiesEditor({
  heading,
  pageNoun,
  value,
  lang,
  onChange,
  fallbackNote,
}: {
  heading: string;
  /** 'service' | 'project' — used in the count label + describe copy. */
  pageNoun: string;
  value: CapabilitiesValue;
  lang: Lang;
  onChange: (v: CapabilitiesValue) => void;
  /** Note sent when the brief is empty (design: 'general construction and finishing works'). */
  fallbackNote: string;
}) {
  const [brief, setBrief] = useState('');
  // 'done' is the post-generation state (green banner). Pre-existing cards
  // render in 'idle' too, below the describe box, so editing is always possible.
  const [phase, setPhase] = useState<CapPhase>('idle');

  const setL10n = (l10n: L10n, text: string): L10n => ({ ...l10n, [lang]: text });

  const setItems = (items: Capability[]) => onChange({ ...value, items: renumber(items) });

  const patchItem = (i: number, patch: Partial<Capability>) =>
    onChange({
      ...value,
      items: value.items.map((it, x) => (x === i ? { ...it, ...patch } : it)),
    });

  const setBullet = (i: number, b: number, text: string) => {
    const item = value.items[i];
    patchItem(i, {
      bullets: item.bullets.map((bl, x) => (x === b ? setL10n(bl, text) : bl)),
    });
  };

  const addBullet = (i: number) => {
    if (value.items[i].bullets.length >= 4) return;
    patchItem(i, { bullets: [...value.items[i].bullets, emptyL10n()] });
  };

  const removeBullet = (i: number, b: number) => {
    const item = value.items[i];
    if (item.bullets.length <= 1) return;
    patchItem(i, { bullets: item.bullets.filter((_, x) => x !== b) });
  };

  const addCard = () => {
    if (value.items.length >= 6) return;
    setItems([...value.items, emptyCard()]);
  };

  const removeCard = (i: number) => {
    if (value.items.length <= 1) return;
    setItems(value.items.filter((_, x) => x !== i));
  };

  const generate = () => {
    setPhase('gen');
    void (async () => {
      try {
        const note = brief.trim() || fallbackNote;
        const items = await aiWriteCapabilities(note);
        setItems(items);
        setPhase('done');
      } catch {
        setPhase('err');
      }
    })();
  };

  const addManually = () => {
    if (!value.items.length) setItems([emptyCard()]);
    setPhase('done');
  };

  const n = value.items.length;
  const countLabel = `${n} ${n === 1 ? 'card' : 'cards'}`;

  const cards = (
    <>
      {value.items.map((item, i) => (
        <div
          key={i}
          style={{
            border: '1px solid #EEEDEA',
            borderRadius: 12,
            padding: 13,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            background: '#FCFBFA',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: 26,
                height: 22,
                padding: '0 7px',
                borderRadius: 6,
                background: '#FFF3E4',
                color: '#C96A00',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {String(i + 1).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={() => removeCard(i)}
              aria-label="Remove card"
              disabled={n <= 1}
              style={{
                width: 26,
                height: 26,
                border: 'none',
                background: '#F5F5F4',
                borderRadius: 7,
                cursor: n <= 1 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: n <= 1 ? '#D6D3D1' : '#A8A29E',
              }}
              onMouseEnter={(e) => {
                if (n > 1) {
                  e.currentTarget.style.background = '#FBE7E7';
                  e.currentTarget.style.color = '#D64545';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F5F5F4';
                e.currentTarget.style.color = n <= 1 ? '#D6D3D1' : '#A8A29E';
              }}
            >
              <IconX />
            </button>
          </div>
          <input
            type="text"
            value={item.title[lang]}
            onChange={(e) => patchItem(i, { title: setL10n(item.title, e.target.value) })}
            placeholder="Capability title"
            style={{
              ...smallInput,
              padding: '10px 12px',
              fontSize: 14.5,
              fontWeight: 600,
              background: '#fff',
            }}
            {...focusHandlers()}
          />
          <textarea
            value={item.description[lang]}
            onChange={(e) =>
              patchItem(i, { description: setL10n(item.description, e.target.value) })
            }
            rows={2}
            placeholder="One-line description of this capability"
            style={{
              ...smallInput,
              padding: '10px 12px',
              fontSize: 13.5,
              color: '#54504D',
              background: '#fff',
              resize: 'vertical',
              minHeight: 46,
            }}
            {...focusHandlers()}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {item.bullets.map((bl, b) => (
              <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <IconCheckOrange />
                <input
                  type="text"
                  value={bl[lang]}
                  onChange={(e) => setBullet(i, b, e.target.value)}
                  placeholder="Checkmark point"
                  style={{
                    flex: 1,
                    border: '1px solid #EEEDEA',
                    borderRadius: 8,
                    padding: '8px 10px',
                    fontSize: 13,
                    outline: 'none',
                    fontFamily: FONT,
                    color: '#160C00',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#FB8500';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(251,133,0,0.12)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#EEEDEA';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => removeBullet(i, b)}
                  aria-label="Remove point"
                  disabled={item.bullets.length <= 1}
                  style={{
                    width: 24,
                    height: 24,
                    border: 'none',
                    background: 'transparent',
                    borderRadius: 6,
                    cursor: item.bullets.length <= 1 ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: item.bullets.length <= 1 ? '#E7E5E4' : '#C7C3BF',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    if (item.bullets.length > 1) {
                      e.currentTarget.style.background = '#FBE7E7';
                      e.currentTarget.style.color = '#D64545';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color =
                      item.bullets.length <= 1 ? '#E7E5E4' : '#C7C3BF';
                  }}
                >
                  <IconX size={12} strokeWidth={2.4} />
                </button>
              </div>
            ))}
            {item.bullets.length < 4 && (
              <button
                type="button"
                onClick={() => addBullet(i)}
                style={{
                  alignSelf: 'flex-start',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#54504D',
                  fontWeight: 600,
                  fontSize: 12.5,
                  padding: '2px 0',
                  fontFamily: FONT,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#FB8500';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = '#54504D';
                }}
              >
                <IconPlusSmall />
                Add point
              </button>
            )}
          </div>
        </div>
      ))}
      {n < 6 && (
        <button
          type="button"
          onClick={addCard}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 7,
            border: '1.5px dashed #DDD9D4',
            background: '#fff',
            color: '#54504D',
            cursor: 'pointer',
            fontFamily: FONT,
            fontWeight: 600,
            fontSize: 13.5,
            padding: 11,
            borderRadius: 10,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#FB8500';
            e.currentTarget.style.color = '#FB8500';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#DDD9D4';
            e.currentTarget.style.color = '#54504D';
          }}
        >
          <IconPlusSmall size={15} />
          Add capability card
        </button>
      )}
    </>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600 }}>{heading}</span>
        <span style={{ fontSize: 12, color: '#A8A29E' }}>
          Cards on the {pageNoun} page · {countLabel}
        </span>
      </div>

      {/* section title + intro (kept from v2 — the public detail pages render them) */}
      <div style={{ display: 'flex', gap: 14 }}>
        <Field label="Section title" style={{ flex: 1 }}>
          <input
            type="text"
            value={value.title[lang]}
            onChange={(e) => onChange({ ...value, title: setL10n(value.title, e.target.value) })}
            placeholder={heading}
            style={smallInput}
            {...focusHandlers()}
          />
        </Field>
        <Field label="Section intro" style={{ flex: 1.4 }}>
          <input
            type="text"
            value={value.intro[lang]}
            onChange={(e) => onChange({ ...value, intro: setL10n(value.intro, e.target.value) })}
            placeholder="One-line intro shown under the section title"
            style={smallInput}
            {...focusHandlers()}
          />
        </Field>
      </div>

      {/* describe box (idle) */}
      {phase === 'idle' && (
        <div
          style={{
            background: '#FFF9F1',
            border: '1px solid #F0D8B8',
            borderRadius: 13,
            padding: 15,
            display: 'flex',
            flexDirection: 'column',
            gap: 11,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: '#FB8500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <IconSparkleInk />
            </span>
            <span style={{ fontSize: 13, color: '#54504D', lineHeight: 1.5 }}>
              Describe what was done on this {pageNoun}. AI turns it into capability cards — as
              many as the content needs (1–6), each with a title, description and checkmark
              points. Everything stays editable.
            </span>
          </div>
          <textarea
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
            rows={3}
            placeholder="e.g. We frame and board metal-stud partitions, tape and joint to level 4, install acoustic and fire-rated systems, and hand over a paint-ready finish coordinated with other trades."
            style={{
              border: '1px solid #F0D8B8',
              borderRadius: 10,
              padding: '11px 12px',
              fontSize: 14,
              outline: 'none',
              fontFamily: FONT,
              color: '#160C00',
              background: '#fff',
              resize: 'vertical',
              minHeight: 66,
            }}
            {...focusHandlers()}
          />
          <button
            type="button"
            onClick={generate}
            style={{
              alignSelf: 'flex-start',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              border: 'none',
              cursor: 'pointer',
              background: '#160C00',
              color: '#fff',
              fontFamily: FONT,
              fontWeight: 600,
              fontSize: 13,
              padding: '10px 16px',
              borderRadius: 9,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#2A1E10';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#160C00';
            }}
          >
            <IconSparkleOrange />
            Generate capabilities
          </button>
        </div>
      )}

      {/* generating */}
      {phase === 'gen' && (
        <div
          style={{
            border: '1px solid #F0D8B8',
            background: '#FFF9F1',
            borderRadius: 13,
            padding: 22,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <svg
            className="adm-spin"
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FB8500"
            strokeWidth={2.4}
            strokeLinecap="round"
          >
            <path d="M21 12a9 9 0 1 1-6.2-8.5" />
          </svg>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: '#C96A00' }}>
            Generating capability cards…
          </span>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="adm-skel" style={{ width: '40%', height: 14 }} />
            <div className="adm-skel" style={{ width: '90%', height: 11 }} />
            <div className="adm-skel" style={{ width: '70%', height: 11 }} />
          </div>
        </div>
      )}

      {/* error */}
      {phase === 'err' && (
        <div
          style={{
            border: '1px solid #F3D6D6',
            background: '#FDF3F3',
            borderRadius: 13,
            padding: 18,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#FBE7E7',
              color: '#D64545',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <IconWarning size={22} />
          </div>
          <div>
            <h4 style={{ margin: '0 0 3px', fontSize: 14.5, fontWeight: 700 }}>
              Couldn&apos;t generate capabilities
            </h4>
            <p style={{ margin: 0, fontSize: 13, color: '#A8A29E' }}>
              The AI request didn&apos;t come back. Try again or add cards manually.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={generate}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                border: '1px solid #E7E5E4',
                cursor: 'pointer',
                background: '#fff',
                color: '#160C00',
                fontFamily: FONT,
                fontWeight: 600,
                fontSize: 13,
                padding: '9px 15px',
                borderRadius: 9,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#FB8500';
                e.currentTarget.style.color = '#FB8500';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#E7E5E4';
                e.currentTarget.style.color = '#160C00';
              }}
            >
              <IconRetrySmall size={14} />
              Try again
            </button>
            <button
              type="button"
              onClick={addManually}
              style={{
                border: 'none',
                cursor: 'pointer',
                background: '#F5F5F4',
                color: '#160C00',
                fontFamily: FONT,
                fontWeight: 600,
                fontSize: 13,
                padding: '9px 15px',
                borderRadius: 9,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#EAEAE8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#F5F5F4';
              }}
            >
              Add manually
            </button>
          </div>
        </div>
      )}

      {/* generated banner (design capDone) */}
      {phase === 'done' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            background: '#F0FBF4',
            border: '1px solid #CDEBD9',
            borderRadius: 10,
            padding: '9px 13px',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              fontSize: 12.5,
              fontWeight: 600,
              color: '#1F8A5B',
            }}
          >
            <svg
              width={14}
              height={14}
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1F8A5B"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            AI drafted {countLabel} — edit anything below
          </span>
          <button
            type="button"
            onClick={generate}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#C96A00',
              fontWeight: 600,
              fontSize: 12.5,
              padding: 0,
              fontFamily: FONT,
            }}
          >
            <IconRetrySmall />
            Regenerate
          </button>
        </div>
      )}

      {/* cards — hidden while generating (they're about to be replaced) */}
      {phase !== 'gen' && <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>{cards}</div>}
    </div>
  );
}
