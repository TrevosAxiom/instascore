import { Alert, Box, Button, Chip, Drawer, Stack, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useApi } from '../../api/context';
import { useAuth } from '../../app/auth-context';
import type { ChatMessage } from '../../types/api';

export function FantasyBanter({
  gameUuid,
  open,
  onClose,
}: {
  gameUuid: string;
  open: boolean;
  onClose: () => void;
}) {
  const api = useApi();
  const auth = useAuth();
  const client = useQueryClient();
  const [body, setBody] = useState('');
  const [reply, setReply] = useState<ChatMessage | null>(null);
  const room = useQuery({
    queryKey: ['fantasy-chat', gameUuid],
    queryFn: () => api.getFantasyChat(gameUuid),
    enabled: open,
    refetchInterval: open ? 4000 : false,
  });
  const refresh = () => void client.invalidateQueries({ queryKey: ['fantasy-chat', gameUuid] });
  const post = useMutation({
    mutationFn: () =>
      api.postFantasyChat(gameUuid, { body, ...(reply ? { parentUuid: reply.uuid } : {}) }),
    onSuccess: () => {
      setBody('');
      setReply(null);
      refresh();
    },
  });
  const react = useMutation({
    mutationFn: ({ uuid, reaction }: { uuid: string; reaction: string }) =>
      api.reactToChatMessage(uuid, reaction),
    onSuccess: refresh,
  });
  const report = useMutation({
    mutationFn: (uuid: string) =>
      api.reportChatMessage(uuid, 'Inappropriate fantasy league banter'),
    onSuccess: refresh,
  });
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        className: 'fantasy-banter-drawer',
        sx: { width: { xs: '100%', sm: 430 }, maxWidth: '100%' },
      }}
    >
      <Stack sx={{ height: '100%', bgcolor: 'background.default' }}>
        <Stack
          direction="row"
          alignItems="center"
          sx={{ p: 2, bgcolor: 'rgb(7,25,45)', color: '#fff' }}
        >
          <Box flex={1}>
            <Typography variant="h5" fontWeight={1000}>
              League banter
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.72 }}>
              Live room · {room.data?.messages.length ?? 0} messages
            </Typography>
          </Box>
          <Button color="inherit" onClick={onClose}>
            Close
          </Button>
        </Stack>
        <Stack spacing={1} sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
          <Alert severity="info" icon={false}>
            <strong>Room rules:</strong> rivalry is welcome; threats, hate, spam and personal
            attacks are not.
          </Alert>
          {room.isError ? <Alert severity="error">League banter could not be loaded.</Alert> : null}
          {!room.isLoading && !room.data?.messages.length ? (
            <Alert severity="info">Be the first to start the banter.</Alert>
          ) : null}
          {(room.data?.messages ?? []).map((message) => (
            <Box key={message.uuid} className="fantasy-banter-message">
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" fontWeight={950}>
                  {message.author.displayName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(message.createdAt.replace(' ', 'T') + 'Z').toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
              </Stack>
              {message.parent ? (
                <Typography variant="caption" color="text.secondary">
                  ↳ {message.parent.displayName}
                </Typography>
              ) : null}
              <Typography sx={{ overflowWrap: 'anywhere' }}>{message.body}</Typography>
              <Stack direction="row" gap={0.5} mt={0.5}>
                {['🔥', '😂', '👏', '❤️'].map((emoji) => (
                  <Chip
                    key={emoji}
                    size="small"
                    label={`${emoji} ${message.reactions.find((item) => item.reaction === emoji)?.count ?? ''}`}
                    onClick={() => react.mutate({ uuid: message.uuid, reaction: emoji })}
                  />
                ))}
                <Button size="small" onClick={() => setReply(message)}>
                  Reply
                </Button>
                {message.author.uuid !== auth.state?.user?.uuid ? (
                  <Button size="small" color="inherit" onClick={() => report.mutate(message.uuid)}>
                    Report
                  </Button>
                ) : null}
              </Stack>
            </Box>
          ))}
        </Stack>
        <Box sx={{ p: 1.5, bgcolor: 'background.paper' }}>
          {room.data?.banned ? (
            <Alert severity="warning">You are temporarily muted in this room.</Alert>
          ) : (
            <Stack spacing={1}>
              {reply ? (
                <Chip
                  label={`Replying to ${reply.author.displayName}`}
                  onDelete={() => setReply(null)}
                />
              ) : null}
              <TextField
                multiline
                maxRows={3}
                label="Talk your talk"
                value={body}
                onChange={(event) => setBody(event.target.value.slice(0, 280))}
                helperText={`${body.length}/280`}
              />
              {post.isError ? (
                <Alert severity="error">Message not sent. Slow down and try again.</Alert>
              ) : null}
              <Button
                variant="contained"
                disabled={!auth.state?.authenticated || !body.trim() || post.isPending}
                onClick={() => post.mutate()}
              >
                Send to league
              </Button>
            </Stack>
          )}
        </Box>
      </Stack>
    </Drawer>
  );
}
