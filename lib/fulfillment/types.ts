import type { PrintVariant } from '@/lib/types'

export interface FulfilmentLine {
  photoId: string
  photoTitle: string
  size: PrintVariant['size']
  frame: PrintVariant['frame']
  qty: number
  printFileUrl?: string // full-res master; absent → manual fallback
}

export interface FulfilmentOrder {
  sessionId: string
  region: 'US' | 'UK' | 'AU'
  country: string
  customerName: string
  customerEmail: string
  shippingAddress: string
  addressLines: string[]
  city: string
  total: number // pence
  lines: FulfilmentLine[]
}

export type FulfilmentResult =
  | { ok: true; provider: string; providerOrderId?: string }
  | { ok: false; provider: string; error: string }

export interface FulfilmentProvider {
  name: string
  submit(order: FulfilmentOrder): Promise<FulfilmentResult>
}
