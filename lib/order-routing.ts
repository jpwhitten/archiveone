export interface Provider {
  region: 'US' | 'UK' | 'AU'
  name: string
  url: string
}

export const PROVIDERS: Record<'US' | 'UK' | 'AU', Provider> = {
  US: { region: 'US', name: 'Printful US', url: 'https://printful.com' },
  UK: { region: 'UK', name: 'Prodigi UK', url: 'https://prodigi.com' },
  AU: { region: 'AU', name: 'Your AU Provider', url: '' },
}

const REGION_MAP: Record<string, 'US' | 'UK' | 'AU'> = {
  US: 'US', CA: 'US', MX: 'US',
  GB: 'UK', IE: 'UK', FR: 'UK', DE: 'UK', NL: 'UK',
  ES: 'UK', IT: 'UK', PT: 'UK', BE: 'UK', AT: 'UK',
  CH: 'UK', SE: 'UK', NO: 'UK', DK: 'UK', FI: 'UK', PL: 'UK',
  AU: 'AU', NZ: 'AU',
}

export function getProviderForCountry(countryCode: string): Provider {
  const region = REGION_MAP[countryCode] ?? 'UK'
  return PROVIDERS[region]
}
