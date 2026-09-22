import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  IconButton,
  Stack,
  SvgIcon,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
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
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [gifOpen, setGifOpen] = useState(false);
  const [gifInput, setGifInput] = useState('');
  const selectedGif = gifUrlFromBody(body);
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
          <Tooltip title="Close banter">
            <IconButton color="inherit" aria-label="Close banter" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
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
              <ChatMessageContent body={message.body} />
              <Stack direction="row" gap={0.5} mt={0.5}>
                {['🔥', '😂', '👏', '❤️'].map((emoji) => (
                  <Chip
                    key={emoji}
                    size="small"
                    label={`${emoji} ${message.reactions.find((item) => item.reaction === emoji)?.count ?? ''}`}
                    onClick={() => react.mutate({ uuid: message.uuid, reaction: emoji })}
                  />
                ))}
                <Tooltip title="Reply">
                  <IconButton
                    size="small"
                    aria-label={`Reply to ${message.author.displayName}`}
                    onClick={() => setReply(message)}
                  >
                    <ReplyIcon />
                  </IconButton>
                </Tooltip>
                {message.author.uuid !== auth.state?.user?.uuid ? (
                  <Tooltip title="Report message">
                    <IconButton
                      size="small"
                      color="inherit"
                      aria-label={`Report message from ${message.author.displayName}`}
                      onClick={() => report.mutate(message.uuid)}
                    >
                      <ReportIcon />
                    </IconButton>
                  </Tooltip>
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
              {selectedGif ? (
                <Box className="fantasy-banter-gif-preview">
                  <Box component="img" src={selectedGif} alt="Selected GIF preview" />
                  <IconButton aria-label="Remove selected GIF" onClick={() => setBody('')}>
                    <CloseIcon />
                  </IconButton>
                </Box>
              ) : (
                <TextField
                  multiline
                  maxRows={3}
                  label="Talk your talk"
                  value={body}
                  onChange={(event) => setBody(event.target.value.slice(0, 280))}
                  helperText={`${body.length}/280`}
                />
              )}
              <Stack direction="row" alignItems="center" gap={0.5}>
                <Tooltip title="Add emoji">
                  <IconButton
                    className="fantasy-chat-tool"
                    aria-label="Add emoji"
                    aria-expanded={emojiOpen}
                    onClick={() => setEmojiOpen((current) => !current)}
                  >
                    <SmileIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Add GIF">
                  <IconButton
                    className="fantasy-chat-tool fantasy-gif-tool"
                    aria-label="Add GIF"
                    onClick={() => {
                      setGifInput(selectedGif ?? '');
                      setGifOpen(true);
                    }}
                  >
                    <span>GIF</span>
                  </IconButton>
                </Tooltip>
                <Box flex={1} />
                <Button
                  variant="contained"
                  endIcon={<SendIcon />}
                  disabled={!auth.state?.authenticated || !body.trim() || post.isPending}
                  onClick={() => post.mutate()}
                >
                  Send
                </Button>
              </Stack>
              {emojiOpen ? (
                <Stack
                  className="fantasy-emoji-picker"
                  direction="row"
                  flexWrap="wrap"
                  gap={0.5}
                  aria-label="Choose an emoji"
                >
                  {['🔥', '😂', '👏', '❤️', '🏈', '😤', '👀', '🏆'].map((emoji) => (
                    <IconButton
                      key={emoji}
                      aria-label={`Add ${emoji}`}
                      onClick={() => {
                        setBody((current) => `${current}${emoji}`.slice(0, 280));
                        setEmojiOpen(false);
                      }}
                    >
                      {emoji}
                    </IconButton>
                  ))}
                </Stack>
              ) : null}
              {post.isError ? (
                <Alert severity="error">Message not sent. Slow down and try again.</Alert>
              ) : null}
            </Stack>
          )}
        </Box>
      </Stack>
      <Dialog open={gifOpen} onClose={() => setGifOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 1000 }}>Add a GIF</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Paste a direct GIF link from GIPHY or Tenor. Only trusted HTTPS GIF hosts are accepted.
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="GIF link"
            placeholder="https://media.giphy.com/.../giphy.gif"
            value={gifInput}
            onChange={(event) => setGifInput(event.target.value.trim())}
            error={Boolean(gifInput && !isTrustedGifUrl(gifInput))}
            helperText={
              gifInput && !isTrustedGifUrl(gifInput)
                ? 'Use a direct media.giphy.com, i.giphy.com or media.tenor.com link.'
                : 'The GIF will be sent as its own message.'
            }
          />
          {isTrustedGifUrl(gifInput) ? (
            <Box className="fantasy-banter-gif-dialog-preview">
              <Box component="img" src={gifInput} alt="GIF preview" />
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGifOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!isTrustedGifUrl(gifInput)}
            onClick={() => {
              setBody(`[gif]${gifInput}`);
              setEmojiOpen(false);
              setGifOpen(false);
            }}
          >
            Add GIF
          </Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
}

const trustedGifHosts = new Set(['media.giphy.com', 'i.giphy.com', 'media.tenor.com']);

function isTrustedGifUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && trustedGifHosts.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

function gifUrlFromBody(body: string): string | null {
  if (!body.startsWith('[gif]')) return null;
  const value = body.slice(5).trim();
  return isTrustedGifUrl(value) ? value : null;
}

function ChatMessageContent({ body }: { body: string }) {
  const gifUrl = gifUrlFromBody(body);
  return gifUrl ? (
    <Box
      component="img"
      className="fantasy-banter-gif"
      src={gifUrl}
      alt="Animated reaction GIF"
      loading="lazy"
    />
  ) : (
    <Typography sx={{ overflowWrap: 'anywhere' }}>{body}</Typography>
  );
}

function CloseIcon() {
  return (
    <SvgIcon fontSize="small">
      <path d="M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4l-6.3 6.31-1.42-1.42L9.17 12l-6.3-6.29 1.42-1.42 6.3 6.31 6.3-6.31z" />
    </SvgIcon>
  );
}

function ReplyIcon() {
  return (
    <SvgIcon fontSize="small">
      <path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z" />
    </SvgIcon>
  );
}

function ReportIcon() {
  return (
    <SvgIcon fontSize="small">
      <path d="M5 3h10l-.6 2H21v11h-7l.6-2H7v7H5zm2 2v7h10l-.6 2H19V7h-7l.6-2z" />
    </SvgIcon>
  );
}

function SmileIcon() {
  return (
    <SvgIcon fontSize="small">
      <path d="M12 2a10 10 0 1 0 .01 20.01A10 10 0 0 0 12 2m-3.5 7A1.5 1.5 0 1 1 8.49 6a1.5 1.5 0 0 1 .01 3m7 0A1.5 1.5 0 1 1 15.49 6a1.5 1.5 0 0 1 .01 3M12 18a5.5 5.5 0 0 1-5.1-3.45h10.2A5.5 5.5 0 0 1 12 18" />
    </SvgIcon>
  );
}

function SendIcon() {
  return (
    <SvgIcon fontSize="small">
      <path d="m2 21 21-9L2 3v7l15 2-15 2z" />
    </SvgIcon>
  );
}
