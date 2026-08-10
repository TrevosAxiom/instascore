import type { ReactNode } from 'react';

type NavigationIconName = 'scores' | 'fixtures' | 'results' | 'tables' | 'more';

const paths: Record<NavigationIconName, ReactNode> = {
  scores: (
    <>
      <path d="M5 4v16" />
      <path d="M5 5h11l-2.5 4L16 13H5" />
    </>
  ),
  fixtures: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M8 3v4M16 3v4M3 10h18M8 14h3M14 14h2M8 18h3" />
    </>
  ),
  results: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.6 2.6L16.5 9" />
    </>
  ),
  tables: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M4 9h16M4 15h16M10 3v18" />
    </>
  ),
  more: (
    <>
      <rect x="4" y="4" width="5" height="5" rx="1" />
      <rect x="15" y="4" width="5" height="5" rx="1" />
      <rect x="4" y="15" width="5" height="5" rx="1" />
      <rect x="15" y="15" width="5" height="5" rx="1" />
    </>
  ),
};

export function NavigationIcon({ name }: { name: NavigationIconName }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
