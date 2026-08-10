import { Box, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

import logo from '../assets/instascore-logo-brand.png';
import splashImage from '../assets/instascore-sports-splash-v2.jpg';
import { isStandaloneDisplay } from '../pwa/installGuide';

const seenKey = 'instascore_app_intro_seen_v2';

function shouldShowIntro() {
  const launchedFromManifest = new URLSearchParams(window.location.search).get('source') === 'pwa';
  return (isStandaloneDisplay() || launchedFromManifest) && !sessionStorage.getItem(seenKey);
}

export function AppIntro() {
  const [visible, setVisible] = useState(shouldShowIntro);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const leaveTimer = window.setTimeout(() => setLeaving(true), 6500);
    const closeTimer = window.setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem(seenKey, '1');
    }, 7000);
    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(closeTimer);
    };
  }, [visible]);

  if (!visible) return null;
  return (
    <Box
      className={`instascore-app-intro${leaving ? ' is-leaving' : ''}`}
      role="status"
      aria-label="InstaScore is loading"
      sx={{
        backgroundImage: `linear-gradient(180deg, rgba(3, 16, 31, 0.18), rgba(3, 16, 31, 0.04) 55%, rgba(3, 16, 31, 0.42)), url(${splashImage})`,
      }}
    >
      <Stack alignItems="center" className="instascore-intro-content">
        <Box component="img" src={logo} alt="InstaScore" className="instascore-intro-logo" />
        <Typography className="instascore-intro-kicker">Every sport. Every moment.</Typography>
        <Stack direction="row" spacing={2} className="instascore-intro-sports">
          <span>FLAG</span>
          <span>SOCCER</span>
          <span>BASKETBALL</span>
        </Stack>
        <Box className="instascore-intro-progress">
          <i />
        </Box>
      </Stack>
    </Box>
  );
}
