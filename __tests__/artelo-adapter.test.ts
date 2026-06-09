import { unfulfillableReason } from '@/lib/fulfillment/artelo'
import type { FulfilmentOrder } from '@/lib/fulfillment/types'

function order(overrides: Partial<FulfilmentOrder['lines'][0]> = {}): FulfilmentOrder {
  return {
    sessionId: 'cs_test_123',
    region: 'US',
    country: 'US',
    currency: 'GBP',
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
  expect(unfulfillableReason(order({ printFileUrl: undefined }))).toMatch(/master/i)
})

test('returns a reason for an unmapped size', () => {
  // @ts-expect-error testing an out-of-range size
  expect(unfulfillableReason(order({ size: 'A9' }))).toMatch(/mapping/i)
})

test('returns null when every line is mappable and has a master', () => {
  expect(unfulfillableReason(order())).toBeNull()
})
