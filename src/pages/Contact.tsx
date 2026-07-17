import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLang } from '../lang';
import { CONTACT } from '../data';
import { Check, CheckSolid, ChevronDown, Phone, Pin } from '../components/icons';
import { Reveal, RevealGroup, RevealItem } from '../components/Reveal';
import CtaSection from '../components/CtaSection';
import BookingModal from '../components/BookingModal';
import ConsultationModal from '../components/ConsultationModal';

const inputStyle: React.CSSProperties = {
  border: '1px solid #E7E5E4',
  borderRadius: 10,
  padding: '13px 14px',
  fontSize: 15,
  background: '#fff',
};

export default function Contact() {
  const { t } = useLang();
  const [purposeOpen, setPurposeOpen] = useState(false);
  const [booking, setBooking] = useState(false);
  const [consult, setConsult] = useState(false);

  // Every field is controlled so typed data survives any re-render; the
  // purpose dropdown only ever writes its own value (v4 contract §5).
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [message, setMessage] = useState('');

  const options = [t.purpose1, t.purpose2, t.purpose3];
  const bullets = [t.cb1, t.cb2, t.cb3, t.cb4];

  return (
    <div>
      <section
        className="bg-white"
        style={{ padding: '72px 30px 96px' }}
        aria-labelledby="contact-title"
      >
        <div className="mx-auto" style={{ maxWidth: 1180 }}>
          <Reveal
            as="h1"
            id="contact-title"
            className="m-0 text-center font-serif font-bold text-page-title"
            style={{ marginBottom: 60 }}
          >
            {t.contact_page_title}
          </Reveal>

          <div className="flex flex-wrap items-start" style={{ gap: 56 }}>
            {/* ---------- FORM ---------- */}
            <Reveal
              as="form"
              onSubmit={(e: React.FormEvent) => e.preventDefault()}
              className="m-cardpad flex flex-col bg-surface-alt"
              style={{
                flex: 1,
                minWidth: 280,
                border: '1px solid #EEEDEA',
                borderRadius: 18,
                padding: 34,
                gap: 18,
              }}
            >
              <label className="flex flex-col font-medium" style={{ gap: 8, fontSize: 14 }}>
                {t.c_name}
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.ph_name}
                  autoComplete="name"
                  className="outline-none"
                  style={inputStyle}
                />
              </label>

              <label className="flex flex-col font-medium" style={{ gap: 8, fontSize: 14 }}>
                {t.c_email}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.ph_cemail}
                  autoComplete="email"
                  className="outline-none"
                  style={inputStyle}
                />
              </label>

              <label className="flex flex-col font-medium" style={{ gap: 8, fontSize: 14 }}>
                {t.c_phone}
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t.ph_cphone}
                  autoComplete="tel"
                  className="outline-none"
                  style={inputStyle}
                />
              </label>

              {/* Custom select — a native <select> can't carry the design's menu styling. */}
              <div className="flex flex-col font-medium" style={{ gap: 8, fontSize: 14 }}>
                <span id="purpose-label">{t.c_purpose}</span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setPurposeOpen((v) => !v)}
                    aria-haspopup="listbox"
                    aria-expanded={purposeOpen}
                    aria-labelledby="purpose-label"
                    className="flex w-full cursor-pointer items-center justify-between bg-white text-left transition-colors hover:border-stone"
                    style={{ ...inputStyle, gap: 10 }}
                  >
                    <span style={{ color: purpose ? '#160C00' : '#A8A29E' }}>
                      {purpose || t.ph_purpose}
                    </span>
                    <ChevronDown size={18} />
                  </button>

                  <AnimatePresence>
                    {purposeOpen && (
                      <>
                        <div
                          onClick={() => setPurposeOpen(false)}
                          className="fixed inset-0"
                          style={{ zIndex: 40 }}
                        />
                        <motion.div
                          role="listbox"
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.18 }}
                          className="absolute flex flex-col bg-white"
                          style={{
                            top: 'calc(100% + 6px)',
                            left: 0,
                            right: 0,
                            zIndex: 50,
                            border: '1px solid #E7E5E4',
                            borderRadius: 12,
                            boxShadow: '0 18px 44px rgba(22,12,0,0.16)',
                            padding: 6,
                            gap: 2,
                          }}
                        >
                          {options.map((op) => (
                            <button
                              key={op}
                              type="button"
                              role="option"
                              aria-selected={purpose === op}
                              onClick={() => {
                                setPurpose(op);
                                setPurposeOpen(false);
                              }}
                              className="flex cursor-pointer items-center justify-between border-0 bg-transparent text-left font-medium text-ink transition-colors hover:bg-surface"
                              style={{ gap: 10, fontSize: 15, padding: '11px 12px', borderRadius: 8 }}
                            >
                              <span>{op}</span>
                              {purpose === op && <Check size={17} />}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <label className="flex flex-col font-medium" style={{ gap: 8, fontSize: 14 }}>
                {t.c_message}
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={t.ph_cmessage}
                  className="outline-none"
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: "'Inter', sans-serif" }}
                />
              </label>

              <div className="flex" style={{ gap: 14, marginTop: 4 }}>
                <div className="flex flex-1 flex-col items-center" style={{ gap: 5 }}>
                  <motion.button
                    type="button"
                    onClick={() => setConsult(true)}
                    whileTap={{ scale: 0.98 }}
                    className="w-full cursor-pointer border-0 bg-orange text-ink font-semibold transition-colors hover:bg-orange-hover"
                    style={{ fontSize: 15, padding: 14, borderRadius: 10 }}
                  >
                    {t.nav_cta}
                  </motion.button>
                  <span className="text-placeholder" style={{ fontSize: 12 }}>
                    {t.sub_email}
                  </span>
                </div>

                <div className="flex flex-1 flex-col items-center" style={{ gap: 5 }}>
                  <motion.button
                    type="button"
                    onClick={() => setBooking(true)}
                    whileTap={{ scale: 0.98 }}
                    className="w-full cursor-pointer bg-transparent font-semibold text-orange transition-colors"
                    style={{
                      border: '1.5px solid #FB8500',
                      fontSize: 15,
                      padding: 14,
                      borderRadius: 10,
                    }}
                  >
                    {t.form_book}
                  </motion.button>
                  <span className="text-placeholder" style={{ fontSize: 12 }}>
                    {t.sub_book}
                  </span>
                </div>
              </div>
            </Reveal>

            {/* ---------- INFO ---------- */}
            <RevealGroup
              className="flex flex-col"
              style={{ flex: 1, minWidth: 260, gap: 26 }}
              gap={0.08}
            >
              <RevealItem
                as="h2"
                className="m-0 font-semibold"
                style={{ fontSize: 26, letterSpacing: '-0.5px', lineHeight: 1.2 }}
              >
                {t.c_info_title}
              </RevealItem>

              <RevealItem as="p" className="m-0 text-muted" style={{ fontSize: 15, lineHeight: 1.65 }}>
                {t.c_info_body}
              </RevealItem>

              <RevealItem
                className="flex flex-col bg-surface"
                style={{
                  border: '1px solid #EAEAE8',
                  borderRadius: 14,
                  padding: 24,
                  gap: 14,
                }}
              >
                {bullets.map((b) => (
                  <div key={b} className="flex items-center" style={{ gap: 11, fontSize: 15 }}>
                    <CheckSolid size={20} />
                    {b}
                  </div>
                ))}
              </RevealItem>

              <RevealItem className="flex flex-wrap" style={{ gap: 40 }}>
                <div className="flex flex-col" style={{ gap: 8 }}>
                  <div
                    className="flex items-center font-semibold"
                    style={{ gap: 8, fontSize: 16 }}
                  >
                    <Pin size={18} strokeWidth={2.2} />
                    {t.find_us}
                  </div>
                  <address
                    className="not-italic text-muted"
                    style={{ fontSize: 15, lineHeight: 1.5 }}
                  >
                    {CONTACT.address[0]}
                    <br />
                    {CONTACT.address[1]}
                  </address>
                </div>

                <div className="flex flex-col" style={{ gap: 8 }}>
                  <div
                    className="flex items-center font-semibold"
                    style={{ gap: 8, fontSize: 16 }}
                  >
                    <Phone size={18} />
                    {t.reach_us}
                  </div>
                  <span className="text-muted" style={{ fontSize: 15, lineHeight: 1.6 }}>
                    <a href={`mailto:${CONTACT.email}`} className="text-muted hover:text-orange">
                      {CONTACT.email}
                    </a>
                    <br />
                    <a
                      href={`tel:${CONTACT.phone.replace(/[^+0-9]/g, '')}`}
                      className="text-muted hover:text-orange"
                    >
                      {CONTACT.phone}
                    </a>
                  </span>
                </div>
              </RevealItem>
            </RevealGroup>
          </div>
        </div>
      </section>

      <CtaSection />

      <AnimatePresence>
        {booking && <BookingModal onClose={() => setBooking(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {consult && (
          <ConsultationModal
            onClose={() => setConsult(false)}
            initialName={name}
            initialEmail={email}
            initialPhone={phone}
            initialMessage={
              purpose ? (message ? `«${purpose}» — ${message}` : purpose) : message
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}
