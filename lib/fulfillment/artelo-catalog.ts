import type { PrintVariant } from '@/lib/types'

// Artelo specifies products by a set of enums (verified live against the API),
// not arbitrary SKU ids. We sell Individual Art Prints, fine-art archival matte,
// in oak frames. These maps translate our (size, frame) to Artelo's enum codes.

export const ARTELO_PRODUCT = 'IndividualArtPrint'
export const ARTELO_PAPER = 'ArchivalMatteFineArt'

// A-series → Artelo size code (decimal-inch with "dot" notation).
export const ARTELO_SIZE: Record<PrintVariant['size'], string> = {
  A4: 'x8dot3x11dot7',
  A3: 'x11dot7x16dot5',
  A2: 'x16dot5x23dot4',
  A1: 'x23dot4x33dot1',
  '20×20': 'x8x8',
  '30×30': 'x12x12',
  '40×40': 'x16x16',
  '50×50': 'x20x20',
}

// Our frame label → Artelo frameColor code (oak frames).
export const ARTELO_FRAME_COLOR: Record<PrintVariant['frame'], string> = {
  Unframed: 'Unframed',
  Black: 'BlackOak',
  White: 'WhiteOak',
  Natural: 'NaturalOak',
}

export interface ArteloItemSpec {
  catalogProductId: string
  size: string
  frameColor: string
  paperType: string
}

/**
 * The Artelo enum spec for a given size+frame, or null if either is unmapped
 * (an unmapped variant falls back to the manual email flow).
 */
export function arteloSpecFor(
  size: PrintVariant['size'],
  frame: PrintVariant['frame']
): ArteloItemSpec | null {
  const sizeCode = ARTELO_SIZE[size]
  const frameColor = ARTELO_FRAME_COLOR[frame]
  if (!sizeCode || !frameColor) return null
  return {
    catalogProductId: ARTELO_PRODUCT,
    size: sizeCode,
    frameColor,
    paperType: ARTELO_PAPER,
  }
}
