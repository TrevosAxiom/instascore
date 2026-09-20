import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StorefrontPage } from '../../src/features/commerce/StorefrontPage';
import { AdminCommercePage } from '../../src/features/commerce/AdminCommercePage';
import { adminAuth, renderApp, testApi } from './test-utils';

const ticket = { uuid: 'product-1', productType: 'ticket' as const, name: 'CFFL Finals Ticket', slug: 'cffl-finals', description: 'Entry to the championship game.', imageUrl: '', priceMinor: 500000, currency: 'NGN', stockQuantity: 40, fixtureId: null, billingPeriod: null, status: 'active' as const };

describe('commercial milestone UI', () => {
  it('shows catalogue products and creates a server-priced order', async () => {
    const checkoutCommerce = vi.fn(testApi.checkoutCommerce);
    renderApp(<StorefrontPage />, { auth: adminAuth, api: { ...testApi, getCommerceCatalogue: () => Promise.resolve([ticket]), checkoutCommerce } });
    expect(await screen.findByText('CFFL Finals Ticket')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Create order' }));
    await waitFor(() => expect(checkoutCommerce).toHaveBeenCalledWith({ items: [{ productUuid: 'product-1', quantity: 1 }], paymentMethod: 'manual', customerName: 'League Admin', deliveryAddress: '' }));
  });

  it('gives administrators a product and revenue workspace', async () => {
    renderApp(<AdminCommercePage />, { auth: adminAuth, api: { ...testApi, getCommerceAdmin: () => Promise.resolve({ products: [ticket], orders: [], report: { grossRevenueMinor: 500000, paidOrders: 1, pendingOrders: 0, activeProducts: 1 } }) } });
    expect(await screen.findByText('Commerce & revenue')).toBeInTheDocument();
    expect(screen.getByText('CFFL Finals Ticket')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create product' })).toBeInTheDocument();
  });
});
