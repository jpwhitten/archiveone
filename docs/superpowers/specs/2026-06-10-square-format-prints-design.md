# Square-Format Prints — Design Spec
**Date:** 2026-06-10
**Project:** Archive One (archiveone.studio)
**Status:** Approved for planning

---

## 1. Problem

A-series print sizes (A4–A1) are √2 rectangles (ratio 0.707 / 1.414). None of the catalogue's photos are exactly A-ratio, but the two **square** photos — **Penguin (1.000)** and **Luzzijiet (1.022)** — are the extreme case: forcing them onto an A-series sheet means a large crop or a large border. They should instead be sold as genuine **square prints** (square paper + square framing). Artelo's catalogue offers square `IndividualArtPrint` sizes with the same oak/black/white framing, so this is fulfillable.

## 2. Approach

Square photos get a **square size lineup** (20×20, 30×30, 40×40, 50×50 cm) instead of A4–A1. A photo's `variants` array remains the single source of truth for what it sells, so the rest of the app needs no notion of "format" beyond the size values present. The **pricing script** auto-detects square photos from aspect ratio and generates the square lineup; A-series photos are unchanged.

**Success criteria:** Penguin and Luzzijiet sell as 20/30/40/50 cm square prints in all four frames; their print page shows a 1:1 framed preview with cm captions; orders route to Artelo with the correct square size codes; A-series photos are completely unaffected.

## 3. Size Model

`PrintVariant['size']` union expands from `'A4' | 'A3' | 'A2' | 'A1'` to also include:
`'20×20' | '30×30' | '40×40' | '50×50'`.

The size value is self-describing (used directly as the UI label, suffixed " cm"). A photo carries **either** the A-series set **or** the square set — never both. Detection of which set is purely a pricing-script concern (below); the app derives everything from the variants present.

## 4. Detection (pricing script only)

In `scripts/setup-print-pricing.mjs`, read the photo's aspect ratio from Sanity (`image.asset->metadata.dimensions.aspectRatio`). If `|ratio − 1| ≤ 0.06` → square lineup, else A-series. No Sanity schema field.

## 5. Pricing (GBP pence, free shipping baked in)

Square retail prices, set to clear Artelo's square costs (production + GB shipping; verified live 2026-06-10) plus Stripe fees and margin. Black/White share a price; Natural a touch higher (mirrors the A-series convention).

| Size  | Unframed | Black | White | Natural |
|-------|----------|-------|-------|---------|
| 20×20 | 4500     | 9000  | 9000  | 9500    |
| 30×30 | 5500     | 10500 | 10500 | 11000   |
| 40×40 | 7500     | 14500 | 14500 | 15000   |
| 50×50 | 9500     | 18000 | 18000 | 18500   |

(Artelo landed cost reference, framed/oak: 20×20 ≈ £54, 30×30 ≈ £59, 40×40 ≈ £83, 50×50 ≈ £100. Margins are thinner than A-series because Artelo's GB shipping is steep — the same gap that motivates a future UK provider. Prices are easy one-line edits.)

## 6. Artelo Fulfilment

`lib/fulfillment/artelo-catalog.ts` `ARTELO_SIZE` gains the square codes:
`'20×20' → 'x8x8'`, `'30×30' → 'x12x12'`, `'40×40' → 'x16x16'`, `'50×50' → 'x20x20'`.
`arteloSpecFor` then resolves square variants with no other change. Orientation for a square print is `'Vertical'` (square — either is equivalent).

## 7. FramePreview

`SIZE_MAX` and `SIZE_CM` gain square entries. When the selected size is a square size, the preview locks the print window to **1:1** (the photo's slight non-squareness, e.g. Luzzijiet's 1.022, is cropped by `object-cover` — matching the real square print). Caption reads e.g. "Shown at 30 × 30 cm". Larger square sizes still render visibly bigger.

## 8. PrintSelector

Default the selected size to the photo's **first available** size (from its variants) rather than the hard-coded `'A3'`, so a square photo opens on `20×20` instead of a size it doesn't sell. The size/frame buttons already filter to the photo's available variants, so they need no change beyond the size union.

## 9. SizeGuide

Make the guide format-aware: for a square photo show the four square dimensions (20/30/40/50 cm) instead of the A-series table. Small conditional; keep the existing A-series content for everything else.

## 10. Files

```
lib/types.ts                          PrintVariant['size'] union + square sizes
scripts/setup-print-pricing.mjs       detect square; SQUARE_PRICING; branch variant generation
lib/fulfillment/artelo-catalog.ts     ARTELO_SIZE square codes
components/shop/FramePreview.tsx       square SIZE_MAX/SIZE_CM; lock 1:1 for square sizes
components/shop/PrintSelector.tsx      default to first available size
components/shop/SizeGuide.tsx          square dimensions for square photos
__tests__/artelo-catalog.test.ts       cover a square size mapping
```

Plus an operational step: re-run `npm run setup-pricing -- penguin` and `-- luzzijiet` to create their square Stripe prices.

## 11. Out of Scope

- Square sizes for non-square photos (square lineup is auto-assigned only to ~1:1 photos).
- A Sanity "format" field (auto-detection from aspect ratio suffices).
- Fixing Artelo's high GB shipping (separate UK-provider work, already on the roadmap).
