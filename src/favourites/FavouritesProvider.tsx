import { useEffect, type PropsWithChildren } from 'react';

import { useApi } from '../api/context';
import { useAuth } from '../app/auth-context';
import { clearLocalFavourites, readLocalFavourites } from './localFavourites';

export function FavouritesProvider({ children }: PropsWithChildren) {
  const api = useApi();
  const { state } = useAuth();
  const userUuid = state?.user?.uuid ?? '';

  useEffect(() => {
    if (!userUuid) {
      return;
    }
    const favourites = readLocalFavourites();
    if (!favourites.length) {
      return;
    }
    void api.mergeAnonymousFavourites(favourites).then(() => clearLocalFavourites());
  }, [api, userUuid]);

  return children;
}
