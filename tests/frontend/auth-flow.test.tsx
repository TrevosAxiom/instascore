import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LoginPage } from '../../src/routes/LoginPage';
import { adminAuth, renderApp, testApi } from './test-utils';

describe('InstaScore account flow', () => {
  it('requires the emailed OTP before completing registration', async () => {
    const register = vi.fn(() =>
      Promise.resolve({
        verificationRequired: true as const,
        email: 'fan@example.com',
        message: 'Enter the six-digit code sent to your email.',
        expiresIn: 600,
      }),
    );
    const verifyEmail = vi.fn(() => Promise.resolve(adminAuth.state!));
    renderApp(<LoginPage />, {
      route: '/login',
      api: { ...testApi, register, verifyEmail },
    });

    fireEvent.click(screen.getByRole('tab', { name: /create account/i }));
    fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Ada Fan' } });
    fireEvent.change(screen.getByLabelText(/^email address/i), {
      target: { value: 'fan@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: 'securepass123' },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'securepass123' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByRole('heading', { name: /verify your email/i })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/verification code/i), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: /verify and continue/i }));

    await waitFor(() =>
      expect(verifyEmail).toHaveBeenCalledWith({ email: 'fan@example.com', code: '123456' }),
    );
  });
});
