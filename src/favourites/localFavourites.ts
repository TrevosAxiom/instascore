import type { Favourite, FavouriteEntityType } from '../types/api';

const key = 'instascore-anonymous-favourites';
const anonKey = 'instascore-anonymous-id';

export function anonymousId() {
  const existing = localStorage.getItem(anonKey);
  if (existing) {
    return existing;
  }
  const created = crypto.randomUUID();
  localStorage.setItem(anonKey, created);
  return created;
}

export function readLocalFavourites(): Favourite[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as Favourite[];
  } catch {
    return [];
  }
}

export function writeLocalFavourites(favourites: Favourite[]) {
  localStorage.setItem(key, JSON.stringify(favourites));
}

export function clearLocalFavourites() {
  localStorage.removeItem(key);
}

export function toggleLocalFavourite(entityType: FavouriteEntityType, entityUuid: string) {
  anonymousId();
  const current = readLocalFavourites();
  const exists = current.some(
    (item) => item.entityType === entityType && item.entityUuid === entityUuid,
  );
  const next = exists
    ? current.filter((item) => item.entityType !== entityType || item.entityUuid !== entityUuid)
    : [...current, { entityType, entityUuid, source: 'anonymous' }];
  writeLocalFavourites(next);
  return next;
}
