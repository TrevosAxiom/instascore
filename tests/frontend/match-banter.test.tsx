import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MatchBanter } from '../../src/features/fixtures/MatchBanter';
import type { MatchChatRoom } from '../../src/types/api';
import { adminAuth, renderApp, testApi } from './test-utils';

const fixtureUuid = '00000000-0000-4000-8000-000000000501';
const messageUuid = '00000000-0000-4000-8000-000000000502';
const room: MatchChatRoom = {
  banned: false,
  messages: [
    {
      uuid: messageUuid,
      body: 'That defensive stop was massive!',
      author: {
        uuid: '00000000-0000-4000-8000-000000000777',
        displayName: 'Wolverines Fan',
      },
      parent: null,
      reactions: [{ reaction: '🔥', count: 3, reacted: false }],
      reportCount: 2,
      createdAt: new Date().toISOString(),
    },
  ],
};

describe('MatchBanter', () => {
  it('lets guests read the room but requires sign-in to participate', async () => {
    renderApp(<MatchBanter fixtureUuid={fixtureUuid} open onClose={() => undefined} />, {
      api: { ...testApi, getMatchChat: vi.fn().mockResolvedValue(room) },
    });

    expect(await screen.findByText('That defensive stop was massive!')).toBeInTheDocument();
    expect(screen.getByText('Sign in to join the banter.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '🔥 reaction, 3' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('supports replies, reactions, reporting, and moderator actions', async () => {
    const post = vi.fn().mockResolvedValue(room.messages[0]);
    const react = vi.fn().mockResolvedValue({ updated: true });
    const report = vi.fn().mockResolvedValue({ reported: true });
    const moderate = vi.fn().mockResolvedValue({ moderated: true });
    const ban = vi.fn().mockResolvedValue({ banned: true, hours: 24 });
    renderApp(<MatchBanter fixtureUuid={fixtureUuid} open onClose={() => undefined} />, {
      auth: adminAuth,
      api: {
        ...testApi,
        getMatchChat: vi.fn().mockResolvedValue(room),
        postMatchChat: post,
        reactToChatMessage: react,
        reportChatMessage: report,
        moderateChatMessage: moderate,
        banChatAuthor: ban,
      },
    });

    await screen.findByText('That defensive stop was massive!');
    fireEvent.click(screen.getByRole('button', { name: 'Reply' }));
    expect(screen.getByText('Replying to Wolverines Fan')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Your banter'), { target: { value: 'What a play!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(fixtureUuid, {
        body: 'What a play!',
        parentUuid: messageUuid,
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: '🔥 reaction, 3' }));
    fireEvent.click(screen.getByRole('button', { name: 'Report' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mute 24h' }));
    await waitFor(() => expect(react).toHaveBeenCalledWith(messageUuid, '🔥'));
    expect(report).toHaveBeenCalledWith(messageUuid, 'Inappropriate match chat content');
    expect(moderate).toHaveBeenCalledWith(messageUuid);
    expect(ban).toHaveBeenCalledWith(fixtureUuid, messageUuid, {
      hours: 24,
      reason: 'Match chat moderation',
    });
    expect(screen.getByText('2 reports')).toBeInTheDocument();
  });
});
