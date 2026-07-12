import type { LogoItem } from '../data';
import { assetUrl } from '../lib/assets';

/**
 * Infinite logo marquee. The track holds the list twice and translates by -50%,
 * so the loop is seamless. Hovering the row pauses it (see .mq-row in index.css);
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
  const doubled = [...logos, ...logos];

  return (
    <div>
      <p
        className="text-center m-0 font-medium uppercase text-placeholder"
        style={{ fontSize: 11, letterSpacing: '0.1em', margin: '0 0 16px' }}
      >
        {label}:
      </p>

      <div className="mq-row relative w-full overflow-hidden">
        <div
          className="absolute left-0 top-0 bottom-0 z-[2] pointer-events-none"
          style={{ width: 80, background: 'linear-gradient(to right, #fff, transparent)' }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 z-[2] pointer-events-none"
          style={{ width: 80, background: 'linear-gradient(to left, #fff, transparent)' }}
        />

        <div
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
                /* The second half of the track is a duplicate — hide it from AT. */
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
