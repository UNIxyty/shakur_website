import { useState } from 'react';
import { useLang } from '../lang';

/**
 * FaqSection.dc.html (v3 — "Help Center").
 *
 * Single-open accordion: item 0 starts open, clicking the open item closes it
 * (open: -1). The clicked item sits in a peach tray (#FBE7D3, #F7D3AE border)
 * with a solid orange head, white text and an up-chevron; closed items are a
 * #F5F5F4 tray with a white head that hovers to #FFF3E4 (via --faq-hover in
 * index.css). The answer animates with a grid-template-rows 0fr↔1fr transition.
 */
export default function FaqSection() {
  const { t } = useLang();
  const [open, setOpen] = useState(0);

  const items = [
    { q: t.q1, a: t.a1 },
    { q: t.q2, a: t.a2 },
    { q: t.q3, a: t.a3 },
    { q: t.q4, a: t.a4 },
    { q: t.q5, a: t.a5 },
  ];

  const toggle = (i: number) => setOpen((cur) => (cur === i ? -1 : i));

  return (
    <section
      className="w-full bg-white box-border"
      style={{ padding: '96px 30px' }}
      aria-labelledby="faq-title"
    >
      <div className="mx-auto" style={{ maxWidth: 820 }}>
        <h2
          id="faq-title"
          className="m-0 text-center font-bold text-ink"
          style={{ marginBottom: 40, fontSize: 'clamp(34px, 6vw, 56px)', letterSpacing: '-1.8px' }}
        >
          {t.fq_title}
        </h2>

        <div className="flex flex-col" style={{ gap: 18 }}>
          {items.map((item, i) => {
            const isOpen = open === i;

            return (
              <div
                key={i}
                style={{
                  borderRadius: 18,
                  padding: 6,
                  background: isOpen ? '#FBE7D3' : '#F5F5F4',
                  border: isOpen ? '1px solid #F7D3AE' : '1px solid #EDECEA',
                  transition: 'background .25s ease, border-color .25s ease',
                }}
              >
                <button
                  type="button"
                  onClick={() => toggle(i)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  className="faq-head flex w-full cursor-pointer items-center justify-between border-0 text-left"
                  style={
                    {
                      gap: 16,
                      padding: '20px 24px',
                      borderRadius: 13,
                      background: isOpen ? '#FB8500' : '#FFFFFF',
                      '--faq-hover': isOpen ? '#FB8500' : '#FFF3E4',
                    } as React.CSSProperties
                  }
                >
                  <span
                    className="font-bold"
                    style={{
                      fontSize: 17,
                      letterSpacing: '-0.2px',
                      color: isOpen ? '#FFFFFF' : '#160C00',
                    }}
                  >
                    {item.q}
                  </span>
                  <span
                    className="flex shrink-0 items-center justify-center"
                    style={{ width: 26, height: 26 }}
                  >
                    <svg
                      width={20}
                      height={20}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={isOpen ? '#FFFFFF' : '#160C00'}
                      strokeWidth={2.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: `rotate(${isOpen ? 180 : 0}deg)`,
                        transition: 'transform .28s cubic-bezier(0.22,1,0.36,1)',
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </button>

                <div
                  id={`faq-panel-${i}`}
                  className="grid"
                  style={{
                    gridTemplateRows: isOpen ? '1fr' : '0fr',
                    transition: 'grid-template-rows .3s cubic-bezier(0.22,1,0.36,1)',
                  }}
                >
                  <div className="overflow-hidden">
                    <p
                      className="m-0 font-normal"
                      style={{
                        padding: '18px 24px 16px',
                        fontSize: 15.5,
                        lineHeight: 1.7,
                        color: 'rgba(22,12,0,0.82)',
                      }}
                    >
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
