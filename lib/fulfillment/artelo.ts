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

    const apiKey = process.env.ARTELO_API_KEY
    if (!apiKey) return { ok: false, provider: 'artelo', error: 'ARTELO_API_KEY not set' }

    // NOTE: endpoint/headers/body confirmed against Artelo docs before go-live.
    const items = order.lines.map(line => {
      const sku = arteloSkuFor(line.size, line.frame)! // guarded by unfulfillableReason
      return {
        productId: sku.productId,
        variantId: sku.variantId,
        quantity: line.qty,
        artworkUrl: line.printFileUrl,
      }
    })

    const body = {
      idempotencyKey: order.sessionId,
      recipient: {
        name: order.customerName,
        email: order.customerEmail,
        address: order.addressLines,
        country: order.country,
      },
      items,
    }

    try {
      const res = await fetch('https://api.artelo.io/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': order.sessionId,
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        return { ok: false, provider: 'artelo', error: `Artelo ${res.status}: ${text.slice(0, 300)}` }
      }
      const data = await res.json().catch(() => ({})) as { id?: string; orderId?: string }
      return { ok: true, provider: 'artelo', providerOrderId: data.id ?? data.orderId }
    } catch (err) {
      return { ok: false, provider: 'artelo', error: String(err) }
    }
  },
}
