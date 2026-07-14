import { createContext, useContext } from 'react';

/**
 * Shell context for the admin panel. The AdminPanel shell owns toasts, the
 * global confirm modal, the top-bar search box, and the sidebar's upcoming-
 * meetings badge; views consume them through this context.
 */

export type ConfirmOptions = {
  title: string;
  message: string;
  /** Destructive button label, e.g. 'Delete' / 'Cancel it'. */
  label: string;
};

export type AdminShell = {
  /** Bottom-right toast, auto-dismissed after 3200 ms (design timing). */
  toast: (msg: string) => void;
  /** Global confirm modal for destructive actions. Resolves true on confirm. */
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  /** Top-bar search box value (cleared by the shell on view change). */
  search: string;
  /** Views override the top-bar subtitle with live counts. */
  setSubtitle: (subtitle: string | null) => void;
  /** Re-count scheduled meetings for the sidebar badge. */
  refreshUpcoming: () => void;
};

export const AdminShellContext = createContext<AdminShell | null>(null);

export function useAdminShell(): AdminShell {
  const ctx = useContext(AdminShellContext);
  if (!ctx) throw new Error('useAdminShell must be used inside <AdminPanel>');
  return ctx;
}
