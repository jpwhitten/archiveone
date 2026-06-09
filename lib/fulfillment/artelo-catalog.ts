import type { PrintVariant } from '@/lib/types'

export interface ArteloSku {
  productId: string
  variantId: string
}

// Map our (size, frame) → Artelo catalog identifiers.
// IDs are filled from the owner's Artelo catalogue (fine-art matte A-sizes × Oak frames).
// Empty strings = not yet mapped → arteloSkuFor returns null → manual fallback.
export const ARTELO_SKUS: Record<string, ArteloSku> = {
  'A4|Unframed': { productId: '', variantId: '' },
  'A4|Black':    { productId: '', variantId: '' },
  'A4|White':    { productId: '', variantId: '' },
  'A4|Natural':  { productId: '', variantId: '' },
  'A3|Unframed': { productId: '', variantId: '' },
  'A3|Black':    { productId: '', variantId: '' },
  'A3|White':    { productId: '', variantId: '' },
  'A3|Natural':  { productId: '', variantId: '' },
  'A2|Unframed': { productId: '', variantId: '' },
  'A2|Black':    { productId: '', variantId: '' },
  'A2|White':    { productId: '', variantId: '' },
  'A2|Natural':  { productId: '', variantId: '' },
  'A1|Unframed': { productId: '', variantId: '' },
  'A1|Black':    { productId: '', variantId: '' },
  'A1|White':    { productId: '', variantId: '' },
  'A1|Natural':  { productId: '', variantId: '' },
}

export function arteloSkuFor(
  size: PrintVariant['size'],
  frame: PrintVariant['frame']
): ArteloSku | null {
  const sku = ARTELO_SKUS[`${size}|${frame}`]
  if (!sku || !sku.productId || !sku.variantId) return null
  return sku
}
