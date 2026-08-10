import { Avatar, type AvatarProps } from '@mui/material';

import competitionFallback from '../assets/default-competition.svg';
import playerFallback from '../assets/default-player.svg';
import teamFallback from '../assets/default-team.svg';

const defaults = {
  competition: competitionFallback,
  team: teamFallback,
  player: playerFallback,
};

export function EntityAvatar({
  entity,
  src,
  alt,
  ...props
}: Omit<AvatarProps, 'src'> & {
  entity: keyof typeof defaults;
  src?: string | null | undefined;
  alt: string;
}) {
  return (
    <Avatar {...props} alt={alt} src={src || defaults[entity]} imgProps={{ loading: 'lazy' }} />
  );
}
