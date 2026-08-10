import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  initializeOneSignal,
  loginOneSignal,
  logoutOneSignal,
  promptForPush,
  resetOneSignalAdapterForTests,
  updateOneSignalTags,
} from '../../src/onesignal/oneSignalAdapter';

const settings = {
  appId: 'browser-visible-app-id',
  enabled: true,
  sdkUrl: 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js',
  serviceWorkerPath: '/OneSignalSDKWorker.js',
  serviceWorkerUrl: '/OneSignalSDKWorker.js',
};

describe('OneSignal Web SDK adapter', () => {
  beforeEach(() => {
    document.head.innerHTML = '';
    delete window.OneSignalDeferred;
    resetOneSignalAdapterForTests();
  });

  it('loads the v16 SDK and initialises once with the root worker path', async () => {
    const init = vi.fn().mockResolvedValue(undefined);
    const promise = initializeOneSignal(settings);

    expect(document.querySelector('script')?.getAttribute('src')).toBe(settings.sdkUrl);
    await window.OneSignalDeferred?.[0]?.({ init, login: vi.fn(), logout: vi.fn() });
    await promise;

    expect(init).toHaveBeenCalledWith(
      expect.objectContaining({
        appId: settings.appId,
        serviceWorkerPath: '/OneSignalSDKWorker.js',
      }),
    );
  });

  it('logs in with the WordPress user UUID and logs out on sign-out', async () => {
    const sdk = { init: vi.fn().mockResolvedValue(undefined), login: vi.fn(), logout: vi.fn() };
    const promise = loginOneSignal('user-uuid', settings);
    await window.OneSignalDeferred?.[0]?.(sdk);
    await promise;
    await logoutOneSignal(settings);

    expect(sdk.login).toHaveBeenCalledWith('user-uuid');
    expect(sdk.logout).toHaveBeenCalled();
  });

  it('does not request native permission until a user-triggered prompt call', async () => {
    const requestPermission = vi.fn();
    const prompt = promptForPush(settings);
    await window.OneSignalDeferred?.[0]?.({
      init: vi.fn().mockResolvedValue(undefined),
      login: vi.fn(),
      logout: vi.fn(),
      Notifications: { requestPermission },
    });
    await prompt;

    expect(requestPermission).toHaveBeenCalledTimes(1);
  });

  it('adds and removes non-sensitive targeting tags after follow changes', async () => {
    const addTags = vi.fn().mockResolvedValue(undefined);
    const removeTags = vi.fn().mockResolvedValue(undefined);
    const promise = updateOneSignalTags(
      {
        fav_team_00000000000040008000000000000010: '1',
        fav_competition_00000000000040008000000000000020: '',
      },
      settings,
    );

    await window.OneSignalDeferred?.[0]?.({
      init: vi.fn().mockResolvedValue(undefined),
      login: vi.fn(),
      logout: vi.fn(),
      User: { addTags, removeTags },
    });
    await promise;

    expect(addTags).toHaveBeenCalledWith({
      fav_team_00000000000040008000000000000010: '1',
    });
    expect(removeTags).toHaveBeenCalledWith(['fav_competition_00000000000040008000000000000020']);
  });
});
