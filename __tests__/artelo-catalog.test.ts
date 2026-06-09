import { arteloSkuFor, ARTELO_SKUS } from '@/lib/fulfillment/artelo-catalog'

test('returns SKU for a mapped size+frame', () => {
  // Seed a known entry so the test is independent of real catalog IDs
  ARTELO_SKUS['A4|Unframed'] = { productId: 'p_test', variantId: 'v_test' }
  expect(arteloSkuFor('A4', 'Unframed')).toEqual({ productId: 'p_test', variantId: 'v_test' })
})

test('returns null for an unmapped combination', () => {
  expect(arteloSkuFor('A1', 'Natural')).toBeNull()
})
