import type { PrintVariant } from '@/lib/types'

export interface FulfilmentLine {
  photoId: string
  photoTitle: string
  size: PrintVariant['size']
  frame: PrintVariant['frame']
  qty: number
  printFileUrl?: string // full-res master; absent → manual fallback
  orientation?: 'Vertical' | 'Horizontal' // from the photo's aspect ratio
  unitPrice?: number // pence
}

export interface FulfilmentOrder {
  sessionId: string
  region: 'US' | 'UK' | 'AU'
  country: string
  currency?: string // ISO code, e.g. GBP (defaults to GBP)
  customerName: string
  customerEmail: string
  shippingAddress: string // joined, for the email
  addressLines: string[]
  // Structured address parts for the Artelo order API:
  street1?: string
  street2?: string
  city: string
  state?: string
  zipcode?: string
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
