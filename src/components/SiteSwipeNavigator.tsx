import { Box, useMediaQuery } from '@mui/material';
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';

const routes = [
  '/',
  '/scores',
  '/fixtures',
  '/results',
  '/standings',
  '/competitions',
  '/news',
  '/more',
];

export function SiteSwipeNavigator() {
  const mobile = useMediaQuery('(max-width:767px)');
  const location = useLocation();
  const navigate = useNavigate();
  const start = useRef<{ x: number; y: number } | null>(null);

  if (!mobile) return null;
  const current = Math.max(
    0,
    routes.findIndex((path) =>
      path === '/' ? location.pathname === '/' : location.pathname.startsWith(path),
    ),
  );
  const previous = current > 0 ? routes[current - 1] : null;
  const next = current < routes.length - 1 ? routes[current + 1] : null;

  useEffect(() => {
    if (!mobile) return;
    const onStart = (event: TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, button, a, [data-no-page-swipe]')) return;
      const touch = event.touches[0];
      if (touch) start.current = { x: touch.clientX, y: touch.clientY };
    };
    const onEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0];
      if (!touch || !start.current) return;
      const dx = touch.clientX - start.current.x;
      const dy = touch.clientY - start.current.y;
      start.current = null;
      if (Math.abs(dx) < 90 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      if (dx > 0 && previous) void navigate(previous);
      if (dx < 0 && next) void navigate(next);
    };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
    };
  }, [mobile, navigate, next, previous]);

  return (
    <Box className="instascore-site-swipe" aria-hidden="true">
      {previous && <Box className="instascore-swipe-edge is-left">‹</Box>}
      {next && <Box className="instascore-swipe-edge is-right">›</Box>}
    </Box>
  );
}
