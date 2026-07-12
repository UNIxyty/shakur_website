import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang } from '../lang';
import { ChevronDown } from './icons';
import { Reveal, RevealGroup, RevealItem } from './Reveal';

/**
 * FaqSection.dc.html
 *
 * Note the first card is styled differently on purpose: in the design it is always
 * orange with a heavier 17px label, regardless of whether it is the open one. The
 * remaining four are grey. Only the open item's answer is shown; item 0 starts open.
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
      <div className="mx-auto" style={{ maxWidth: 720 }}>
        <Reveal
          as="h2"
          id="faq-title"
          className="m-0 text-center font-semibold text-ink text-band-title"
          style={{ marginBottom: 48 }}
        >
          {t.fq_title}
        </Reveal>

        <RevealGroup className="flex flex-col" style={{ gap: 14 }} gap={0.06}>
          {items.map((item, i) => {
            const isFirst = i === 0;
            const isOpen = open === i;

            return (
              <RevealItem
                key={i}
                className="overflow-hidden"
                style={{
                  borderRadius: 14,
                  background: isFirst ? '#FB8500' : '#F5F5F4',
                  border: isFirst ? undefined : '1px solid #EAEAE8',
                }}
              >
                <h3 className="m-0">
                  <button
                    type="button"
                    onClick={() => toggle(i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    className="flex w-full cursor-pointer items-center justify-between bg-transparent border-0 text-left"
                    style={{ gap: 16, padding: '20px 24px' }}
                  >
                    <span
                      className="text-ink"
                      style={{
                        fontWeight: isFirst ? 600 : 500,
                        fontSize: isFirst ? 17 : 16,
                      }}
                    >
                      {item.q}
                    </span>
                    <motion.span
                      className="flex shrink-0"
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown
                        size={20}
                        stroke={isFirst ? '#160C00' : '#54504D'}
                        strokeWidth={isFirst ? 2.5 : 2.2}
                      />
                    </motion.span>
                  </button>
                </h3>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      id={`faq-panel-${i}`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p
                        className="m-0 font-normal"
                        style={{
                          padding: '0 24px 22px',
                          fontSize: 15,
                          lineHeight: 1.65,
                          color: isFirst ? 'rgba(22,12,0,0.78)' : '#54504D',
                        }}
                      >
                        {item.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
