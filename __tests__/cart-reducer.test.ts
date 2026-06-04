import { cartReducer } from '@/components/cart/CartContext'
import type { CartItem } from '@/lib/types'

const item: CartItem = {
  photoId: 'photo-1',
  photoTitle: 'Test Photo',
  photoSlug: 'test-photo',
  photoImage: { _type: 'image', asset: { _ref: 'ref', _type: 'reference' } },
  size: 'A3',
  frame: 'Black',
  price: 4500,
  stripePriceId: 'price_test',
  quantity: 1,
}

test('adds item to empty cart with quantity 1', () => {
  const state = cartReducer({ items: [] }, { type: 'ADD_ITEM', item })
  expect(state.items).toHaveLength(1)
  expect(state.items[0].photoId).toBe('photo-1')
  expect(state.items[0].quantity).toBe(1)
})

test('adding a duplicate increments quantity instead of duplicating', () => {
  const state = cartReducer({ items: [item] }, { type: 'ADD_ITEM', item })
  expect(state.items).toHaveLength(1)
  expect(state.items[0].quantity).toBe(2)
})

test('sets quantity for an item', () => {
  const state = cartReducer({ items: [item] }, { type: 'SET_QUANTITY', key: 'photo-1-A3-Black', quantity: 4 })
  expect(state.items[0].quantity).toBe(4)
})

test('setting quantity to 0 removes the item', () => {
  const state = cartReducer({ items: [item] }, { type: 'SET_QUANTITY', key: 'photo-1-A3-Black', quantity: 0 })
  expect(state.items).toHaveLength(0)
})

test('removes item by key', () => {
  const state = cartReducer({ items: [item] }, { type: 'REMOVE_ITEM', key: 'photo-1-A3-Black' })
  expect(state.items).toHaveLength(0)
})

test('clears all items', () => {
  const state = cartReducer({ items: [item] }, { type: 'CLEAR' })
  expect(state.items).toHaveLength(0)
})
