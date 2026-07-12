import { useLang } from '../lang';
import { RevealGroup, RevealItem, Reveal } from './Reveal';

/** ProcessSteps.dc.html */
export default function ProcessSteps() {
  const { t } = useLang();

  const steps = [
    { n: 1, title: t.s1_t, desc: t.s1_d },
    { n: 2, title: t.s2_t, desc: t.s2_d },
    { n: 3, title: t.s3_t, desc: t.s3_d },
    { n: 4, title: t.s4_t, desc: t.s4_d },
  ];

  return (
    <section
      className="w-full bg-ink box-border"
      style={{ padding: '96px 30px' }}
      aria-labelledby="process-title"
    >
      <div className="mx-auto" style={{ maxWidth: 1080 }}>
        <Reveal
          as="h2"
          id="process-title"
          className="m-0 text-center font-semibold text-white text-band-title"
          style={{ marginBottom: 64 }}
        >
          {t.proc_title}
        </Reveal>

        <RevealGroup
          className="relative grid"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(210px, 100%), 1fr))',
            gap: 32,
          }}
          gap={0.1}
        >
          {/* The connecting rule, hidden below 900px in the design. */}
          <div
            className="proc-line absolute hidden nav:block"
            style={{
              top: 25,
              left: '12.5%',
              right: '12.5%',
              height: 1,
              background: 'rgba(255,255,255,0.18)',
            }}
            aria-hidden="true"
          />

          {steps.map((s) => (
            <RevealItem key={s.n} className="relative flex flex-col items-start" style={{ gap: 20 }}>
              <div
                className="flex items-center justify-center bg-white text-ink font-bold"
                style={{ width: 50, height: 50, borderRadius: '50%', fontSize: 20 }}
              >
                {s.n}
              </div>
              <h3 className="m-0 font-semibold text-white" style={{ fontSize: 19, lineHeight: 1.25 }}>
                {s.title}
              </h3>
              <p
                className="m-0 font-normal"
                style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(255,255,255,0.6)' }}
              >
                {s.desc}
              </p>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
