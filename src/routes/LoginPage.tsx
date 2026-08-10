import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Checkbox,
  FormControlLabel,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router';
import { z } from 'zod';

import { ApiError } from '../api/client';
import { useApi } from '../api/context';
import { PageScaffold } from '../components/PageScaffold';

const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(1, 'Enter your password.'),
  remember: z.boolean(),
});
const registerSchema = z
  .object({
    displayName: z.string().trim().min(2, 'Enter your name.'),
    email: z.email('Enter a valid email address.'),
    password: z.string().min(8, 'Use at least 8 characters.'),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });
type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;

export function LoginPage() {
  const api = useApi();
  const client = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  const login = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: true },
  });
  const register = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { displayName: '', email: '', password: '', confirmPassword: '' },
  });
  const forgot = useForm<{ email: string }>({
    resolver: zodResolver(z.object({ email: z.email('Enter a valid email address.') })),
    defaultValues: { email: '' },
  });
  const destination = new URLSearchParams(location.search).get('redirect') || '/dashboard';
  const authMutation = useMutation({
    mutationFn: (values: LoginForm) => api.login(values),
    onSuccess: (state) => {
      client.setQueryData(['auth', 'status'], state);
      void navigate(destination, { replace: true });
    },
  });
  const registerMutation = useMutation({
    mutationFn: (values: RegisterForm) =>
      api.register({
        displayName: values.displayName,
        email: values.email,
        password: values.password,
      }),
    onSuccess: (state) => {
      client.setQueryData(['auth', 'status'], state);
      void navigate(destination, { replace: true });
    },
  });
  const forgotMutation = useMutation({
    mutationFn: ({ email }: { email: string }) => api.forgotPassword(email),
  });
  const error = authMutation.error ?? registerMutation.error ?? forgotMutation.error;

  return (
    <PageScaffold
      eyebrow="Your InstaScore account"
      title="Sign in to InstaScore"
      description="Sign in to follow teams, receive alerts and access the tools assigned to your role."
      status="Secure account access"
    >
      <Paper
        variant="outlined"
        sx={{ width: '100%', maxWidth: 560, mx: 'auto', p: { xs: 2, sm: 4 } }}
      >
        <Tabs
          value={tab}
          onChange={(_event, value: typeof tab) => setTab(value)}
          variant="fullWidth"
          sx={{ mb: 3 }}
        >
          <Tab value="login" label="Sign in" />
          <Tab value="register" label="Create account" />
        </Tabs>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error instanceof ApiError ? error.message : 'We could not complete that request.'}
          </Alert>
        )}
        {tab === 'login' && (
          <Stack
            component="form"
            spacing={2}
            onSubmit={(event) =>
              void login.handleSubmit((values) => authMutation.mutate(values))(event)
            }
          >
            <Typography variant="h5" fontWeight={950}>
              Sign in
            </Typography>
            <TextField
              label="Email address"
              autoComplete="email"
              error={!!login.formState.errors.email}
              helperText={login.formState.errors.email?.message}
              {...login.register('email')}
            />
            <TextField
              label="Password"
              type="password"
              autoComplete="current-password"
              error={!!login.formState.errors.password}
              helperText={login.formState.errors.password?.message}
              {...login.register('password')}
            />
            <FormControlLabel
              control={<Checkbox defaultChecked {...login.register('remember')} />}
              label="Keep me signed in on this device"
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={authMutation.isPending}
            >
              Sign in
            </Button>
            <Button
              onClick={() => {
                forgot.setValue('email', login.getValues('email'));
                setTab('forgot');
              }}
            >
              Forgot password?
            </Button>
            <Typography variant="caption" color="text.secondary">
              Your password is encrypted in transit and is never stored in the app interface.
            </Typography>
          </Stack>
        )}
        {tab === 'register' && (
          <Stack
            component="form"
            spacing={2}
            onSubmit={(event) =>
              void register.handleSubmit((values) => registerMutation.mutate(values))(event)
            }
          >
            <Typography variant="h5" fontWeight={950}>
              Create your fan account
            </Typography>
            <Typography color="text.secondary">
              Save favourites across devices and receive match alerts. Staff permissions are
              assigned separately by an administrator.
            </Typography>
            <TextField
              label="Full name"
              autoComplete="name"
              error={!!register.formState.errors.displayName}
              helperText={register.formState.errors.displayName?.message}
              {...register.register('displayName')}
            />
            <TextField
              label="Email address"
              autoComplete="email"
              error={!!register.formState.errors.email}
              helperText={register.formState.errors.email?.message}
              {...register.register('email')}
            />
            <TextField
              label="Password"
              type="password"
              autoComplete="new-password"
              error={!!register.formState.errors.password}
              helperText={register.formState.errors.password?.message ?? 'At least 8 characters.'}
              {...register.register('password')}
            />
            <TextField
              label="Confirm password"
              type="password"
              autoComplete="new-password"
              error={!!register.formState.errors.confirmPassword}
              helperText={register.formState.errors.confirmPassword?.message}
              {...register.register('confirmPassword')}
            />
            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={registerMutation.isPending}
            >
              Create account
            </Button>
          </Stack>
        )}
        {tab === 'forgot' && (
          <Stack
            component="form"
            spacing={2}
            onSubmit={(event) =>
              void forgot.handleSubmit((values) => forgotMutation.mutate(values))(event)
            }
          >
            <Typography variant="h5" fontWeight={950}>
              Reset your password
            </Typography>
            <Typography color="text.secondary">
              Enter your account email and we’ll send a secure reset link if the account exists.
            </Typography>
            <TextField
              label="Email address"
              autoComplete="email"
              error={!!forgot.formState.errors.email}
              helperText={forgot.formState.errors.email?.message}
              {...forgot.register('email')}
            />
            {forgotMutation.isSuccess && (
              <Alert severity="success">{forgotMutation.data.message}</Alert>
            )}
            <Button type="submit" variant="contained" disabled={forgotMutation.isPending}>
              Send reset link
            </Button>
            <Button onClick={() => setTab('login')}>Back to sign in</Button>
          </Stack>
        )}
      </Paper>
    </PageScaffold>
  );
}
