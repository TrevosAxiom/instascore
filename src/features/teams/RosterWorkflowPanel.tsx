import { Alert, Button, Chip, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { useApi } from '../../api/context';
import { useAuth } from '../../app/auth-context';
import { LoadingState } from '../../components/AsyncStates';

export function RosterWorkflowPanel() {
  const api = useApi();
  const auth = useAuth();
  const client = useQueryClient();
  const workspace = useQuery({ queryKey: ['roster-workspace'], queryFn: api.getRosterWorkspace });
  const players = useQuery({
    queryKey: ['players', 'roster-options'],
    queryFn: () => api.getPlayers(new URLSearchParams({ per_page: '50' })),
  });
  const allTeams = useQuery({
    queryKey: ['teams', 'roster-destinations'],
    queryFn: () => api.getTeams(new URLSearchParams({ per_page: '50' })),
  });
  const competitions = useQuery({
    queryKey: ['competitions', 'roster-options'],
    queryFn: () => api.getCompetitions(new URLSearchParams({ per_page: '50' })),
  });
  const [requestType, setRequestType] = useState('register');
  const [teamUuid, setTeamUuid] = useState('');
  const [targetTeamUuid, setTargetTeamUuid] = useState('');
  const [playerUuid, setPlayerUuid] = useState('');
  const [seasonUuid, setSeasonUuid] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [positionCode, setPositionCode] = useState('');
  const [notes, setNotes] = useState('');
  const [eligibilityStatus, setEligibilityStatus] = useState('eligible');
  const competitionDetails = useQueries({
    queries: (competitions.data?.items ?? []).map((competition) => ({
      queryKey: ['competition', competition.uuid, 'roster-options'],
      queryFn: () => api.getCompetition(competition.uuid),
    })),
  });
  const seasons = useMemo(() => {
    const unique = new Map<string, { uuid: string; name: string }>();
    competitionDetails.forEach((query) =>
      (query.data?.seasons ?? []).forEach((season) => unique.set(season.uuid, season)),
    );
    return [...unique.values()];
  }, [competitionDetails]);
  const refresh = () => void client.invalidateQueries({ queryKey: ['roster-workspace'] });
  const submit = useMutation({
    mutationFn: () =>
      api.submitRosterRequest({
        requestType,
        teamUuid,
        targetTeamUuid,
        playerUuid,
        seasonUuid,
        jerseyNumber,
        positionCode,
        eligibilityStatus: requestType === 'eligibility' ? eligibilityStatus : 'eligible',
        notes,
      }),
    onSuccess: () => {
      setPlayerUuid('');
      setJerseyNumber('');
      setNotes('');
      refresh();
    },
  });
  const review = useMutation({
    mutationFn: ({ uuid, decision }: { uuid: string; decision: 'approve' | 'reject' }) =>
      api.reviewRosterRequest(uuid, decision),
    onSuccess: refresh,
  });
  if (workspace.isLoading) return <LoadingState label="Loading team workspace" />;
  if (workspace.isError)
    return <Alert severity="error">The roster workspace could not be loaded.</Alert>;
  const teams = workspace.data?.teams ?? [];
  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
        {teams.map((team) => (
          <Paper key={team.uuid} variant="outlined" sx={{ p: 2, flex: 1 }}>
            <Typography fontWeight={900}>{team.name}</Typography>
            <Typography color="text.secondary" variant="body2">
              {team.sportName} · {team.rosterCount} active players
            </Typography>
          </Paper>
        ))}
      </Stack>
      {!teams.length && <Alert severity="warning">No team is assigned to this account.</Alert>}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h3">Submit a roster change</Typography>
          <Typography color="text.secondary">
            Registrations, transfers, releases and eligibility changes remain pending until league
            approval.
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
            <TextField
              select
              label="Action"
              value={requestType}
              onChange={(event) => setRequestType(event.target.value)}
              sx={{ minWidth: 170 }}
            >
              <MenuItem value="register">Register player</MenuItem>
              <MenuItem value="transfer">Transfer player</MenuItem>
              <MenuItem value="release">Release player</MenuItem>
              <MenuItem value="eligibility">Eligibility update</MenuItem>
            </TextField>
            <TextField
              select
              label="Team"
              value={teamUuid}
              onChange={(event) => setTeamUuid(event.target.value)}
              sx={{ minWidth: 190 }}
            >
              {teams.map((team) => (
                <MenuItem key={team.uuid} value={team.uuid}>
                  {team.name}
                </MenuItem>
              ))}
            </TextField>
            {requestType === 'transfer' && (
              <TextField
                select
                label="Destination"
                value={targetTeamUuid}
                onChange={(event) => setTargetTeamUuid(event.target.value)}
                sx={{ minWidth: 190 }}
              >
                {(allTeams.data?.items ?? [])
                  .filter((team) => team.uuid !== teamUuid)
                  .map((team) => (
                    <MenuItem key={team.uuid} value={team.uuid}>
                      {team.name}
                    </MenuItem>
                  ))}
              </TextField>
            )}
            <TextField
              select
              label="Player"
              value={playerUuid}
              onChange={(event) => setPlayerUuid(event.target.value)}
              sx={{ minWidth: 210 }}
            >
              {(players.data?.items ?? []).map((player) => (
                <MenuItem key={player.uuid} value={player.uuid}>
                  {player.displayName}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Season"
              value={seasonUuid}
              onChange={(event) => setSeasonUuid(event.target.value)}
              sx={{ minWidth: 180 }}
            >
              {seasons.map((season) => (
                <MenuItem key={season.uuid} value={season.uuid}>
                  {season.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
            <TextField
              label="Jersey"
              value={jerseyNumber}
              onChange={(event) => setJerseyNumber(event.target.value)}
            />
            <TextField
              label="Position"
              value={positionCode}
              onChange={(event) => setPositionCode(event.target.value)}
            />
            <TextField
              fullWidth
              label="Reason / notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
            {requestType === 'eligibility' && (
              <TextField
                select
                label="New eligibility"
                value={eligibilityStatus}
                onChange={(event) => setEligibilityStatus(event.target.value)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="eligible">Eligible</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
                <MenuItem value="ineligible">Ineligible</MenuItem>
              </TextField>
            )}
          </Stack>
          <Button
            variant="contained"
            onClick={() => submit.mutate()}
            disabled={!teamUuid || !playerUuid || !seasonUuid || submit.isPending}
          >
            Submit for approval
          </Button>
          {submit.isSuccess && <Alert severity="success">Roster request submitted.</Alert>}
          {submit.isError && (
            <Alert severity="error">The roster request could not be submitted.</Alert>
          )}
        </Stack>
      </Paper>
      <Typography variant="h3">Request history</Typography>
      {(workspace.data?.requests ?? []).map((request) => (
        <Paper key={request.uuid} variant="outlined" sx={{ p: 2 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.5}
            alignItems={{ md: 'center' }}
          >
            <Stack flex={1}>
              <Typography fontWeight={850}>
                {request.playerName} · {request.requestType}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {request.teamName}
                {request.targetTeamName ? ` → ${request.targetTeamName}` : ''} ·{' '}
                {request.seasonName}
              </Typography>
            </Stack>
            <Chip
              label={request.status}
              color={
                request.status === 'approved'
                  ? 'success'
                  : request.status === 'rejected'
                    ? 'error'
                    : 'warning'
              }
            />
            {request.status === 'pending' && auth.state?.user?.capabilities.manageLeagues && (
              <Stack direction="row" spacing={1}>
                <Button onClick={() => review.mutate({ uuid: request.uuid, decision: 'approve' })}>
                  Approve
                </Button>
                <Button
                  color="error"
                  onClick={() => review.mutate({ uuid: request.uuid, decision: 'reject' })}
                >
                  Reject
                </Button>
              </Stack>
            )}
          </Stack>
        </Paper>
      ))}
      {!workspace.data?.requests.length && <Alert severity="info">No roster requests yet.</Alert>}
    </Stack>
  );
}
