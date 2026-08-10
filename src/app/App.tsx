import { BrowserRouter } from 'react-router';

import type { BootstrapSettings } from '../types/api';
import { AppProviders } from './AppProviders';
import { AppRoutes } from './AppRoutes';
import { AppIntro } from '../components/AppIntro';

export function App({ settings }: { settings: BootstrapSettings }) {
  return (
    <AppProviders settings={settings}>
      <BrowserRouter {...(settings.appBase ? { basename: settings.appBase } : {})}>
        <AppIntro />
        <AppRoutes loginUrl={settings.loginUrl} />
      </BrowserRouter>
    </AppProviders>
  );
}
