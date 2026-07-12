import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import SupabaseMissing from './SupabaseMissing';

const inputStyle: React.CSSProperties = {
  border: '1px solid #E7E5E4',
  borderRadius: 10,
  padding: '13px 14px',
  fontSize: 15,
  outline: 'none',
  background: '#FAFAF9',
  fontFamily: "'Inter', sans-serif",
};

/** ShakurAdminLogin.dc.html */
export default function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');

  // Already signed in? Skip the form.
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/admin', { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  if (!supabase) return <SupabaseMissing />;
  const client = supabase;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    const { error: authError } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setBusy(false);
    if (authError) {
      setError('Invalid email or password');
      return;
    }
    navigate('/admin', { replace: true });
  };

  const google = async () => {
    const { error: oauthError } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/admin` },
    });
    // Supabase errors here when the Google provider isn't enabled on the project.
    if (oauthError) setToast('Google OAuth not configured yet');
  };

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-white text-ink"
      style={{ gap: 20, padding: '40px 20px' }}
    >
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col"
        style={{
          width: 420,
          maxWidth: '100%',
          border: '1px solid #EAEAE8',
          borderRadius: 18,
          padding: '38px 34px',
          gap: 20,
          boxShadow: '0 14px 44px rgba(22,12,0,0.06)',
        }}
      >
        <div className="flex flex-col items-center text-center" style={{ gap: 12 }}>
          <img
            src="/images/shakur-logo.svg"
            alt="SHAKUR"
            style={{ height: 22, width: 'auto', filter: 'brightness(0)' }}
          />
          <div className="flex flex-col" style={{ gap: 4, marginTop: 6 }}>
            <h1 className="m-0" style={{ fontSize: 20, fontWeight: 500 }}>
              Admin Login
            </h1>
            <p className="m-0 text-placeholder" style={{ fontSize: 14 }}>
              Sign in to manage your website
            </p>
          </div>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              role="alert"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center font-medium"
              style={{
                gap: 9,
                background: '#FBE7E7',
                color: '#D64545',
                fontSize: 14,
                padding: '11px 14px',
                borderRadius: 10,
              }}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#D64545"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0 }}
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <label className="flex flex-col font-semibold" style={{ gap: 7, fontSize: 13 }}>
          Email
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError('');
            }}
            placeholder="admin@shakur.lv"
            style={inputStyle}
          />
        </label>

        <div className="flex flex-col" style={{ gap: 7 }}>
          <label htmlFor="admin-pw" className="font-semibold" style={{ fontSize: 13 }}>
            Password
          </label>
          <div className="relative flex items-center">
            <input
              id="admin-pw"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              placeholder="••••••••"
              style={{ ...inputStyle, width: '100%', padding: '13px 44px 13px 14px' }}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Hide password' : 'Show password'}
              className="absolute flex cursor-pointer items-center justify-center border-0 bg-transparent text-placeholder hover:text-muted"
              style={{ right: 6, width: 34, height: 34 }}
            >
              {showPw ? (
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg
                  width="19"
                  height="19"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={() =>
              setToast('Password resets are managed in Supabase → Authentication → Users')
            }
            className="cursor-pointer self-end border-0 bg-transparent font-medium text-orange hover:text-orange-hover"
            style={{ fontSize: 13, padding: 0 }}
          >
            Forgot password?
          </button>
        </div>

        <motion.button
          type="submit"
          disabled={busy}
          whileTap={{ scale: 0.985 }}
          className="w-full cursor-pointer border-0 bg-orange text-ink font-semibold transition-colors hover:bg-orange-hover disabled:opacity-60"
          style={{ fontSize: 15, padding: 14, borderRadius: 11 }}
        >
          {busy ? 'Signing in…' : 'Sign In'}
        </motion.button>

        <div className="flex items-center" style={{ gap: 14, color: '#C7C3BF' }}>
          <div style={{ flex: 1, height: 1, background: '#EAEAE8' }} />
          <span className="text-placeholder" style={{ fontSize: 13 }}>
            or
          </span>
          <div style={{ flex: 1, height: 1, background: '#EAEAE8' }} />
        </div>

        <button
          type="button"
          onClick={google}
          className="flex w-full cursor-pointer items-center justify-center bg-white text-ink font-semibold transition-colors hover:bg-surface-alt"
          style={{
            border: '1px solid #E7E5E4',
            fontSize: 15,
            padding: 13,
            borderRadius: 11,
            gap: 11,
          }}
        >
          <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true">
            <path
              fill="#EA4335"
              d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
            />
            <path
              fill="#4285F4"
              d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
            />
            <path
              fill="#FBBC05"
              d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
            />
            <path
              fill="#34A853"
              d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
            />
          </svg>
          Continue with Google
        </button>
      </motion.form>

      <p className="m-0 text-center text-placeholder" style={{ fontSize: 13 }}>
        Restricted access. Authorized personnel only.
      </p>

      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.25 }}
            className="fixed font-medium text-white"
            style={{
              bottom: 34,
              left: '50%',
              x: '-50%',
              background: '#160C00',
              fontSize: 14,
              padding: '13px 20px',
              borderRadius: 11,
              boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
              zIndex: 200,
              maxWidth: '90vw',
              textAlign: 'center',
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
