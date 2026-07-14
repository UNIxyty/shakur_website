import type { AiState } from './ai';
import { FONT, IconSparkle } from './ui';

/**
 * "Write with AI" control — the four states from ShakurAdminPanel.dc.html:
 * idle (peach pill button) → gen (spinner, "Writing EN·LV·RU…") →
 * done (green check "AI filled all 3" + Regenerate) → err (Failed + Retry).
 */
export default function AiAction({ state, onRun }: { state: AiState; onRun: () => void }) {
  if (state === 'gen') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: '#C96A00',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        <svg
          className="adm-spin"
          width={13}
          height={13}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FB8500"
          strokeWidth={2.4}
          strokeLinecap="round"
        >
          <path d="M21 12a9 9 0 1 1-6.2-8.5" />
        </svg>
        Writing EN·LV·RU…
      </span>
    );
  }

  const linkBtn = (label: string) => (
    <button
      type="button"
      onClick={onRun}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#FB8500',
        fontWeight: 600,
        fontSize: 12,
        padding: 0,
        fontFamily: FONT,
      }}
    >
      {label}
    </button>
  );

  if (state === 'done') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            color: '#1F8A5B',
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <svg
            width={12}
            height={12}
            viewBox="0 0 24 24"
            fill="none"
            stroke="#1F8A5B"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          AI filled all 3
        </span>
        {linkBtn('Regenerate')}
      </span>
    );
  }

  if (state === 'err') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#D64545', fontSize: 12, fontWeight: 600 }}>Failed</span>
        {linkBtn('Retry')}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onRun}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        border: '1px solid #F0D8B8',
        background: '#FFF9F1',
        color: '#C96A00',
        cursor: 'pointer',
        fontFamily: FONT,
        fontWeight: 600,
        fontSize: 12,
        padding: '4px 9px',
        borderRadius: 7,
      }}
    >
      <IconSparkle />
      Write with AI
    </button>
  );
}
