import { Alert, Box, Button, Card, CardContent, Chip, Grid, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { useApi } from '../../api/context';
import { useAuth } from '../../app/auth-context';
import { ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';
import type { CommerceProduct } from '../../types/api';

const labels = { subscription: 'Memberships', ticket: 'Tickets', merchandise: 'Shop' } as const;
const money = (minor: number, currency: string) => new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(minor / 100);

export function StorefrontPage() {
  const api = useApi(); const auth = useAuth(); const queryClient = useQueryClient();
  const [tab, setTab] = useState<'all' | CommerceProduct['productType']>('all');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const catalogue = useQuery({ queryKey: ['commerce-catalogue'], queryFn: api.getCommerceCatalogue });
  const orders = useQuery({ queryKey: ['commerce-orders'], queryFn: api.getMyCommerceOrders, enabled: Boolean(auth.state?.authenticated) });
  const entitlements = useQuery({ queryKey: ['commerce-entitlements'], queryFn: api.getMyEntitlements, enabled: Boolean(auth.state?.authenticated) });
  const checkout = useMutation({ mutationFn: (product: CommerceProduct) => api.checkoutCommerce({ items: [{ productUuid: product.uuid, quantity: 1 }], paymentMethod: 'manual', customerName: auth.state?.user?.displayName ?? '', deliveryAddress }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['commerce-orders'] }) });
  if (catalogue.isLoading) return <LoadingState label="Loading the InstaScore store" />;
  if (catalogue.isError) return <ErrorState description="The store could not be loaded." />;
  const products = (catalogue.data ?? []).filter((product) => tab === 'all' || product.productType === tab);
  return <PageScaffold eyebrow="InstaScore Store" title="Tickets, memberships and team gear" description="One secure place for match access, supporter memberships and official merchandise.">
    <Stack spacing={3}>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable" aria-label="Store categories">
        <Tab value="all" label="All" />{Object.entries(labels).map(([value, label]) => <Tab key={value} value={value} label={label} />)}
      </Tabs>
      {checkout.isSuccess ? <Alert severity="success">Order {checkout.data.orderNumber} created. An administrator must confirm payment before access or fulfilment is issued.</Alert> : null}
      {checkout.isError ? <Alert severity="error">The order could not be created. Please review availability and try again.</Alert> : null}
      {products.some((product) => product.productType === 'merchandise') && auth.state?.authenticated ? <TextField label="Merchandise delivery address" value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} multiline helperText="Required when ordering physical merchandise." /> : null}
      <Grid container spacing={2}>
        {products.map((product) => <Grid key={product.uuid} size={{ xs: 12, sm: 6, lg: 4 }}><Card sx={{ height: '100%' }}>
          {product.imageUrl ? <Box component="img" src={product.imageUrl} alt="" sx={{ width: '100%', height: 190, objectFit: 'cover' }} /> : null}
          <CardContent><Stack spacing={1.25}>
            <Chip label={labels[product.productType]} color="primary" sx={{ alignSelf: 'flex-start' }} />
            <Typography variant="h5" fontWeight={950}>{product.name}</Typography><Typography color="text.secondary">{product.description}</Typography>
            <Typography variant="h6">{money(product.priceMinor, product.currency)}{product.billingPeriod ? ` / ${product.billingPeriod}` : ''}</Typography>
            {product.stockQuantity !== null ? <Typography variant="body2">{product.stockQuantity} available</Typography> : null}
            {auth.state?.authenticated ? <Button variant="contained" disabled={checkout.isPending || product.stockQuantity === 0 || (product.productType === 'merchandise' && !deliveryAddress.trim())} onClick={() => checkout.mutate(product)}>Create order</Button> : <Button component={RouterLink} to="/login" variant="contained">Sign in to buy</Button>}
          </Stack></CardContent>
        </Card></Grid>)}
      </Grid>
      {!products.length ? <Alert severity="info">No products are available in this category yet.</Alert> : null}
      {auth.state?.authenticated ? <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}><Card><CardContent><Typography variant="h6" gutterBottom>My orders</Typography><Stack spacing={1}>{orders.data?.map((order) => <Box key={order.uuid}><Typography fontWeight={900}>{order.orderNumber} · {money(order.totalMinor, order.currency)}</Typography><Typography variant="body2" color="text.secondary">{order.status} · {order.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')}</Typography></Box>)}{!orders.data?.length ? <Typography color="text.secondary">No orders yet.</Typography> : null}</Stack></CardContent></Card></Grid>
        <Grid size={{ xs: 12, md: 6 }}><Card><CardContent><Typography variant="h6" gutterBottom>My access</Typography><Stack spacing={1}>{entitlements.data?.map((item) => <Box key={item.uuid}><Typography fontWeight={900}>{item.productName}</Typography><Typography variant="body2" color="text.secondary">{item.type} · {item.status}{item.accessCode ? ` · Code ${item.accessCode}` : ''}</Typography></Box>)}{!entitlements.data?.length ? <Typography color="text.secondary">Paid tickets and memberships will appear here.</Typography> : null}</Stack></CardContent></Card></Grid>
      </Grid> : null}
    </Stack>
  </PageScaffold>;
}
