import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router';

interface Props {
  title: string;
  /** Where the back arrow goes (omit on top-level screens). */
  backTo?: string;
  centered?: boolean;
  children: ReactNode;
}

/** Page frame: header (with safe-area padding), a labelled <main>, and the document title. */
export function AppShell({ title, backTo, centered = false, children }: Props) {
  useEffect(() => {
    document.title = title === 'Flashcards' ? 'Flashcards' : `${title} · Flashcards`;
  }, [title]);

  return (
    <div className="app">
      <header className="app-header">
        {backTo ? <Link to={backTo} className="back-link" aria-label="Back">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M12 4.5L6.5 10l5.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link> : null}
        <h1>{title}</h1>
      </header>
      <main className={`app-main${centered ? ' centered' : ''}`}>{children}</main>
    </div>
  );
}
