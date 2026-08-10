import { Button, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';

import type { MatchEvent } from '../../types/api';

const labels: Record<string, string> = {
  touchdown: 'Touchdown',
  one_point_conversion: '1-point conversion',
  two_point_conversion: '2-point conversion',
  safety: 'Safety',
  interception: 'Interception',
  penalty: 'Penalty',
  timeout: 'Timeout',
  possession_change: 'Possession change',
  period_start: 'Period start',
  period_end: 'Period end',
};

export function MatchTimeline({
  events,
  onVoid,
}: {
  events: MatchEvent[];
  onVoid?: (event: MatchEvent) => void;
}) {
  if (events.length === 0) {
    return <Typography color="text.secondary">No scoring events yet.</Typography>;
  }
  return (
    <List dense>
      {events.map((event) => (
        <ListItem
          key={event.uuid}
          secondaryAction={
            onVoid && !event.voided ? (
              <Button size="small" onClick={() => onVoid(event)}>
                Void
              </Button>
            ) : undefined
          }
        >
          <ListItemText
            primary={
              <Stack direction="row" spacing={1}>
                <Typography fontWeight={900}>{labels[event.eventType]}</Typography>
                <Typography color="text.secondary">#{event.sequenceNumber}</Typography>
              </Stack>
            }
            secondary={`${event.teamSide ?? 'clock'} · ${event.points} pts${event.voided ? ' · voided' : ''}`}
          />
        </ListItem>
      ))}
    </List>
  );
}
