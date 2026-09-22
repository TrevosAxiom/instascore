import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { ApiError } from '../api/client';
import { useApi } from '../api/context';
import fantasyAuthImage from '../assets/fantasy-auth-gate-v1.jpg';

export function AuthAccessDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const api = useApi();
  const client = useQueryClient();
  const [tab, setTab] = useState<'login' | 'register' | 'verify'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const complete = (state: unknown) => {
    client.setQueryData(['auth', 'status'], state);
    onClose();
    if (import.meta.env.MODE !== 'test') {
      window.setTimeout(() => window.location.reload(), 0);
    }
  };
  const login = useMutation({
    mutationFn: () => api.login({ email: email.trim(), password, remember: true }),
    onSuccess: complete,
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'instascore_email_verification_required')
        setTab('verify');
    },
  });
  const register = useMutation({
    mutationFn: () => api.register({ displayName: name.trim(), email: email.trim(), password }),
    onSuccess: (result) => {
      if ('verificationRequired' in result) {
        setEmail(result.email);
        setTab('verify');
        return;
      }
      complete(result);
    },
  });
  const verify = useMutation({
    mutationFn: () => api.verifyEmail({ email: email.trim(), code: code.trim() }),
    onSuccess: complete,
  });
  const resend = useMutation({ mutationFn: () => api.resendEmailVerification(email.trim()) });
  const error = login.error ?? register.error ?? verify.error ?? resend.error;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      className="fantasy-auth-dialog"
      aria-labelledby="fantasy-auth-title"
    >
      <Box className="fantasy-auth-layout" data-auth-access-dialog="true">
        <Box className="fantasy-auth-visual">
          <Box
            component="img"
            src={fantasyAuthImage}
            alt="Flag football players under stadium lights"
          />
          <Box className="fantasy-auth-visual-copy">
            <Typography variant="overline">InstaScore Fantasy</Typography>
            <Typography variant="h3">Build your team. Own the gameweek.</Typography>
            <Typography>
              Pick the stars, name your squad and climb the official CFFL table.
            </Typography>
          </Box>
        </Box>
        <Box className="fantasy-auth-form-shell">
          <DialogTitle id="fantasy-auth-title" sx={{ fontWeight: 1000, px: 0, pt: 0 }}>
            Join the fantasy action
          </DialogTitle>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Sign in or create your account to name a team, pick players and join league banter.
          </Typography>
          <DialogContent sx={{ p: '0 !important', overflow: 'visible' }}>
            {tab !== 'verify' ? (
              <Tabs
                value={tab}
                onChange={(_, value: 'login' | 'register') => setTab(value)}
                variant="fullWidth"
                sx={{ mb: 2 }}
              >
                <Tab value="login" label="Sign in" />
                <Tab value="register" label="Register" />
              </Tabs>
            ) : null}
            {error ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error instanceof Error ? error.message : 'That did not work. Please try again.'}
              </Alert>
            ) : null}
            {tab === 'login' ? (
              <Stack
                component="form"
                spacing={1.5}
                onSubmit={(event) => {
                  event.preventDefault();
                  login.mutate();
                }}
              >
                <TextField
                  label="Email address"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                <TextField
                  label="Password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <Button type="submit" variant="contained" size="large" disabled={login.isPending}>
                  Sign in and continue
                </Button>
              </Stack>
            ) : null}
            {tab === 'register' ? (
              <Stack
                component="form"
                spacing={1.5}
                onSubmit={(event) => {
                  event.preventDefault();
                  register.mutate();
                }}
              >
                <TextField
                  label="Full name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  inputProps={{ minLength: 2 }}
                />
                <TextField
                  label="Email address"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                <TextField
                  label="Password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  inputProps={{ minLength: 8 }}
                />
                <TextField
                  label="Confirm password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  error={Boolean(confirmPassword && confirmPassword !== password)}
                  helperText={
                    confirmPassword && confirmPassword !== password
                      ? 'Passwords do not match.'
                      : 'A six-digit email OTP will verify your account.'
                  }
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={register.isPending || password !== confirmPassword}
                >
                  Create account
                </Button>
              </Stack>
            ) : null}
            {tab === 'verify' ? (
              <Stack
                component="form"
                spacing={1.5}
                onSubmit={(event) => {
                  event.preventDefault();
                  verify.mutate();
                }}
              >
                <Typography fontWeight={800}>Enter the six-digit code sent to {email}.</Typography>
                <TextField
                  autoFocus
                  label="Email OTP"
                  inputMode="numeric"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                />
                {resend.isSuccess ? (
                  <Alert severity="success">A fresh code has been sent.</Alert>
                ) : null}
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={verify.isPending || code.length !== 6}
                >
                  Verify and continue
                </Button>
                <Button onClick={() => resend.mutate()} disabled={resend.isPending}>
                  Resend code
                </Button>
              </Stack>
            ) : null}
          </DialogContent>
        </Box>
      </Box>
    </Dialog>
  );
}
