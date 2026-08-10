import type { Fixture, FixtureStatus } from '../../types/api';

export function formatKickoff(fixture: Fixture) {
  const date = new Date(`${fixture.kickoffAt.replace(' ', 'T')}Z`);
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function statusLabel(status: FixtureStatus) {
  return status.replace(/_/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase());
}

export function fixtureTitle(fixture: Fixture) {
  return `${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`;
}
