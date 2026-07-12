/** Shown instead of the admin UI when the Supabase env vars are absent. */
export default function SupabaseMissing() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-white text-ink"
      style={{ padding: '40px 20px' }}
    >
      <div
        className="flex flex-col"
        style={{
          maxWidth: 460,
          border: '1px solid #EAEAE8',
          borderRadius: 18,
          padding: '34px 32px',
          gap: 14,
          boxShadow: '0 14px 44px rgba(22,12,0,0.06)',
        }}
      >
        <h1 className="m-0 font-bold" style={{ fontSize: 20, letterSpacing: '-0.4px' }}>
          Admin unavailable
        </h1>
        <p className="m-0 text-muted" style={{ fontSize: 15, lineHeight: 1.6 }}>
          Supabase isn&apos;t configured, so there is nothing to sign in to. Set both
          variables in <code>.env</code> and restart the dev server (or rebuild the image):
        </p>
        <pre
          className="m-0 overflow-x-auto"
          style={{
            background: '#FAFAF9',
            border: '1px solid #EAEAE8',
            borderRadius: 10,
            padding: '14px 16px',
            fontSize: 13,
            lineHeight: 1.7,
          }}
        >
          <code>
            VITE_SUPABASE_URL=…{'\n'}
            VITE_SUPABASE_ANON_KEY=…
          </code>
        </pre>
        <p className="m-0 text-placeholder" style={{ fontSize: 13, lineHeight: 1.6 }}>
          The public site keeps working without them — it falls back to the static content.
        </p>
      </div>
    </div>
  );
}
