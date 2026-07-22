/**
 * /requisites-print?v=full|compact — the print/render view.
 *
 * Two consumers, one route, so what you print and what you download are the
 * same pixels:
 *   - the admin "Useful files" Print button opens it and calls print(),
 *   - the API's Playwright renderer screenshots it for PNG/PDF.
 *
 * Deliberately outside RequireAuth: the API renders it from inside the Docker
 * network (http://web:3000) where no browser session exists. It carries only
 * the company's public invoice details (reg. nr., VAT, IBAN, office address)
 * and is marked noindex; nothing private is reachable here.
 */
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  REQUISITES_SIZES,
  RequisitesBlock,
  type RequisitesVariant,
} from '../admin/requisites/RequisitesBlock';

export default function RequisitesPrint() {
  const [params] = useSearchParams();
  const raw = params.get('v');
  const variant: RequisitesVariant = raw === 'compact' ? 'compact' : 'full';
  const { w, h } = REQUISITES_SIZES[variant];
  const autoPrint = params.get('print') === '1';
  const [ready, setReady] = useState(false);

  useEffect(() => {
    document.title = `SHAKUR rekvizīti — ${variant === 'full' ? 'pilnā' : 'kompaktā'} versija`;
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, [variant]);

  // Signal readiness only once webfonts are in — the renderer waits for this
  // flag, otherwise it can capture a frame still using fallback metrics and the
  // Latvian diacritics land on the wrong baseline.
  useEffect(() => {
    let alive = true;
    const done = () => {
      if (!alive) return;
      setReady(true);
      document.documentElement.setAttribute('data-requisites-ready', '1');
      if (autoPrint) setTimeout(() => window.print(), 150);
    };
    if (document.fonts?.ready) document.fonts.ready.then(done).catch(done);
    else done();
    return () => {
      alive = false;
    };
  }, [autoPrint]);

  return (
    <>
      <style>{`
        @page { size: ${w}px ${h}px; margin: 0; }
        html, body { margin: 0; padding: 0; background: #E7E5E4; }
        #root { margin: 0; padding: 0; }
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        @media print {
          html, body { background: #fff !important; }
          .rq-stage { padding: 0 !important; display: block !important; }
        }
      `}</style>
      <div
        className="rq-stage"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: 24,
          boxSizing: 'border-box',
        }}
      >
        {/* shadow off: it would be captured into the PNG's edges */}
        <RequisitesBlock variant={variant} shadow={false} />
      </div>
      {!ready && <span style={{ display: 'none' }}>loading</span>}
    </>
  );
}
