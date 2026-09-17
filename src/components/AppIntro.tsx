import { Box, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';

import logo from '../assets/instascore-logo-brand.png';
import splashImage from '../assets/instascore-sports-splash-v2.jpg';
import { isStandaloneDisplay } from '../pwa/installGuide';

const seenKey = 'instascore_app_intro_seen_v2';
const stages = [
  'Preparing your match centre',
  'Loading live scores',
  'Getting the crowd ready',
  'Welcome to InstaScore',
];

function shouldShowIntro() {
  const launchedFromManifest = new URLSearchParams(window.location.search).get('source') === 'pwa';
  try {
    return (isStandaloneDisplay() || launchedFromManifest) && !sessionStorage.getItem(seenKey);
  } catch {
    return isStandaloneDisplay() || launchedFromManifest;
  }
}

export function AppIntro() {
  const [visible, setVisible] = useState(shouldShowIntro);
  const [leaving, setLeaving] = useState(false);
  const [stage, setStage] = useState(0);
  const [imageReady, setImageReady] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const image = new Image();
    image.src = splashImage;
    const ready = () => setImageReady(true);
    if (image.complete) ready();
    else image.addEventListener('load', ready, { once: true });
    const stageTimers = [1700, 3400, 5100].map((delay, index) =>
      window.setTimeout(() => setStage(index + 1), delay),
    );
    const leaveTimer = window.setTimeout(() => setLeaving(true), 6500);
    const closeTimer = window.setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem(seenKey, '1');
      } catch {
        // Private browsing can disable storage; the intro must still finish.
      }
    }, 7000);
    return () => {
      image.removeEventListener('load', ready);
      stageTimers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(leaveTimer);
      window.clearTimeout(closeTimer);
    };
  }, [visible]);

  if (!visible) return null;
  return (
    <Box
      className={`instascore-app-intro${leaving ? ' is-leaving' : ''}${imageReady ? ' is-ready' : ''}`}
      role="status"
      aria-label="InstaScore is loading"
      aria-live="polite"
      aria-busy={!leaving}
      sx={{
        backgroundImage: `linear-gradient(180deg, rgba(3, 16, 31, 0.18), rgba(3, 16, 31, 0.04) 55%, rgba(3, 16, 31, 0.42)), url(${splashImage})`,
      }}
    >
      <Stack alignItems="center" className="instascore-intro-content">
        <Box component="img" src={logo} alt="InstaScore" className="instascore-intro-logo" />
        <Typography className="instascore-intro-kicker">Every sport. Every moment.</Typography>
        <Stack direction="row" spacing={2} className="instascore-intro-sports">
          <span>🏈 FLAG</span>
          <span>⚽ SOCCER</span>
          <span>🏀 BASKETBALL</span>
        </Stack>
        <Typography className="instascore-intro-status">{stages[stage]}</Typography>
        <Box className="instascore-intro-progress">
          <i />
        </Box>
      </Stack>
    </Box>
  );
}
