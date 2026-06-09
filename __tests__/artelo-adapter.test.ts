import { unfulfillableReason } from '@/lib/fulfillment/artelo'
import { ARTELO_SKUS } from '@/lib/fulfillment/artelo-catalog'
import type { FulfilmentOrder } from '@/lib/fulfillment/types'

function order(overrides: Partial<FulfilmentOrder['lines'][0]> = {}): FulfilmentOrder {
  return {
    sessionId: 'cs_test_123',
    region: 'US',
    country: 'US',
    customerName: 'Sarah M',
    customerEmail: 'sarah@example.com',
    shippingAddress: '14 Park Lane, NY',
    addressLines: ['14 Park Lane', 'New York'],
    city: 'New York',
    total: 5500,
    lines: [{
      photoId: 'photo-1',
      photoTitle: 'Inca Terns',
      size: 'A4',
      frame: 'Unframed',
      qty: 1,
      printFileUrl: 'https://cdn.example.com/master.jpg',
      ...overrides,
    }],
  }
}

test('returns a reason when a line has no print master', () => {
  ARTELO_SKUS['A4|Unframed'] = { productId: 'p1', variantId: 'v1' }
  const reason = unfulfillableReason(order({ printFileUrl: undefined }))
  expect(reason).toMatch(/master/i)
})

test('returns a reason when a line has no SKU mapping', () => {
  ARTELO_SKUS['A4|Unframed'] = { productId: '', variantId: '' } // unmapped
  const reason = unfulfillableReason(order())
  expect(reason).toMatch(/sku|mapping/i)
})

test('returns null when every line is mappable and has a master', () => {
  ARTELO_SKUS['A4|Unframed'] = { productId: 'p1', variantId: 'v1' }
  expect(unfulfillableReason(order())).toBeNull()
})
