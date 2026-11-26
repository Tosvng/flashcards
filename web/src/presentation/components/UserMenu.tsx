import { useEffect, useRef, useState } from 'react';
import { useOptionalAuth } from '../../application/auth/AuthProvider';

/** Account icon for the header's top right; opens a dropdown with "Sign out". Hidden when signed out. */
export function UserMenu() {
  const auth = useOptionalAuth();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!auth || auth.status !== 'signedIn') return null;

  return (
    <div className="user-menu" ref={root}>
      <button
        type="button"
        className="user-menu-trigger"
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
          <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {open ? (
        <div className="user-menu-list" role="menu">
          <button type="button" role="menuitem" className="user-menu-item" onClick={() => void auth.signOut()}>
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
