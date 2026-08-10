export function publicSportName(sport: { slug?: string; name?: string } | null | undefined) {
  if (sport?.slug === 'football') return 'Soccer';
  return sport?.name ?? '';
}
