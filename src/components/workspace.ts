import type { AuthUser } from '../types/api';

export function isWorkspaceUser(user?: AuthUser | null): boolean {
  if (!user) return false;
  const capabilities = user.capabilities;
  return Boolean(
    capabilities.accessAdmin ||
    capabilities.accessOperations ||
    capabilities.manageTeams ||
    capabilities.managePlayers ||
    capabilities.manageScoring ||
    user.roles.includes('instascore_match_official'),
  );
}
