import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { useApi } from '../api/context';
import { PageScaffold } from '../components/PageScaffold';

export function ContactPage() {
  const api = useApi();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', website: '' });
  const mutation = useMutation({ mutationFn: api.sendContactMessage });
  return (
    <PageScaffold
      eyebrow="Talk to InstaScore"
      title="Contact us"
      description="Questions, corrections, partnerships or match-day support—send the Lagos Wolverines team a message."
      status="We usually reply within one working day"
    >
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Box
                component="form"
                onSubmit={(event) => {
                  event.preventDefault();
                  mutation.mutate(form);
                }}
              >
                <Stack spacing={2}>
                  <Typography variant="h5">Send a message</Typography>
                  <TextField
                    name="name"
                    label="Your name"
                    autoComplete="name"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    required
                  />
                  <TextField
                    name="email"
                    label="Email address"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    required
                  />
                  <TextField
                    name="subject"
                    label="What can we help with?"
                    value={form.subject}
                    onChange={(event) => setForm({ ...form, subject: event.target.value })}
                    required
                  />
                  <TextField
                    name="message"
                    label="Message"
                    multiline
                    minRows={5}
                    value={form.message}
                    onChange={(event) => setForm({ ...form, message: event.target.value })}
                    required
                  />
                  <TextField
                    name="website"
                    value={form.website}
                    onChange={(event) => setForm({ ...form, website: event.target.value })}
                    tabIndex={-1}
                    autoComplete="off"
                    sx={{ display: 'none' }}
                  />
                  {mutation.isSuccess && <Alert severity="success">{mutation.data.message}</Alert>}
                  {mutation.isError && (
                    <Alert severity="error">
                      Your message could not be sent. Please check the fields and try again.
                    </Alert>
                  )}
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={mutation.isPending}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {mutation.isPending ? 'Sending…' : 'Send message'}
                  </Button>
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%', bgcolor: '#07192d', color: '#fff5d6' }}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h5">Lagos Wolverines</Typography>
                <Typography sx={{ color: 'rgba(255,245,214,.72)' }}>
                  Platform support, league onboarding, data corrections and partnership enquiries.
                </Typography>
                <Typography fontWeight={900} color="#f3c643">
                  Messages route securely to the platform administrator.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </PageScaffold>
  );
}
