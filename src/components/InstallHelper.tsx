import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { usePwa } from '../pwa/PwaProvider';

const continueKey = 'instascore_install_help_continue';

export function InstallHelper() {
  const pwa = usePwa();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (location.pathname === '/' && sessionStorage.getItem(continueKey)) {
      sessionStorage.removeItem(continueKey);
      setOpen(true);
    }
  }, [location.pathname]);

  if (pwa.standalone) return null;

  const install = async () => {
    if (pwa.installAvailable) {
      await pwa.promptInstall();
      return;
    }
    setOpen(true);
  };
  const continueOnHomepage = () => {
    sessionStorage.setItem(continueKey, '1');
    setOpen(false);
    void navigate('/');
  };

  return (
    <>
      <Paper
        variant="outlined"
        role="region"
        aria-label="Install InstaScore"
        sx={{ px: { xs: 1.5, sm: 2 }, py: 1.25, borderColor: 'primary.main', borderRadius: 2 }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={950} noWrap>
              Install InstaScore
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap>
              {pwa.installGuide.label} · launches from the homepage
            </Typography>
          </Box>
          <Button variant="contained" size="small" onClick={() => void install()}>
            {pwa.installAvailable ? 'Install' : 'Show me how'}
          </Button>
        </Stack>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Install on {pwa.installGuide.label}</DialogTitle>
        <DialogContent>
          {!pwa.installGuide.installSupported && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Installation is not supported by this browser.
            </Alert>
          )}
          <Stack component="ol" spacing={1.5} sx={{ pl: 2.5, mb: 0 }}>
            {pwa.installGuide.steps.map((step) => (
              <Typography component="li" key={step}>
                {step}
              </Typography>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Close</Button>
          {pwa.installGuide.requiresHomepage && location.pathname !== '/' && (
            <Button variant="contained" onClick={continueOnHomepage}>
              Continue on homepage
            </Button>
          )}
          {pwa.installAvailable && (
            <Button variant="contained" onClick={() => void pwa.promptInstall()}>
              Install now
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
