import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import SupabaseMissing from './SupabaseMissing';

/**
 * Gate for /admin. `undefined` means the session is still resolving — we render a
 * blank shell rather than the login screen, so a signed-in reload doesn't flash it.
 */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  if (!supabase) return <SupabaseMissing />;

  if (session === undefined) {
    return <div className="min-h-screen bg-surface" aria-busy="true" />;
  }

  if (!session) return <Navigate to="/admin/login" replace />;

  return <>{children}</>;
}
