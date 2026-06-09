import type { FulfilmentOrder, FulfilmentProvider, FulfilmentResult } from './types'

const ARTELO_COUNTRIES = new Set(['US', 'CA', 'MX'])

interface DispatchDeps {
  artelo?: FulfilmentProvider
  email?: FulfilmentProvider
  arteloEnabled?: boolean
}

export async function dispatch(
  order: FulfilmentOrder,
  deps: DispatchDeps = {}
): Promise<FulfilmentResult> {
  // Default providers are imported dynamically so the jsdom test environment never loads
  // 'resend' (which needs TextEncoder) at module-eval time. Injected deps bypass these entirely.
  const artelo = deps.artelo ?? (await import('./artelo')).arteloProvider
  const email = deps.email ?? (await import('./email')).emailProvider
  const arteloEnabled = deps.arteloEnabled ?? process.env.ARTELO_ENABLED === 'true'

  if (arteloEnabled && ARTELO_COUNTRIES.has(order.country)) {
    const res = await artelo.submit(order)
    if (res.ok) return res
    // fall through to email on any Artelo failure
  }
  return email.submit(order)
}
