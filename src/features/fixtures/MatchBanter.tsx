import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import { useApi } from '../../api/context';
import { useAuth } from '../../app/auth-context';
import type { ChatMessage } from '../../types/api';

const reactions = ['🔥', '😂', '👏', '❤️'];

export function MatchBanter({
  fixtureUuid,
  open,
  onClose,
}: {
  fixtureUuid: string;
  open: boolean;
  onClose: () => void;
}) {
  const api = useApi();
  const auth = useAuth();
  const client = useQueryClient();
  const [body, setBody] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const room = useQuery({
    queryKey: ['match-chat', fixtureUuid],
    queryFn: () => api.getMatchChat(fixtureUuid),
    enabled: open,
    refetchInterval: open ? 3000 : false,
  });
  const refresh = () => void client.invalidateQueries({ queryKey: ['match-chat', fixtureUuid] });
  const post = useMutation({
    mutationFn: () =>
      api.postMatchChat(fixtureUuid, { body, ...(replyTo ? { parentUuid: replyTo.uuid } : {}) }),
    onSuccess: () => {
      setBody('');
      setReplyTo(null);
      refresh();
    },
  });
  const react = useMutation({
    mutationFn: ({ uuid, reaction }: { uuid: string; reaction: string }) =>
      api.reactToChatMessage(uuid, reaction),
    onSuccess: refresh,
  });
  const report = useMutation({
    mutationFn: (uuid: string) => api.reportChatMessage(uuid, 'Inappropriate match chat content'),
    onSuccess: refresh,
  });
  const moderate = useMutation({
    mutationFn: (uuid: string) => api.moderateChatMessage(uuid),
    onSuccess: refresh,
  });
  const ban = useMutation({
    mutationFn: (uuid: string) =>
      api.banChatAuthor(fixtureUuid, uuid, { hours: 24, reason: 'Match chat moderation' }),
    onSuccess: refresh,
  });
  const messages = room.data?.messages ?? [];
  const canModerate = Boolean(auth.state?.user?.capabilities.manageFixtures);

  useEffect(() => {
    if (open && messages.length && typeof endRef.current?.scrollIntoView === 'function') {
      endRef.current.scrollIntoView({ block: 'end' });
    }
  }, [messages.length, open]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 430 }, maxWidth: '100%' } }}
    >
      <Stack sx={{ height: '100%', bgcolor: 'background.default' }}>
        <Stack
          direction="row"
          alignItems="center"
          gap={1}
          sx={{ p: 2, bgcolor: 'rgb(7,25,45)', color: '#fff' }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight={950}>
              Match banter
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.72 }}>
              Keep it competitive. Keep it respectful.
            </Typography>
          </Box>
          <Button color="inherit" onClick={onClose}>
            Close
          </Button>
        </Stack>
        <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1.5 }} aria-live="polite">
          {room.isError ? <Alert severity="error">Banter could not be loaded.</Alert> : null}
          {!room.isLoading && !messages.length ? (
            <Alert severity="info">No banter yet. Start the conversation.</Alert>
          ) : null}
          <Stack spacing={1.25}>
            {messages.map((message) => {
              const own = message.author.uuid === auth.state?.user?.uuid;
              return (
                <Box
                  key={message.uuid}
                  sx={{
                    alignSelf: own ? 'flex-end' : 'stretch',
                    width: own ? '88%' : '100%',
                    p: 1.25,
                    borderRadius: 2,
                    bgcolor: own ? 'primary.main' : 'background.paper',
                    color: own ? 'primary.contrastText' : 'text.primary',
                    border: own ? 0 : 1,
                    borderColor: 'divider',
                  }}
                >
                  <Stack direction="row" justifyContent="space-between" gap={1}>
                    <Typography variant="caption" fontWeight={950}>
                      {message.author.displayName}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.65 }}>
                      {relativeTime(message.createdAt)}
                    </Typography>
                  </Stack>
                  {message.parent ? (
                    <Typography
                      variant="caption"
                      sx={{ display: 'block', opacity: 0.72, borderLeft: 2, pl: 0.75, my: 0.5 }}
                    >
                      Replying to {message.parent.displayName}
                    </Typography>
                  ) : null}
                  <Typography sx={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
                    {message.body}
                  </Typography>
                  <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 0.75 }}>
                    {reactions.map((emoji) => {
                      const value = message.reactions.find((item) => item.reaction === emoji);
                      return (
                        <Chip
                          key={emoji}
                          size="small"
                          variant={value?.reacted ? 'filled' : 'outlined'}
                          label={`${emoji}${value?.count ? ` ${value.count}` : ''}`}
                          disabled={!auth.state?.authenticated}
                          aria-label={`${emoji} reaction${value?.count ? `, ${value.count}` : ''}`}
                          onClick={() =>
                            auth.state?.authenticated &&
                            react.mutate({ uuid: message.uuid, reaction: emoji })
                          }
                        />
                      );
                    })}
                    {auth.state?.authenticated ? (
                      <Button size="small" color="inherit" onClick={() => setReplyTo(message)}>
                        Reply
                      </Button>
                    ) : null}
                    {auth.state?.authenticated && !own ? (
                      <Button
                        size="small"
                        color="inherit"
                        onClick={() => report.mutate(message.uuid)}
                      >
                        Report
                      </Button>
                    ) : null}
                    {canModerate ? (
                      <>
                        {message.reportCount > 0 ? (
                          <Chip
                            size="small"
                            color="warning"
                            label={`${message.reportCount} report${message.reportCount === 1 ? '' : 's'}`}
                          />
                        ) : null}
                        <Button
                          size="small"
                          color="error"
                          onClick={() => moderate.mutate(message.uuid)}
                        >
                          Hide
                        </Button>
                        {!own ? (
                          <Button
                            size="small"
                            color="error"
                            onClick={() => ban.mutate(message.uuid)}
                          >
                            Mute 24h
                          </Button>
                        ) : null}
                      </>
                    ) : null}
                  </Stack>
                </Box>
              );
            })}
            <div ref={endRef} />
          </Stack>
        </Box>
        <Divider />
        <Box sx={{ p: 1.5, bgcolor: 'background.paper' }}>
          {!auth.state?.authenticated ? (
            <Alert
              severity="info"
              action={
                <Button component={Link} to="/login" size="small">
                  Sign in
                </Button>
              }
            >
              Sign in to join the banter.
            </Alert>
          ) : room.data?.banned ? (
            <Alert severity="warning">You are temporarily muted in this match room.</Alert>
          ) : (
            <Stack spacing={1}>
              {replyTo ? (
                <Chip
                  label={`Replying to ${replyTo.author.displayName}`}
                  onDelete={() => setReplyTo(null)}
                />
              ) : null}
              <TextField
                multiline
                maxRows={3}
                fullWidth
                size="small"
                label="Your banter"
                value={body}
                inputProps={{ maxLength: 280 }}
                helperText={`${body.length}/280`}
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    if (body.trim()) post.mutate();
                  }
                }}
              />
              {post.isError ? (
                <Alert severity="error">Message not sent. Check the room rules or slow down.</Alert>
              ) : null}
              <Button
                variant="contained"
                disabled={!body.trim() || post.isPending}
                onClick={() => post.mutate()}
              >
                Send
              </Button>
            </Stack>
          )}
        </Box>
      </Stack>
    </Drawer>
  );
}

function relativeTime(value: string) {
  const timestamp = new Date(value.includes('T') ? value : `${value.replace(' ', 'T')}Z`).getTime();
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
}
