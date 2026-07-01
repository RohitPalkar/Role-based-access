import { useEffect } from 'react';
import { useLocation } from 'react-router';

// ----------------------------------------------------------------------

/**
 * Scrolls the window to the top on client-side route changes.
 * Must render as a descendant of the app `<Router>` (see `main.tsx`).
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
