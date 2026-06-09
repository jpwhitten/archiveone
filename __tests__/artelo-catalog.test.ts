import {
  arteloSpecFor,
  ARTELO_SIZE,
  ARTELO_FRAME_COLOR,
  ARTELO_PRODUCT,
  ARTELO_PAPER,
} from '@/lib/fulfillment/artelo-catalog'

test('A-series sizes map to Artelo size codes', () => {
  expect(ARTELO_SIZE.A4).toBe('x8dot3x11dot7')
  expect(ARTELO_SIZE.A3).toBe('x11dot7x16dot5')
  expect(ARTELO_SIZE.A2).toBe('x16dot5x23dot4')
  expect(ARTELO_SIZE.A1).toBe('x23dot4x33dot1')
})

test('frames map to oak frameColor codes', () => {
  expect(ARTELO_FRAME_COLOR).toEqual({
    Unframed: 'Unframed',
    Black: 'BlackOak',
    White: 'WhiteOak',
    Natural: 'NaturalOak',
  })
})

test('arteloSpecFor returns the full enum spec for a valid size+frame', () => {
  expect(arteloSpecFor('A3', 'Black')).toEqual({
    catalogProductId: ARTELO_PRODUCT,
    size: 'x11dot7x16dot5',
    frameColor: 'BlackOak',
    paperType: ARTELO_PAPER,
  })
})

test('arteloSpecFor returns null for an unmapped size', () => {
  // @ts-expect-error testing an out-of-range size
  expect(arteloSpecFor('A9', 'Black')).toBeNull()
})
