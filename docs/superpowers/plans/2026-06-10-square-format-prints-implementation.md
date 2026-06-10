# Square-Format Prints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sell square (~1:1) photos as genuine square prints (20×20 / 30×30 / 40×40 / 50×50 cm) instead of A4–A1, across the size model, preview, pricing, size guide, and Artelo fulfilment.

**Architecture:** Square sizes join the `PrintVariant['size']` union; a photo's `variants` array stays the single source of truth for what it sells. The pricing script auto-detects square photos by aspect ratio and generates the square lineup. The app derives everything (preview shape, size buttons, size guide) from the size values present — no Sanity format field.

**Tech Stack:** Next.js 16, TypeScript, Sanity, Stripe, Jest. Size values use the `×` character (U+00D7), e.g. `'20×20'`.

---

## Task 1: Size model + Artelo square codes

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/fulfillment/artelo-catalog.ts`
- Modify: `components/shop/FramePreview.tsx`
- Modify: `__tests__/artelo-catalog.test.ts`

**Context:** Expanding the size union breaks every exhaustive `Record<PrintVariant['size'], …>` until square keys are added — so the union and all three size-keyed maps change together to keep the build green.

- [ ] **Step 1: Expand the size union in `lib/types.ts`**

In the `PrintVariant` interface, change the `size` line to:

```typescript
  size: 'A4' | 'A3' | 'A2' | 'A1' | '20×20' | '30×30' | '40×40' | '50×50'
```

- [ ] **Step 2: Add square codes to `ARTELO_SIZE` in `lib/fulfillment/artelo-catalog.ts`**

Replace the `ARTELO_SIZE` map with:

```typescript
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
```

- [ ] **Step 3: Add square entries to `SIZE_MAX` and `SIZE_CM` in `components/shop/FramePreview.tsx`**

Replace both maps with:

```typescript
const SIZE_MAX: Record<PrintVariant['size'], number> = {
  A4: 180,
  A3: 225,
  A2: 270,
  A1: 315,
  '20×20': 170,
  '30×30': 215,
  '40×40': 260,
  '50×50': 305,
}

const SIZE_CM: Record<PrintVariant['size'], string> = {
  A4: '21 × 30 cm',
  A3: '30 × 42 cm',
  A2: '42 × 59 cm',
  A1: '59 × 84 cm',
  '20×20': '20 × 20 cm',
  '30×30': '30 × 30 cm',
  '40×40': '40 × 40 cm',
  '50×50': '50 × 50 cm',
}
```

- [ ] **Step 4: Add a square-mapping test to `__tests__/artelo-catalog.test.ts`**

Append:

```typescript
test('square sizes map to Artelo square codes', () => {
  expect(ARTELO_SIZE['20×20']).toBe('x8x8')
  expect(ARTELO_SIZE['50×50']).toBe('x20x20')
  expect(arteloSpecFor('30×30', 'Natural')).toEqual({
    catalogProductId: ARTELO_PRODUCT,
    size: 'x12x12',
    frameColor: 'NaturalOak',
    paperType: ARTELO_PAPER,
  })
})
```

- [ ] **Step 5: Run tests + build**

```bash
npx jest artelo-catalog && npm run build
```
Expected: catalog tests pass (now 5 in that file); build compiles.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/fulfillment/artelo-catalog.ts components/shop/FramePreview.tsx __tests__/artelo-catalog.test.ts
git commit -m "feat: square print sizes in the size model + Artelo codes"
```

---

## Task 2: Square preview locks to 1:1

**Files:**
- Modify: `components/shop/FramePreview.tsx`

**Context:** For a square size the printed product is 1:1, so the preview must render a square window regardless of the photo's exact ratio (Luzzijiet is 1.022 — `object-cover` crops the 2% overflow, matching the real square print).

- [ ] **Step 1: Add a square-size set and force ratio 1 in `components/shop/FramePreview.tsx`**

Just below the `SIZE_CM` map, add:

```typescript
const SQUARE_SIZES = new Set<PrintVariant['size']>(['20×20', '30×30', '40×40', '50×50'])
```

Then in the component body, replace the existing ratio line:

```typescript
  const ratio = aspectRatio && aspectRatio > 0 ? aspectRatio : 1
```

with:

```typescript
  // Square sizes print 1:1 regardless of the photo's exact ratio.
  const ratio = SQUARE_SIZES.has(size) ? 1 : aspectRatio && aspectRatio > 0 ? aspectRatio : 1
```

- [ ] **Step 2: Build**

```bash
npm run build
```
Expected: compiles.

- [ ] **Step 3: Commit**

```bash
git add components/shop/FramePreview.tsx
git commit -m "feat: frame preview renders square sizes at 1:1"
```

---

## Task 3: PrintSelector defaults to the photo's first size

**Files:**
- Modify: `components/shop/PrintSelector.tsx`

**Context:** The selector hard-codes the initial size to `'A3'`. A square photo has no A3, so it would open with no price selected. Default to the photo's first available size, and include square sizes in the ordering list.

- [ ] **Step 1: Update the SIZES constant in `components/shop/PrintSelector.tsx`**

Replace:

```typescript
const SIZES: PrintVariant['size'][] = ['A4', 'A3', 'A2', 'A1']
```

with:

```typescript
const SIZES: PrintVariant['size'][] = ['A4', 'A3', 'A2', 'A1', '20×20', '30×30', '40×40', '50×50']
```

- [ ] **Step 2: Default the size state to the first available size**

Replace:

```typescript
  const [size, setSize] = useState<PrintVariant['size']>('A3')
```

with:

```typescript
  const [size, setSize] = useState<PrintVariant['size']>(photo.variants?.[0]?.size ?? 'A4')
```

- [ ] **Step 3: Build**

```bash
npm run build
```
Expected: compiles.

- [ ] **Step 4: Commit**

```bash
git add components/shop/PrintSelector.tsx
git commit -m "feat: print selector defaults to the photo's first available size"
```

---

## Task 4: Pricing script generates the square lineup

**Files:**
- Modify: `scripts/setup-print-pricing.mjs`

**Context:** The script must detect a square photo by aspect ratio and generate the square sizes with square prices, leaving A-series photos unchanged. The existing lookup-key generation (`.replace(/[^a-z0-9-]/g, '')`) strips the `×`, so `'20×20'` → key `…-2020-…`, which is valid for Stripe.

- [ ] **Step 1: Add the square matrices next to `PRICING` in `scripts/setup-print-pricing.mjs`**

Immediately after the `const FRAMES = [...]` line, add:

```javascript
// Square-format prices (GBP pence). Square photos sell these instead of A-series.
const SQUARE_PRICING = {
  '20×20': { Unframed: 4500, Black: 9000, White: 9000, Natural: 9500 },
  '30×30': { Unframed: 5500, Black: 10500, White: 10500, Natural: 11000 },
  '40×40': { Unframed: 7500, Black: 14500, White: 14500, Natural: 15000 },
  '50×50': { Unframed: 9500, Black: 18000, White: 18000, Natural: 18500 },
}
const SQUARE_SIZES = ['20×20', '30×30', '40×40', '50×50']
```

- [ ] **Step 2: Fetch the aspect ratio**

Replace the photo fetch projection:

```javascript
    `*[_type == "photo" && slug.current == $slug][0]{ _id, title, "slug": slug.current }`,
```

with:

```javascript
    `*[_type == "photo" && slug.current == $slug][0]{ _id, title, "slug": slug.current, "aspectRatio": image.asset->metadata.dimensions.aspectRatio }`,
```

- [ ] **Step 3: Pick the lineup by format, just after the `console.log(\`\nPhoto: ...\`)` lines**

Immediately after the `console.log(dryRun ? '(dry run — no changes will be made)\n' : '')` line, add:

```javascript
  const isSquare = photo.aspectRatio != null && Math.abs(photo.aspectRatio - 1) <= 0.06
  const sizes = isSquare ? SQUARE_SIZES : SIZES
  const priceMatrix = isSquare ? SQUARE_PRICING : PRICING
  console.log(`Format: ${isSquare ? 'square' : 'A-series'}\n`)
```

- [ ] **Step 4: Use `sizes` / `priceMatrix` in the dry-run loop**

Replace the dry-run block:

```javascript
    for (const size of SIZES) {
      for (const frame of FRAMES) {
        console.log(`  ${size} · ${frame.padEnd(8)} → ${gbp(PRICING[size][frame])}`)
      }
    }
```

with:

```javascript
    for (const size of sizes) {
      for (const frame of FRAMES) {
        console.log(`  ${size} · ${frame.padEnd(8)} → ${gbp(priceMatrix[size][frame])}`)
      }
    }
```

- [ ] **Step 5: Use `sizes` / `priceMatrix` in the real price-creation loop**

Replace the two loop headers and the amount lookup in the price-creation section:

```javascript
  for (const size of SIZES) {
    for (const frame of FRAMES) {
      const amount = PRICING[size][frame]
```

with:

```javascript
  for (const size of sizes) {
    for (const frame of FRAMES) {
      const amount = priceMatrix[size][frame]
```

- [ ] **Step 6: Dry-run on a square photo to verify**

```bash
node scripts/setup-print-pricing.mjs penguin --dry
```
Expected: prints `Format: square` then the four square sizes × four frames with GBP prices. No Stripe/Sanity writes.

- [ ] **Step 7: Commit**

```bash
git add scripts/setup-print-pricing.mjs
git commit -m "feat: pricing script auto-detects square photos and prices the square lineup"
```

---

## Task 5: Size guide shows square dimensions

**Files:**
- Modify: `components/shop/SizeGuide.tsx`
- Modify: `app/(site)/shop/[slug]/page.tsx`

**Context:** The guide draws nested A-series rectangles to scale with a 1.7 m silhouette. Make it format-aware: a `square` prop swaps in nested squares at the same real-world scale (so a 50 cm square correctly reads as small beside the figure).

- [ ] **Step 1: Rewrite `components/shop/SizeGuide.tsx` to take a `square` prop**

Replace the whole file with:

```tsx
// Visual size comparison. Nested, bottom-left aligned rectangles drawn to a
// fixed real-world scale, with a human silhouette (~170cm) for reference.

interface SizeRow {
  name: string
  w: number // mm
  h: number // mm
  cm: string
}

const A_SIZES: SizeRow[] = [
  { name: 'A1', w: 594, h: 841, cm: '59.4 × 84.1 cm' },
  { name: 'A2', w: 420, h: 594, cm: '42.0 × 59.4 cm' },
  { name: 'A3', w: 297, h: 420, cm: '29.7 × 42.0 cm' },
  { name: 'A4', w: 210, h: 297, cm: '21.0 × 29.7 cm' },
]

const SQUARE_SIZES: SizeRow[] = [
  { name: '50×50', w: 500, h: 500, cm: '50 × 50 cm' },
  { name: '40×40', w: 400, h: 400, cm: '40 × 40 cm' },
  { name: '30×30', w: 300, h: 300, cm: '30 × 30 cm' },
  { name: '20×20', w: 200, h: 200, cm: '20 × 20 cm' },
]

const HUMAN_CM = 170
const PX_PER_MM = 280 / 841 // fixed: A1's 841mm height = 280px
const humanH = HUMAN_CM * 10 * PX_PER_MM

export default function SizeGuide({ square = false }: { square?: boolean }) {
  const sizes = square ? SQUARE_SIZES : A_SIZES
  const boxW = sizes[0].w * PX_PER_MM
  const boxH = sizes[0].h * PX_PER_MM

  return (
    <div className="bg-mist p-6">
      <div className="flex items-end justify-center gap-8" style={{ height: humanH + 24 }}>
        {/* Human silhouette for scale */}
        <div className="flex flex-col items-center justify-end h-full">
          <div className="w-6 bg-ink/15 rounded-t-full" style={{ height: humanH }} aria-hidden />
          <span className="mt-2 text-[10px] font-mono text-ink/40">1.7m</span>
        </div>

        {/* Nested print sizes */}
        <div className="relative self-end" style={{ width: boxW, height: boxH }}>
          {sizes.map((s, i) => (
            <div
              key={s.name}
              className="absolute bottom-0 left-0 border border-ink/40 flex items-start justify-center"
              style={{
                width: s.w * PX_PER_MM,
                height: s.h * PX_PER_MM,
                background: `rgba(10,10,10,${0.03 + i * 0.03})`,
              }}
            >
              <span className="mt-1 text-[10px] font-mono text-ink/60">{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      <table className="w-full mt-6 text-xs font-mono text-ink/60">
        <tbody>
          {sizes.slice().reverse().map(s => (
            <tr key={s.name} className="border-t border-ink/10">
              <td className="py-2 text-ink/80">{s.name}</td>
              <td className="py-2 text-right">{s.cm}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Pass the format from `app/(site)/shop/[slug]/page.tsx`**

Just after the line `const soldOut = isSoldOut()`, add:

```tsx
  const squareSizes = ['20×20', '30×30', '40×40', '50×50']
  const isSquarePrint = photo.variants?.some(v => squareSizes.includes(v.size)) ?? false
```

Then change the size-guide usage from:

```tsx
                <SizeGuide />
```

to:

```tsx
                <SizeGuide square={isSquarePrint} />
```

- [ ] **Step 3: Build**

```bash
npm run build
```
Expected: compiles.

- [ ] **Step 4: Commit**

```bash
git add components/shop/SizeGuide.tsx "app/(site)/shop/[slug]/page.tsx"
git commit -m "feat: size guide shows square dimensions for square photos"
```

---

## Task 6: Apply pricing to the two square photos

**Files:** none (operational — creates Stripe **test-mode** prices + sets `forSale`).

- [ ] **Step 1: Generate square prices for both square photos**

```bash
node scripts/setup-print-pricing.mjs penguin
node scripts/setup-print-pricing.mjs luzzijiet
```
Expected: each prints `Format: square`, creates 16 square variants (4 sizes × 4 frames) with their Stripe price IDs, and writes them to the photo with `forSale = true`.

- [ ] **Step 2: Manual verification**

Run `npm run dev`, open `http://localhost:3000/shop/penguin`:
- Size buttons read **20×20 / 30×30 / 40×40 / 50×50** (not A-sizes).
- The frame preview is **square** and the caption reads e.g. "Shown at 20 × 20 cm".
- The Size guide (expand it) shows the square dimensions table.
- Prices match the `SQUARE_PRICING` table.

No commit (no code changed).

---

## All Tests

```bash
npx jest
```
Expected: all suites pass (artelo-catalog now has the extra square test).

## Self-Review Notes
- Spec §3 (size union) → Task 1. §4 (detection) → Task 4. §5 (pricing) → Task 4. §6 (Artelo codes) → Task 1. §7 (1:1 preview) → Tasks 1+2. §8 (selector default) → Task 3. §9 (size guide) → Task 5. Operational re-pricing → Task 6.
- Size string `'20×20'` is identical across types, ARTELO_SIZE, SIZE_MAX, SIZE_CM, SQUARE_SIZES (FramePreview), SQUARE_PRICING (script), and the page's `squareSizes` array.
