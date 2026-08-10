import { useEffect, useState } from 'react';

import type { ApiClient } from '../api/client';
import type { LiveMatchState } from '../types/api';

export type LiveTransport = 'connecting' | 'sse' | 'polling';

export function useLiveMatchStream(api: ApiClient, uuid: string) {
  const [state, setState] = useState<LiveMatchState | null>(null);
  const [transport, setTransport] = useState<LiveTransport>('connecting');

  useEffect(() => {
    if (!uuid || typeof EventSource === 'undefined') {
      setTransport('polling');
      return undefined;
    }

    const source = new EventSource(api.getLiveMatchStreamUrl(uuid), { withCredentials: true });
    const handleLiveState = (event: MessageEvent<string>) => {
      try {
        setState(JSON.parse(event.data) as LiveMatchState);
        setTransport('sse');
      } catch {
        setTransport('polling');
      }
    };

    source.addEventListener('live-state', handleLiveState);
    source.onerror = () => {
      setTransport('polling');
      source.close();
    };

    return () => {
      source.removeEventListener('live-state', handleLiveState);
      source.close();
    };
  }, [api, uuid]);

  return { state, transport };
}
