import { Alert, Button, Stack, Typography } from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import type { ChangeEvent } from 'react';

import { ApiError } from '../api/client';
import { useApi } from '../api/context';
import type { MediaUpload } from '../types/api';
import { EntityAvatar } from './EntityAvatar';

export function MediaUploadField({
  label,
  value,
  onChange,
  round = false,
  entity,
}: {
  label: string;
  value: MediaUpload | null;
  onChange: (media: MediaUpload | null) => void;
  round?: boolean;
  entity: 'competition' | 'team' | 'player';
}) {
  const api = useApi();
  const upload = useMutation({ mutationFn: api.uploadMedia, onSuccess: onChange });
  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) upload.mutate(file);
  };

  return (
    <Stack spacing={1.25}>
      <Typography fontWeight={700}>{label}</Typography>
      <Stack direction="row" spacing={2} alignItems="center">
        <EntityAvatar
          entity={entity}
          alt={`${label} preview`}
          src={value?.url}
          variant={round ? 'circular' : 'rounded'}
          sx={{ width: 88, height: 88, bgcolor: 'rgba(7,25,45,.08)', color: 'primary.main' }}
        />
        <Stack spacing={1} alignItems="flex-start">
          <Button component="label" variant="outlined" disabled={upload.isPending}>
            {upload.isPending ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
            <input hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} />
          </Button>
          {value && <Button onClick={() => onChange(null)}>Remove</Button>}
          <Typography variant="caption" color="text.secondary">
            JPEG, PNG or WebP. Maximum 2 MB.
          </Typography>
        </Stack>
      </Stack>
      {upload.isError && (
        <Alert severity="error">
          {upload.error instanceof ApiError
            ? upload.error.message
            : 'The image could not be uploaded.'}
        </Alert>
      )}
    </Stack>
  );
}
