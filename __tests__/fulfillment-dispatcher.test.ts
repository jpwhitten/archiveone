import { dispatch } from '@/lib/fulfillment/dispatcher'
import type { FulfilmentOrder, FulfilmentProvider, FulfilmentResult } from '@/lib/fulfillment/types'

beforeEach(() => { process.env.ARTELO_ENABLED = 'true' })

function makeOrder(country: string): FulfilmentOrder {
  return {
    sessionId: 'cs_1', region: 'US', country,
    customerName: 'A', customerEmail: 'a@b.com',
    shippingAddress: 'x', addressLines: ['x'], city: 'NY', total: 100,
    lines: [{ photoId: 'p', photoTitle: 'T', size: 'A4', frame: 'Unframed', qty: 1, printFileUrl: 'u' }],
  }
}

const okArtelo: FulfilmentProvider = { name: 'artelo', async submit() { return { ok: true, provider: 'artelo', providerOrderId: 'AO1' } } }
const failArtelo: FulfilmentProvider = { name: 'artelo', async submit() { return { ok: false, provider: 'artelo', error: 'boom' } } }
const okEmail: FulfilmentProvider = { name: 'email', async submit() { return { ok: true, provider: 'email' } } }

test('US order goes to Artelo when it succeeds', async () => {
  const res = await dispatch(makeOrder('US'), { artelo: okArtelo, email: okEmail })
  expect(res.ok).toBe(true)
  expect(res.provider).toBe('artelo')
})

test('US order falls back to email when Artelo fails', async () => {
  const res = await dispatch(makeOrder('US'), { artelo: failArtelo, email: okEmail })
  expect(res.ok).toBe(true)
  expect(res.provider).toBe('email')
})

test('non-US order goes straight to email', async () => {
  let arteloCalled = false
  const spyArtelo: FulfilmentProvider = { name: 'artelo', async submit() { arteloCalled = true; return { ok: false, provider: 'artelo', error: '' } } }
  const res = await dispatch(makeOrder('GB'), { artelo: spyArtelo, email: okEmail })
  expect(res.provider).toBe('email')
  expect(arteloCalled).toBe(false)
})

test('ARTELO_ENABLED=false sends US to email', async () => {
  const res = await dispatch(makeOrder('US'), { artelo: okArtelo, email: okEmail, arteloEnabled: false })
  expect(res.provider).toBe('email')
})
