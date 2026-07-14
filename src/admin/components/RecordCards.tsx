import { useState, type ReactNode } from 'react';
import { bgImage } from '../../lib/assets';
import {
  GhostBtn,
  IconBtn,
  IconDuplicate,
  IconEdit,
  IconPlay,
  IconImage,
  IconRetry,
  IconTrash,
  IconWarning,
  PrimaryBtn,
  IconPlus,
  FONT,
} from './ui';

/**
 * Shared card grid for the Projects/Services views — the design mirrors the
 * two lists exactly, so the card, skeleton, error, and empty states live here.
 */

export type CardRow = {
  id: string;
  cover: string;
  coverIsVideo: boolean;
  title: string;
  summary: string;
  category: string;
  mediaCount: string;
  published: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

const GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
  gap: 20,
};

export function ListSkeleton() {
  return (
    <div style={GRID}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            background: '#FFFFFF',
            border: '1px solid #EAEAE8',
            borderRadius: 16,
            overflow: 'hidden',
          }}
        >
          <div className="adm-skel" style={{ width: '100%', aspectRatio: '16/10' }} />
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="adm-skel" style={{ width: '55%', height: 16 }} />
            <div className="adm-skel" style={{ width: '90%', height: 12 }} />
            <div className="adm-skel" style={{ width: '40%', height: 12 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListError({
  noun,
  detail,
  onRetry,
}: {
  noun: string;
  detail?: string;
  onRetry: () => void;
}) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #F3D6D6',
        borderRadius: 16,
        padding: '60px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: 16,
          background: '#FBE7E7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#D64545',
        }}
      >
        <IconWarning />
      </div>
      <div>
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>
          Couldn&apos;t load {noun}
        </h3>
        <p style={{ margin: 0, fontSize: 14, color: '#A8A29E' }}>
          {detail ?? 'Something went wrong reaching the database.'}
        </p>
      </div>
      <GhostBtn onClick={onRetry}>
        <IconRetry />
        Try again
      </GhostBtn>
    </div>
  );
}

export function ListEmpty({
  icon,
  title,
  sub,
  actionLabel,
  onAction,
}: {
  icon: ReactNode;
  title: string;
  sub: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #EAEAE8',
        borderRadius: 16,
        padding: '72px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: '#FFF3E4',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FB8500',
        }}
      >
        {icon}
      </div>
      <div>
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>{title}</h3>
        <p style={{ margin: 0, fontSize: 14, color: '#A8A29E' }}>{sub}</p>
      </div>
      {actionLabel && onAction && (
        <PrimaryBtn onClick={onAction} style={{ fontSize: 14, padding: '11px 18px' }}>
          <IconPlus size={16} />
          {actionLabel}
        </PrimaryBtn>
      )}
    </div>
  );
}

export function RecordCardGrid({
  rows,
  onReorder,
}: {
  rows: CardRow[];
  /** Indexes are positions within `rows` (the filtered view). */
  onReorder: (from: number, to: number) => void;
}) {
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  return (
    <div style={GRID}>
      {rows.map((r, i) => (
        <div
          key={r.id}
          draggable
          onDragStart={() => setDragIdx(i)}
          onDragEnd={() => setDragIdx(null)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            if (dragIdx != null && dragIdx !== i) onReorder(dragIdx, i);
            setDragIdx(null);
          }}
          className="adm-card"
          style={{
            background: '#FFFFFF',
            border: '1px solid #EAEAE8',
            borderRadius: 16,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            opacity: dragIdx === i ? 0.5 : 1,
            transition: 'box-shadow .18s ease, border-color .18s ease',
          }}
        >
          <div style={{ position: 'relative', aspectRatio: '16/10', background: '#F0EFEC' }}>
            {r.cover && (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundImage: bgImage(r.cover),
                  backgroundSize: 'cover',
                  backgroundPosition: '50% 50%',
                }}
              />
            )}
            {r.coverIsVideo && (
              <span
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%,-50%)',
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(22,12,0,0.62)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconPlay size={15} />
              </span>
            )}
            <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: r.published ? 'rgba(230,244,236,0.92)' : 'rgba(255,255,255,0.92)',
                  color: r.published ? '#1F8A5B' : '#8A8580',
                  backdropFilter: 'blur(6px)',
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: r.published ? '#1F8A5B' : '#8A8580',
                  }}
                />
                {r.published ? 'Published' : 'Draft'}
              </span>
            </div>
            <span
              style={{
                position: 'absolute',
                bottom: 12,
                right: 12,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 999,
                background: 'rgba(22,12,0,0.72)',
                color: '#fff',
              }}
            >
              <IconImage />
              {r.mediaCount}
            </span>
            <span
              title="Drag to reorder"
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                cursor: 'grab',
                width: 30,
                height: 30,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.85)',
                color: '#54504D',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15,
              }}
            >
              ⠿
            </span>
          </div>
          <div
            style={{
              padding: '18px 18px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              flex: 1,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 14 }}>
              {r.category && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    color: '#B7791F',
                  }}
                >
                  {r.category}
                </span>
              )}
            </div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: -0.2 }}>
              {r.title}
            </h3>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                lineHeight: 1.55,
                color: '#54504D',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {r.summary}
            </p>
            <div
              style={{
                marginTop: 'auto',
                paddingTop: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                borderTop: '1px solid #F2F1EF',
              }}
            >
              <button
                type="button"
                onClick={r.onToggle}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontFamily: FONT,
                  fontSize: 13,
                  fontWeight: 600,
                  color: r.published ? '#1F8A5B' : '#A8A29E',
                  padding: 0,
                }}
              >
                <span
                  role="switch"
                  aria-checked={r.published}
                  style={{
                    width: 36,
                    height: 21,
                    borderRadius: 999,
                    background: r.published ? '#1F8A5B' : '#E7E5E4',
                    position: 'relative',
                    flexShrink: 0,
                    transition: 'background .18s ease',
                    display: 'inline-block',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 3,
                      left: 3,
                      width: 15,
                      height: 15,
                      borderRadius: '50%',
                      background: '#fff',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                      transform: `translateX(${r.published ? 15 : 0}px)`,
                      transition: 'transform .18s ease',
                    }}
                  />
                </span>
                {r.published ? 'Published' : 'Draft'}
              </button>
              <div style={{ display: 'flex', gap: 6 }}>
                <IconBtn onClick={r.onEdit} label="Edit">
                  <IconEdit />
                </IconBtn>
                <IconBtn onClick={r.onDuplicate} label="Duplicate">
                  <IconDuplicate />
                </IconBtn>
                <IconBtn onClick={r.onDelete} label="Delete" danger>
                  <IconTrash />
                </IconBtn>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
