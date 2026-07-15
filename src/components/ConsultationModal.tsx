import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useLang } from '../lang';
import { Check, Close } from './icons';
import { pop } from '../motion';

type Status = 'idle' | 'submitting' | 'success' | 'error';

/**
 * Consultation lead-capture modal — ported from the consult* overlay in
 * Shakur.dc.html. Pre-fills email/phone from the hero form, walks
 * idle → submitting → success/error, and POSTs /api/consultations.
 * Error keeps the entered values so "Try again" just re-submits.
 */
export default function ConsultationModal({
  onClose,
  initialEmail = '',
  initialPhone = '',
}: {
  onClose: () => void;
  initialEmail?: string;
  initialPhone?: string;
}) {
  const { t, lang } = useLang();

  const [status, setStatus] = useState<Status>('idle');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState(initialPhone);
  const [email, setEmail] = useState(initialEmail);
  const [msg, setMsg] = useState('');
  const [fieldErr, setFieldErr] = useState('');

  const submitting = status === 'submitting';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const submit = async () => {
    if (!name.trim() || !phone.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setFieldErr(t.consult_err_fields);
      return;
    }
    setStatus('submitting');
    setFieldErr('');
    try {
      const res = await fetch('/api/consultations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          message: msg.trim(),
          locale: lang,
        }),
      });
      if (!res.ok) throw new Error(`consultations ${res.status}`);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  const inputStyle: React.CSSProperties = {
    border: '1px solid #E7E5E4',
    borderRadius: 10,
    padding: '12px 13px',
    fontSize: 15,
    background: '#FAFAF9',
  };

  const points = [t.consult_pt1, t.consult_pt2, t.consult_pt3];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 9999, background: 'rgba(10,7,4,0.6)', padding: 16 }}
      role="dialog"
      aria-modal="true"
      aria-label={t.consult_form_title}
    >
      <motion.div
        variants={pop}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="relative flex overflow-hidden bg-white"
        style={{
          borderRadius: 18,
          width: '100%',
          maxWidth: 780,
          maxHeight: '94vh',
          boxShadow: '0 30px 80px rgba(0,0,0,0.42)',
        }}
      >
        {/* Left panel — kicker / title / blurb / value points */}
        <div
          className="consult-aside flex shrink-0 flex-col bg-ink text-white"
          style={{ width: 272, padding: '32px 28px', gap: 20 }}
        >
          <img
            src="/images/shakur-logo.svg"
            alt="SHAKUR"
            className="self-start"
            style={{ height: 19, width: 'auto', filter: 'brightness(0) invert(1)' }}
          />
          <div className="flex flex-col" style={{ gap: 7 }}>
            <span
              className="font-semibold uppercase"
              style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em' }}
            >
              {t.consult_kicker}
            </span>
            <h3
              className="m-0 font-serif font-bold"
              style={{ fontSize: 32, lineHeight: 1.04, letterSpacing: '-0.5px' }}
            >
              {t.consult_title}
            </h3>
          </div>
          <p className="m-0" style={{ fontSize: 14, lineHeight: 1.65, color: 'rgba(255,255,255,0.72)' }}>
            {t.consult_blurb}
          </p>
          <div className="flex flex-col" style={{ marginTop: 'auto', gap: 13 }}>
            {points.map((pt) => (
              <div
                key={pt}
                className="flex items-center"
                style={{ gap: 10, fontSize: 13.5, color: 'rgba(255,255,255,0.82)' }}
              >
                <Check size={17} strokeWidth={2.4} />
                {pt}
              </div>
            ))}
          </div>
        </div>

        {/* Right panel — form / success */}
        <div className="relative flex-1 overflow-y-auto" style={{ minWidth: 0, padding: '26px 30px' }}>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute flex cursor-pointer items-center justify-center border-0 text-muted transition-colors hover:bg-border-card"
            style={{
              top: 16,
              right: 16,
              width: 34,
              height: 34,
              background: '#F5F5F4',
              borderRadius: 9,
              zIndex: 3,
            }}
          >
            <Close size={18} stroke="currentColor" />
          </button>

          {status !== 'success' ? (
            <>
              <h3
                className="m-0 font-bold"
                style={{ margin: '0 6px 4px 0', fontSize: 20, letterSpacing: '-0.4px' }}
              >
                {t.consult_form_title}
              </h3>
              <p className="m-0 text-muted" style={{ marginBottom: 20, fontSize: 14 }}>
                {t.consult_form_sub}
              </p>

              {status === 'error' && (
                <div
                  role="alert"
                  className="flex items-start"
                  style={{
                    gap: 11,
                    background: '#FBE7E7',
                    border: '1px solid #F3D0D0',
                    borderRadius: 12,
                    padding: '13px 15px',
                    marginBottom: 16,
                  }}
                >
                  <svg
                    width={18}
                    height={18}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#D64545"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0"
                    style={{ marginTop: 1 }}
                  >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <div className="flex flex-col" style={{ gap: 2 }}>
                    <span className="font-bold" style={{ fontSize: 13.5, color: '#A83232' }}>
                      {t.consult_err_title}
                    </span>
                    <span style={{ fontSize: 13, color: '#B85555', lineHeight: 1.5 }}>
                      {t.consult_err_msg}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex flex-col" style={{ gap: 14 }}>
                <div className="flex flex-wrap" style={{ gap: 12 }}>
                  <label
                    className="flex flex-col font-semibold"
                    style={{ flex: 1, minWidth: 150, gap: 7, fontSize: 13 }}
                  >
                    {t.consult_name}
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setFieldErr('');
                      }}
                      disabled={submitting}
                      placeholder={t.consult_ph_name}
                      className="outline-none"
                      style={inputStyle}
                    />
                  </label>
                  <label
                    className="flex flex-col font-semibold"
                    style={{ flex: 1, minWidth: 150, gap: 7, fontSize: 13 }}
                  >
                    {t.consult_phone}
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        setFieldErr('');
                      }}
                      disabled={submitting}
                      placeholder={t.ph_phone}
                      className="outline-none"
                      style={inputStyle}
                    />
                  </label>
                </div>

                <label className="flex flex-col font-semibold" style={{ gap: 7, fontSize: 13 }}>
                  {t.consult_email}
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setFieldErr('');
                    }}
                    disabled={submitting}
                    placeholder={t.ph_email}
                    className="outline-none"
                    style={inputStyle}
                  />
                </label>

                <label className="flex flex-col font-semibold" style={{ gap: 7, fontSize: 13 }}>
                  {t.consult_msg}
                  <textarea
                    value={msg}
                    onChange={(e) => {
                      setMsg(e.target.value);
                      setFieldErr('');
                    }}
                    disabled={submitting}
                    rows={3}
                    placeholder={t.consult_ph_msg}
                    className="outline-none"
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 74 }}
                  />
                </label>

                {fieldErr && (
                  <span role="alert" style={{ fontSize: 13, color: '#D64545' }}>
                    {fieldErr}
                  </span>
                )}

                <button
                  onClick={submit}
                  disabled={submitting}
                  className="flex cursor-pointer items-center justify-center border-0 bg-orange text-ink font-semibold transition-colors hover:bg-orange-hover"
                  style={{ marginTop: 2, gap: 9, fontSize: 15, padding: 14, borderRadius: 11 }}
                >
                  {submitting && (
                    <svg
                      width={16}
                      height={16}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#160C00"
                      strokeWidth={2.6}
                      strokeLinecap="round"
                      className="animate-spin"
                    >
                      <path d="M21 12a9 9 0 1 1-6.2-8.5" />
                    </svg>
                  )}
                  {submitting
                    ? t.consult_sending
                    : status === 'error'
                      ? t.consult_retry
                      : t.consult_submit}
                </button>
              </div>
            </>
          ) : (
            <div
              className="flex flex-col items-center justify-center text-center"
              style={{ gap: 16, minHeight: 340, padding: 20 }}
            >
              <div
                className="flex items-center justify-center"
                style={{ width: 66, height: 66, borderRadius: '50%', background: '#E6F4EC' }}
              >
                <Check size={32} stroke="#1F8A5B" strokeWidth={2.6} />
              </div>
              <h3 className="m-0 font-bold" style={{ fontSize: 22, letterSpacing: '-0.5px' }}>
                {t.consult_done_title}
              </h3>
              <p className="m-0 text-muted" style={{ fontSize: 15, lineHeight: 1.6, maxWidth: 360 }}>
                {t.consult_done_msg.replace('{name}', name).replace('{email}', email)}
              </p>
              <button
                onClick={onClose}
                className="cursor-pointer border-0 bg-ink text-white font-semibold transition-colors hover:bg-[#2A1E10]"
                style={{ fontSize: 15, padding: '13px 30px', borderRadius: 11 }}
              >
                {t.consult_done_btn}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
