import { getProviderForCountry, PROVIDERS } from '@/lib/order-routing'

test('routes US to US provider', () => {
  expect(getProviderForCountry('US').region).toBe('US')
})

test('routes CA to US provider', () => {
  expect(getProviderForCountry('CA').region).toBe('US')
})

test('routes GB to UK provider', () => {
  expect(getProviderForCountry('GB').region).toBe('UK')
})

test('routes FR to UK provider', () => {
  expect(getProviderForCountry('FR').region).toBe('UK')
})

test('routes AU to AU provider', () => {
  expect(getProviderForCountry('AU').region).toBe('AU')
})

test('routes NZ to AU provider', () => {
  expect(getProviderForCountry('NZ').region).toBe('AU')
})

test('routes unknown country to UK provider', () => {
  expect(getProviderForCountry('JP').region).toBe('UK')
})

test('all providers have name and region fields', () => {
  Object.values(PROVIDERS).forEach(p => {
    expect(p.name).toBeTruthy()
    expect(p.region).toBeTruthy()
  })
})
