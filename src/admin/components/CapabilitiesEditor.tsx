import type { Capability, L10n, Lang } from '../../lib/db';
import { emptyL10n } from '../../lib/db';
import type { AiState } from './ai';
import AiAction from './AiAction';
import { FONT, Field, focusHandlers, inputStyle } from './ui';

/**
 * Capabilities/scope editor (approved design extension, styled to match the
 * drawer): per-language section title + intro, then four numbered cards with
 * title, description, and 3+ bullets per language. One "Write with AI" fills
 * the whole section in EN/LV/RU at once.
 */

export type CapabilitiesValue = { title: L10n; intro: L10n; items: Capability[] };

export function emptyCapabilityItems(): Capability[] {
  return Array.from({ length: 4 }, (_, i) => ({
    number: String(i + 1).padStart(2, '0'),
    title: emptyL10n(),
    description: emptyL10n(),
    bullets: [emptyL10n(), emptyL10n(), emptyL10n()],
  }));
}

const smallInput = { ...inputStyle, padding: '9px 11px', fontSize: 14 };

export default function CapabilitiesEditor({
  heading,
  value,
  lang,
  onChange,
  aiState,
  onAiRun,
}: {
  heading: string;
  value: CapabilitiesValue;
  lang: Lang;
  onChange: (v: CapabilitiesValue) => void;
  aiState: AiState;
  onAiRun: () => void;
}) {
  const setL10n = (l10n: L10n, text: string): L10n => ({ ...l10n, [lang]: text });

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

  const addBullet = (i: number) =>
    patchItem(i, { bullets: [...value.items[i].bullets, emptyL10n()] });

  const removeBullet = (i: number, b: number) => {
    const item = value.items[i];
    if (item.bullets.length <= 3) return;
    patchItem(i, { bullets: item.bullets.filter((_, x) => x !== b) });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
          {heading}{' '}
          <span style={{ color: '#A8A29E', fontWeight: 400 }}>
            — detail page · {lang.toUpperCase()}
          </span>
        </span>
        <AiAction state={aiState} onRun={onAiRun} />
      </div>

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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {value.items.map((item, i) => (
          <div
            key={item.number || i}
            style={{
              border: '1px solid #EAEAE8',
              borderRadius: 12,
              background: '#FAFAF9',
              padding: 14,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  background: '#FFF3E4',
                  color: '#B7791F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                {item.number || String(i + 1).padStart(2, '0')}
              </span>
              <input
                type="text"
                value={item.title[lang]}
                onChange={(e) => patchItem(i, { title: setL10n(item.title, e.target.value) })}
                placeholder={`Item ${i + 1} title`}
                style={{ ...smallInput, fontWeight: 600, background: '#fff' }}
                {...focusHandlers()}
              />
            </div>
            <input
              type="text"
              value={item.description[lang]}
              onChange={(e) =>
                patchItem(i, { description: setL10n(item.description, e.target.value) })
              }
              placeholder="Short description"
              style={{ ...smallInput, background: '#fff' }}
              {...focusHandlers()}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {item.bullets.map((bl, b) => (
                <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      background: '#FB8500',
                      flexShrink: 0,
                    }}
                  />
                  <input
                    type="text"
                    value={bl[lang]}
                    onChange={(e) => setBullet(i, b, e.target.value)}
                    placeholder={`Bullet ${b + 1}`}
                    style={{ ...smallInput, padding: '7px 10px', fontSize: 13, background: '#fff' }}
                    {...focusHandlers()}
                  />
                  <button
                    type="button"
                    onClick={() => removeBullet(i, b)}
                    aria-label="Remove bullet"
                    disabled={item.bullets.length <= 3}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      cursor: item.bullets.length <= 3 ? 'default' : 'pointer',
                      color: item.bullets.length <= 3 ? '#D6D3D1' : '#A8A29E',
                      fontSize: 15,
                      lineHeight: 1,
                      padding: 4,
                      flexShrink: 0,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addBullet(i)}
                style={{
                  alignSelf: 'flex-start',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: '#FB8500',
                  fontFamily: FONT,
                  fontWeight: 600,
                  fontSize: 12,
                  padding: '2px 0 0 13px',
                }}
              >
                + Add bullet
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
