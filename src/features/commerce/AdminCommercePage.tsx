import {
  Alert,
  Button,
  Card,
  CardContent,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { useApi } from '../../api/context';
import { ErrorState, LoadingState } from '../../components/AsyncStates';
import { PageScaffold } from '../../components/PageScaffold';

const initial = {
  productType: 'ticket',
  name: '',
  description: '',
  imageUrl: '',
  priceMinor: 0,
  currency: 'NGN',
  stockQuantity: '',
  fixtureId: '',
  billingPeriod: 'monthly',
  status: 'active',
};
const money = (minor: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(minor / 100);

export function AdminCommercePage() {
  const api = useApi();
  const client = useQueryClient();
  const [form, setForm] = useState(initial);
  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [ticketCode, setTicketCode] = useState('');
  const dashboard = useQuery({ queryKey: ['commerce-admin'], queryFn: api.getCommerceAdmin });
  const create = useMutation({
    mutationFn: () =>
      editingUuid ? api.updateCommerceProduct(editingUuid, form) : api.createCommerceProduct(form),
    onSuccess: () => {
      setForm(initial);
      setEditingUuid(null);
      void client.invalidateQueries({ queryKey: ['commerce-admin'] });
    },
  });
  const settle = useMutation({
    mutationFn: (uuid: string) => api.settleCommerceOrder(uuid, `manual-${Date.now()}`),
    onSuccess: () => client.invalidateQueries({ queryKey: ['commerce-admin'] }),
  });
  const fulfil = useMutation({
    mutationFn: api.fulfilCommerceOrder,
    onSuccess: () => client.invalidateQueries({ queryKey: ['commerce-admin'] }),
  });
  const redeem = useMutation({
    mutationFn: api.redeemCommerceTicket,
    onSuccess: () => setTicketCode(''),
  });
  if (dashboard.isLoading) return <LoadingState label="Loading commerce operations" />;
  if (dashboard.isError || !dashboard.data)
    return <ErrorState description="Commerce operations could not be loaded." />;
  const { report, products, orders } = dashboard.data;
  return (
    <PageScaffold
      eyebrow="Commercial"
      title="Commerce & revenue"
      description="Manage supporter memberships, match tickets, merchandise inventory, orders and fulfilment from one auditable workspace."
    >
      <Stack spacing={3}>
        <Alert severity="info">
          Prices are calculated by the server. Manual payment confirmation is available now; connect
          a supported payment provider before enabling automatic settlement.{' '}
          <Button component={RouterLink} to="/admin/streaming" size="small">
            Open sponsor reporting
          </Button>
        </Alert>
        <Grid container spacing={2}>
          {[
            ['Gross revenue', money(report.grossRevenueMinor)],
            ['Paid orders', report.paidOrders],
            ['Pending orders', report.pendingOrders],
            ['Active products', report.activeProducts],
          ].map(([label, value]) => (
            <Grid key={String(label)} size={{ xs: 6, md: 3 }}>
              <Card>
                <CardContent>
                  <Typography color="text.secondary">{label}</Typography>
                  <Typography variant="h4" fontWeight={950}>
                    {value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Create product</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    select
                    fullWidth
                    label="Type"
                    value={form.productType}
                    onChange={(e) => setForm({ ...form, productType: e.target.value })}
                  >
                    <MenuItem value="subscription">Subscription</MenuItem>
                    <MenuItem value="ticket">Ticket</MenuItem>
                    <MenuItem value="merchandise">Merchandise</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <TextField
                    fullWidth
                    label="Name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    multiline
                    label="Description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Product image URL"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Fixture database ID"
                    value={form.fixtureId}
                    onChange={(e) => setForm({ ...form, fixtureId: e.target.value })}
                    disabled={form.productType !== 'ticket'}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField
                    select
                    fullWidth
                    label="Billing period"
                    value={form.billingPeriod}
                    onChange={(e) => setForm({ ...form, billingPeriod: e.target.value })}
                    disabled={form.productType !== 'subscription'}
                  >
                    <MenuItem value="monthly">Monthly</MenuItem>
                    <MenuItem value="annual">Annual</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Price (kobo)"
                    value={form.priceMinor}
                    onChange={(e) => setForm({ ...form, priceMinor: Number(e.target.value) })}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField
                    fullWidth
                    label="Currency"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Stock (blank = unlimited)"
                    value={form.stockQuantity}
                    onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
                  />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField
                    select
                    fullWidth
                    label="Status"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="archived">Archived</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="contained"
                  disabled={!form.name.trim() || create.isPending}
                  onClick={() => create.mutate()}
                >
                  {editingUuid ? 'Save product' : 'Create product'}
                </Button>
                {editingUuid ? (
                  <Button
                    onClick={() => {
                      setEditingUuid(null);
                      setForm(initial);
                    }}
                  >
                    Cancel edit
                  </Button>
                ) : null}
              </Stack>
              {create.isError ? <Alert severity="error">Product could not be saved.</Alert> : null}
            </Stack>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ sm: 'center' }}
            >
              <TextField
                label="Ticket access code"
                value={ticketCode}
                onChange={(event) => setTicketCode(event.target.value)}
                sx={{ flex: 1 }}
              />
              <Button
                variant="contained"
                disabled={!ticketCode.trim() || redeem.isPending}
                onClick={() => redeem.mutate(ticketCode)}
              >
                Validate & redeem
              </Button>
              {redeem.isSuccess ? <Alert severity="success">Ticket accepted.</Alert> : null}
              {redeem.isError ? (
                <Alert severity="error">Ticket invalid or already used.</Alert>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 5 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Catalogue
                </Typography>
                <Stack spacing={1.5}>
                  {products.map((product) => (
                    <Stack
                      key={product.uuid}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <span>
                        <Typography fontWeight={900}>{product.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {product.productType} · {product.status} · {money(product.priceMinor)} ·{' '}
                          {product.stockQuantity ?? 'Unlimited'} stock
                        </Typography>
                      </span>
                      <Button
                        size="small"
                        onClick={() => {
                          setEditingUuid(product.uuid);
                          setForm({
                            productType: product.productType,
                            name: product.name,
                            description: product.description,
                            imageUrl: product.imageUrl,
                            priceMinor: product.priceMinor,
                            currency: product.currency,
                            stockQuantity:
                              product.stockQuantity === null ? '' : String(product.stockQuantity),
                            fixtureId: product.fixtureId === null ? '' : String(product.fixtureId),
                            billingPeriod: product.billingPeriod ?? 'monthly',
                            status: product.status,
                          });
                        }}
                      >
                        Edit
                      </Button>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Orders & fulfilment
                </Typography>
                <Stack spacing={1.5}>
                  {orders.map((order) => (
                    <Stack
                      key={order.uuid}
                      direction={{ xs: 'column', sm: 'row' }}
                      justifyContent="space-between"
                      gap={1}
                    >
                      <span>
                        <Typography fontWeight={900}>
                          {order.orderNumber} · {money(order.totalMinor)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {order.status} ·{' '}
                          {order.items.map((item) => `${item.quantity}× ${item.name}`).join(', ')}
                        </Typography>
                      </span>
                      {order.status === 'pending' ? (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => settle.mutate(order.uuid)}
                        >
                          Confirm payment
                        </Button>
                      ) : null}
                      {order.status === 'paid' ? (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => fulfil.mutate(order.uuid)}
                        >
                          Mark fulfilled
                        </Button>
                      ) : null}
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    </PageScaffold>
  );
}
