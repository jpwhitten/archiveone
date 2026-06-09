import { arteloSkuFor } from './artelo-catalog'
import type { FulfilmentOrder, FulfilmentProvider, FulfilmentResult } from './types'

/**
 * Returns a human-readable reason the order cannot be submitted to Artelo,
 * or null if every line is mappable and has a print master.
 */
export function unfulfillableReason(order: FulfilmentOrder): string | null {
  for (const line of order.lines) {
    if (!line.printFileUrl) {
      return `Missing print master for "${line.photoTitle}" (${line.size} · ${line.frame})`
    }
    if (!arteloSkuFor(line.size, line.frame)) {
      return `No Artelo SKU mapping for ${line.size} · ${line.frame}`
    }
  }
  return null
}

export const arteloProvider: FulfilmentProvider = {
  name: 'artelo',
  async submit(order: FulfilmentOrder): Promise<FulfilmentResult> {
    const reason = unfulfillableReason(order)
    if (reason) return { ok: false, provider: 'artelo', error: reason }
    // Real Artelo HTTP call added in Task 7.
    return { ok: false, provider: 'artelo', error: 'Artelo submit not yet implemented' }
  },
}
