import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ApiError } from '../../src/api/client';
import { PwaProvider, usePwa } from '../../src/pwa/PwaProvider';
import {
  enqueueScoreEvent,
  listQueuedScoreEvents,
  syncQueuedScoreEvents,
} from '../../src/pwa/offlineQueue';
import { registerServiceWorker } from '../../src/pwa/registerServiceWorker';

describe('Milestone 6 PWA foundation', () => {
  it('registers the root scoped service worker from bootstrap settings', async () => {
    const register = vi.fn(() => Promise.resolve({ scope: '/' }));
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { register },
    });

    const result = await registerServiceWorker({
      apiBase: '/wp-json/instascore/v1',
      appBase: '',
      loginUrl: '/wp-login.php',
      nonce: null,
      serviceWorkerUrl: '/instascore-sw.js',
    });

    expect(result.registered).toBe(true);
    expect(register).toHaveBeenCalledWith('/instascore-sw.js', { scope: '/' });
  });

  it('stores queued scoring events before sync and replays duplicate client IDs safely', async () => {
    const record = await enqueueScoreEvent({
      clientEventId: 'client-duplicate',
      fixtureUuid: 'fixture-1',
      payload: {
        clientEventId: 'client-duplicate',
        eventType: 'touchdown',
        teamSide: 'home',
        expectedRevision: 1,
      },
      deviceTimestamp: '2026-08-01T12:00:00.000Z',
      user: { uuid: 'user-1', displayName: 'Scorekeeper' },
      baseRevision: 1,
    });
    const duplicate = await enqueueScoreEvent({
      clientEventId: 'client-duplicate',
      fixtureUuid: 'fixture-1',
      payload: { clientEventId: 'client-duplicate' },
      deviceTimestamp: '2026-08-01T12:00:01.000Z',
      user: null,
      baseRevision: 1,
    });

    expect(duplicate.id).toBe(record.id);
    expect(
      (await listQueuedScoreEvents('fixture-1')).filter(
        (item) => item.clientEventId === 'client-duplicate',
      ),
    ).toHaveLength(1);
  });

  it('marks revision conflicts without silently discarding queued events', async () => {
    await enqueueScoreEvent({
      clientEventId: 'client-conflict',
      fixtureUuid: 'fixture-conflict',
      payload: { clientEventId: 'client-conflict', expectedRevision: 9 },
      deviceTimestamp: '2026-08-01T12:00:00.000Z',
      user: null,
      baseRevision: 9,
    });

    const result = await syncQueuedScoreEvents(
      {
        appendMatchEvent: () => Promise.reject(new ApiError('Revision conflict.', 409)),
      },
      'fixture-conflict',
    );

    const rows = await listQueuedScoreEvents('fixture-conflict');
    expect(result.conflicts).toBe(1);
    expect(rows[0]?.syncState).toBe('conflict');
    expect(rows[0]?.error).toBe('Revision conflict.');
  });

  it('captures browser install prompt and exposes install action', async () => {
    const prompt = vi.fn(() => Promise.resolve());

    function InstallProbe() {
      const pwa = usePwa();
      return (
        <button
          type="button"
          disabled={!pwa.installAvailable}
          onClick={() => void pwa.promptInstall()}
        >
          Install
        </button>
      );
    }

    render(
      <PwaProvider settings={{ apiBase: '', appBase: '', loginUrl: '', nonce: null }}>
        <InstallProbe />
      </PwaProvider>,
    );

    window.dispatchEvent(
      Object.assign(new Event('beforeinstallprompt'), {
        prompt,
        userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
      }),
    );

    const button = await screen.findByRole('button', { name: 'Install' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() => expect(prompt).toHaveBeenCalled());
  });
});
