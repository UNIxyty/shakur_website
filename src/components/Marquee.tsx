import { useLayoutEffect, useRef, useState } from 'react';
import type { LogoItem } from '../data';
import { assetUrl } from '../lib/assets';

/**
 * Infinite logo marquee (v3, Shakur.dc.html).
 *
 * The track holds the logo list `repeat` times twice over and translates by
 * -50%, so the loop is seamless. The repeat count is computed from the
 * measured row/track widths (not a fixed doubling) so each half-track is
 * always wider than the viewport — the marquee reads full from load with no
 * edge gaps. Hovering the row pauses it (.mq-row in index.css);
 * prefers-reduced-motion stops it outright.
 */
export default function Marquee({
  logos,
  direction,
  label,
}: {
  logos: LogoItem[];
  direction: 'left' | 'right';
  label: string;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [repeat, setRepeat] = useState(2);

  useLayoutEffect(() => {
    const row = rowRef.current;
    const track = trackRef.current;
    if (!row || !track || logos.length === 0) return;

    const measure = () => {
      const rowWidth = row.clientWidth;
      // Width of one base list (incl. its share of the 3rem gaps).
      const setWidth = track.scrollWidth / (2 * repeat);
      if (rowWidth <= 0 || setWidth <= 0) return;
      const needed = Math.max(2, Math.ceil(rowWidth / setWidth));
      if (needed !== repeat) setRepeat(needed);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(row);
    return () => ro.disconnect();
  }, [repeat, logos]);

  // One half of the track = the list repeated `repeat` times; render it twice.
  const half = Array.from({ length: repeat }, () => logos).flat();
  const doubled = [...half, ...half];

  return (
    <div>
      <p
        className="text-center m-0 font-medium uppercase text-placeholder"
        style={{ fontSize: 11, letterSpacing: '0.1em', margin: '0 0 16px' }}
      >
        {label}:
      </p>

      <div ref={rowRef} className="mq-row relative w-full overflow-hidden">
        <div
          className="absolute left-0 top-0 bottom-0 z-[2] pointer-events-none"
          style={{ width: 80, background: 'linear-gradient(to right, #fff, transparent)' }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 z-[2] pointer-events-none"
          style={{ width: 80, background: 'linear-gradient(to left, #fff, transparent)' }}
        />

        <div
          ref={trackRef}
          className={`mq-track flex items-center ${
            direction === 'left' ? 'animate-scroll-left' : 'animate-scroll-right'
          }`}
          style={{ gap: '3rem', width: 'max-content' }}
        >
          {doubled.map((lg, i) =>
            lg.img ? (
              <img
                key={`${lg.name}-${i}`}
                className="mq-logo"
                src={assetUrl(lg.img)}
                alt={lg.name}
                /* Everything past the first list is a repeat — hide it from AT. */
                aria-hidden={i >= logos.length}
              />
            ) : (
              <span key={`${lg.name}-${i}`} className="mq-txt" aria-hidden={i >= logos.length}>
                {lg.name}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
