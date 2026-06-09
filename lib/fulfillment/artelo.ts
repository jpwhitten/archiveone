import { arteloSpecFor } from './artelo-catalog'
import type { FulfilmentOrder, FulfilmentProvider, FulfilmentResult } from './types'

// Verified live against the Artelo API (see memory: artelo-api-reference).
const BASE = 'https://www.artelo.io/api/open'

/**
 * Returns a human-readable reason the order cannot be submitted to Artelo,
 * or null if every line is mappable and has a print master.
 */
export function unfulfillableReason(order: FulfilmentOrder): string | null {
  for (const line of order.lines) {
    if (!line.printFileUrl) {
      return `Missing print master for "${line.photoTitle}" (${line.size} · ${line.frame})`
    }
    if (!arteloSpecFor(line.size, line.frame)) {
      return `No Artelo mapping for ${line.size} · ${line.frame}`
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

    const items = order.lines.map((line, i) => {
      const spec = arteloSpecFor(line.size, line.frame)! // guarded above
      return {
        orderItemId: `${order.sessionId}-${i}`,
        quantity: line.qty,
        unitPrice: (line.unitPrice ?? 0) / 100, // major units
        catalogProductId: spec.catalogProductId,
        size: spec.size,
        frameColor: spec.frameColor,
        paperType: spec.paperType,
        orientation: line.orientation ?? 'Vertical',
        designs: [{ sourceImage: { url: line.printFileUrl } }],
      }
    })

    const body = {
      orderId: order.sessionId,
      createdAt: new Date().toISOString(),
      currency: order.currency || 'GBP',
      total: order.total / 100, // major units
      customerAddress: {
        name: order.customerName,
        street1: order.street1 ?? order.addressLines[0] ?? '',
        street2: order.street2 ?? '',
        city: order.city,
        state: order.state ?? '',
        zipcode: order.zipcode ?? '',
        country: order.country,
      },
      items,
    }

    try {
      const res = await fetch(`${BASE}/orders/create`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        return { ok: false, provider: 'artelo', error: `Artelo ${res.status}: ${text.slice(0, 300)}` }
      }
      const data = (await res.json().catch(() => ({}))) as { orderId?: string; id?: string }
      return { ok: true, provider: 'artelo', providerOrderId: data.orderId ?? data.id }
    } catch (err) {
      return { ok: false, provider: 'artelo', error: String(err) }
    }
  },
}
