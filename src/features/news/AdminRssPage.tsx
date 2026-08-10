import {
  Alert,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { useApi } from '../../api/context';
import { ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';
import type { RssSettings, RssSource } from '../../types/api';

type RssSourceDraft = Pick<RssSource, 'site' | 'url' | 'category' | 'status'>;
const emptySource: RssSourceDraft = {
  site: '',
  url: '',
  category: 'football',
  status: 'active',
};
const categories = [
  ['cffl', 'CFFL'],
  ['flag-football', 'Flag Football'],
  ['football', 'Football'],
  ['basketball', 'Basketball'],
] as const;

export function AdminRssPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['admin-rss'], queryFn: api.getRssDashboard });
  const [dialogOpen, setDialogOpen] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<RssSource | null>(null);
  const [draft, setDraft] = useState(emptySource);
  const [settings, setSettings] = useState<RssSettings>({
    interval: 'hourly',
    batchSize: 10,
    postStatus: 'publish',
  });
  useEffect(() => {
    if (query.data) setSettings(query.data.settings);
  }, [query.data]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-rss'] });
  const saveSource = useMutation({
    mutationFn: () =>
      editing ? api.updateRssSource(editing.id, draft) : api.createRssSource(draft),
    onSuccess: () => {
      setDialogOpen(false);
      void refresh();
    },
  });
  const removeSource = useMutation({ mutationFn: api.deleteRssSource, onSuccess: refresh });
  const sync = useMutation({ mutationFn: api.syncRss, onSuccess: refresh });
  const saveSettings = useMutation({
    mutationFn: api.updateRssSettings,
    onSuccess: refresh,
  });
  const csvImport = useMutation({
    mutationFn: api.importRssCsv,
    onSuccess: refresh,
  });

  if (query.isLoading) return <LoadingState label="Loading RSS sources" />;
  if (query.isError || !query.data)
    return <ErrorState description="RSS settings could not be loaded." />;

  const openCreate = () => {
    setEditing(null);
    setDraft(emptySource);
    setDialogOpen(true);
  };
  const openEdit = (source: RssSource) => {
    setEditing(source);
    setDraft({
      site: source.site,
      url: source.url,
      category: source.category,
      status: source.status,
    });
    setDialogOpen(true);
  };

  return (
    <PageScaffold
      eyebrow="Content automation"
      title="RSS news settings"
      description="Pull trusted sports news into the InstaScore database in controlled batches. Sources run independently and duplicate stories are skipped automatically."
      status={`${query.data.sources.filter((source) => source.status === 'active').length} active sources`}
    >
      <Stack spacing={3}>
        {sync.data && (
          <Alert severity={sync.data.failed ? 'warning' : 'success'}>
            Import complete: {sync.data.imported} new, {sync.data.duplicates} duplicates skipped,{' '}
            {sync.data.failed} sources failed.
          </Alert>
        )}
        {csvImport.data && (
          <Alert severity={csvImport.data.errors.length ? 'warning' : 'success'}>
            CSV import complete: {csvImport.data.imported} added, {csvImport.data.skipped}{' '}
            duplicates skipped, {csvImport.data.errors.length} invalid rows.
            {csvImport.data.errors.slice(0, 3).map((error) => (
              <Typography
                key={`${error.row}-${error.message}`}
                component="span"
                display="block"
                variant="caption"
              >
                Row {error.row}: {error.message}
              </Typography>
            ))}
          </Alert>
        )}
        {csvImport.isError && (
          <Alert severity="error">
            The RSS CSV could not be imported. Check its headers and rows.
          </Alert>
        )}
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
                <div>
                  <Typography variant="h6">Import schedule</Typography>
                  <Typography color="text.secondary">
                    Configure how often feeds run, how many stories are read per source, and whether
                    imported stories publish immediately.
                  </Typography>
                </div>
                <Button
                  variant="contained"
                  onClick={() => sync.mutate(undefined)}
                  disabled={sync.isPending}
                >
                  {sync.isPending ? 'Importing…' : 'Sync all now'}
                </Button>
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <FormControl size="small" sx={{ minWidth: 190 }}>
                  <InputLabel>Import interval</InputLabel>
                  <Select
                    label="Import interval"
                    value={settings.interval}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        interval: event.target.value,
                      })
                    }
                  >
                    <MenuItem value="every_15_minutes">Every 15 minutes</MenuItem>
                    <MenuItem value="hourly">Hourly</MenuItem>
                    <MenuItem value="twicedaily">Every 12 hours</MenuItem>
                    <MenuItem value="daily">Daily</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  size="small"
                  label="Stories per source"
                  type="number"
                  value={settings.batchSize}
                  slotProps={{ htmlInput: { min: 1, max: 50 } }}
                  onChange={(event) =>
                    setSettings({ ...settings, batchSize: Number(event.target.value) })
                  }
                />
                <FormControl size="small" sx={{ minWidth: 170 }}>
                  <InputLabel>Imported status</InputLabel>
                  <Select
                    label="Imported status"
                    value={settings.postStatus}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        postStatus: event.target.value,
                      })
                    }
                  >
                    <MenuItem value="publish">Publish immediately</MenuItem>
                    <MenuItem value="draft">Save as draft</MenuItem>
                  </Select>
                </FormControl>
                <Button variant="outlined" onClick={() => saveSettings.mutate(settings)}>
                  Save schedule
                </Button>
              </Stack>
              {query.data.nextRunAt && (
                <Typography variant="caption" color="text.secondary">
                  Next scheduled run: {new Date(query.data.nextRunAt * 1000).toLocaleString()}
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', md: 'center' }}
                gap={2}
              >
                <div>
                  <Typography variant="h6">News sources</Typography>
                  <Typography color="text.secondary">Site | RSS URL | Category | Status</Typography>
                </div>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button variant="outlined" onClick={downloadRssTemplate}>
                    CSV template
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => csvInputRef.current?.click()}
                    disabled={csvImport.isPending}
                  >
                    {csvImport.isPending ? 'Importing…' : 'Import CSV'}
                  </Button>
                  <Button variant="contained" onClick={openCreate}>
                    Add source
                  </Button>
                  <input
                    ref={csvInputRef}
                    type="file"
                    aria-label="RSS CSV file"
                    accept=".csv,text/csv"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) csvImport.mutate(file);
                      event.target.value = '';
                    }}
                  />
                </Stack>
              </Stack>
              <TableContainer>
                <Table size="small" aria-label="RSS news sources">
                  <TableHead>
                    <TableRow>
                      <TableCell>Site</TableCell>
                      <TableCell>RSS URL</TableCell>
                      <TableCell>Category</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Import health</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {query.data.sources.map((source) => (
                      <TableRow key={source.id} hover>
                        <TableCell>
                          <strong>{source.site}</strong>
                        </TableCell>
                        <TableCell
                          sx={{
                            maxWidth: 300,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {source.url}
                        </TableCell>
                        <TableCell>
                          {categories.find(([slug]) => slug === source.category)?.[1] ??
                            source.category}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={source.status === 'active' ? 'success' : 'default'}
                            label={source.status}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="caption"
                            color={source.lastError ? 'error' : 'text.secondary'}
                          >
                            {source.lastError ||
                              `${source.importedTotal} imported${source.lastSuccessAt ? ` · ${new Date(source.lastSuccessAt).toLocaleString()}` : ''}`}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Button size="small" onClick={() => sync.mutate(source.id)}>
                              Sync
                            </Button>
                            <Button size="small" onClick={() => openEdit(source)}>
                              Edit
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              onClick={() =>
                                window.confirm(`Delete ${source.site}?`) &&
                                removeSource.mutate(source.id)
                              }
                            >
                              Delete
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!query.data.sources.length && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          No RSS sources yet. Add the first trusted news feed.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </CardContent>
        </Card>
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Edit RSS source' : 'Add RSS source'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              label="Site"
              placeholder="BBC Sport"
              value={draft.site}
              onChange={(event) => setDraft({ ...draft, site: event.target.value })}
              required
            />
            <TextField
              label="RSS URL"
              placeholder="https://example.com/sport/feed.xml"
              value={draft.url}
              onChange={(event) => setDraft({ ...draft, url: event.target.value })}
              required
            />
            <FormControl required>
              <InputLabel>Category</InputLabel>
              <Select
                label="Category"
                value={draft.category}
                onChange={(event) => setDraft({ ...draft, category: event.target.value })}
              >
                {categories.map(([value, label]) => (
                  <MenuItem key={value} value={value}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl required>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={draft.status}
                onChange={(event) => setDraft({ ...draft, status: event.target.value })}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
            {saveSource.isError && (
              <Alert severity="error">
                The RSS source could not be saved. Check every field and try again.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!draft.site || !draft.url || saveSource.isPending}
            onClick={() => saveSource.mutate()}
          >
            {saveSource.isPending ? 'Saving…' : 'Save source'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageScaffold>
  );
}

function downloadRssTemplate() {
  const csv = [
    ['site', 'rss_url', 'category', 'status'],
    ['ESPN Soccer', 'https://www.espn.com/espn/rss/soccer/news', 'football', 'active'],
  ]
    .map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(','))
    .join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'instascore-rss-import-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}
