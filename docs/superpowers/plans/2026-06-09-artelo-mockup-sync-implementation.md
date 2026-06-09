# Artelo Mockup Sync — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A manual, idempotent script that generates 4 framed mockups per for-sale photo (one per frame style at A2) via Artelo's render API, downloads them into a new Sanity `arteloMockups` field, and shows them on print pages.

**Architecture:** Pure logic (eligibility, target building, render call) lives in a unit-tested `lib/fulfillment/artelo-mockups.ts`. A TypeScript script `scripts/sync-artelo-mockups.ts` (run via `tsx`, mirroring the existing `setup-print-pricing` pattern) orchestrates: read each photo's `printFile` master, render 4 mockups, download + upload to Sanity, replace `arteloMockups`, delete orphaned assets. The Artelo render HTTP call is provisional and marked "confirm against docs" — gated on the API key.

**Tech Stack:** Next.js 16, TypeScript, Sanity, `@sanity/client`, `tsx`, Jest.

**Prerequisites (gate the script's live run, not the build):** `ARTELO_API_KEY`; the Artelo mockup-render endpoint shape confirmed against docs (Task 4).

---

## File Map

```
package.json                        (modify) add tsx devDep + "sync-mockups" script
sanity/schema/photo.ts              (modify) add arteloMockups field
lib/types.ts                        (modify) add arteloMockups to Photo
lib/sanity/queries.ts               (modify) add arteloMockups to photoFields
lib/fulfillment/artelo-mockups.ts   (create) pure logic + provisional render call
scripts/sync-artelo-mockups.ts      (create) orchestration script
app/(site)/shop/[slug]/page.tsx     (modify) gallery shows arteloMockups + mockupImages
__tests__/artelo-mockups.test.ts    (create) unit tests for pure logic
```

---

## Task 1: Add tsx + npm script

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install tsx**

```bash
npm install -D tsx
```

- [ ] **Step 2: Add the npm script**

In `package.json` `scripts`, add (alongside the existing `setup-pricing`):

```json
    "sync-mockups": "tsx scripts/sync-artelo-mockups.ts",
```

- [ ] **Step 3: Verify tsx runs**

```bash
npx tsx --version
```
Expected: prints a version number.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add tsx for TypeScript scripts + sync-mockups script"
```

---

## Task 2: Sanity schema — arteloMockups field

**Files:**
- Modify: `sanity/schema/photo.ts`
- Modify: `lib/types.ts`
- Modify: `lib/sanity/queries.ts`

- [ ] **Step 1: Add the field to `sanity/schema/photo.ts`**

Add this field to the Photo `fields` array, immediately AFTER the existing `printFile` field definition:

```typescript
    defineField({
      name: 'arteloMockups',
      title: 'Artelo mockups (auto-generated)',
      type: 'array',
      of: [defineArrayMember({ type: 'image' })],
      description: 'Managed automatically by the mockup sync script — manual edits are overwritten.',
    }),
```

- [ ] **Step 2: Add to the Photo type in `lib/types.ts`**

Find the `Photo` interface and add this field after `mockupImages`:

```typescript
  arteloMockups?: SanityImage[]
```

- [ ] **Step 3: Add to the photoFields fragment in `lib/sanity/queries.ts`**

Find the `photoFields` groq fragment (it lists `variants, mockupImages, "imageAspectRatio": ...`). Add `arteloMockups,` to the selected fields, right after `mockupImages,`:

```
  variants, mockupImages, arteloMockups,
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```
Expected: compiles successfully (ignore the pre-existing @sanity/image-url deprecation warning).

- [ ] **Step 5: Commit**

```bash
git add sanity/schema/photo.ts lib/types.ts lib/sanity/queries.ts
git commit -m "feat: arteloMockups field on Photo (schema, type, query)"
```

---

## Task 3: Pure logic module (TDD)

**Files:**
- Create: `lib/fulfillment/artelo-mockups.ts`
- Create: `__tests__/artelo-mockups.test.ts`

**Context:** This module holds the pure, testable logic — the frame list, eligibility check, and render-target building. It is self-contained (no `@/` imports) so `tsx` runs it without path-alias config. The HTTP render call is added in Task 4.

- [ ] **Step 1: Write the failing test — create `__tests__/artelo-mockups.test.ts`**

```typescript
import { MOCKUP_FRAMES, MOCKUP_SIZE, photoNeedsMockups, buildMockupTargets } from '@/lib/fulfillment/artelo-mockups'

test('MOCKUP_FRAMES is the four frame styles', () => {
  expect(MOCKUP_FRAMES).toEqual(['Unframed', 'Black', 'White', 'Natural'])
})

test('photoNeedsMockups is true only when a print master URL exists', () => {
  expect(photoNeedsMockups({ printFileUrl: 'https://cdn/master.jpg' })).toBe(true)
  expect(photoNeedsMockups({ printFileUrl: undefined })).toBe(false)
  expect(photoNeedsMockups({ printFileUrl: '' })).toBe(false)
})

test('buildMockupTargets returns one target per frame at MOCKUP_SIZE', () => {
  const targets = buildMockupTargets('https://cdn/master.jpg')
  expect(targets).toHaveLength(4)
  expect(targets.map(t => t.frame)).toEqual(['Unframed', 'Black', 'White', 'Natural'])
  expect(targets.every(t => t.size === MOCKUP_SIZE)).toBe(true)
  expect(targets.every(t => t.artworkUrl === 'https://cdn/master.jpg')).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest artelo-mockups
```
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `lib/fulfillment/artelo-mockups.ts` (pure parts only)**

```typescript
export type MockupFrame = 'Unframed' | 'Black' | 'White' | 'Natural'

export const MOCKUP_FRAMES: MockupFrame[] = ['Unframed', 'Black', 'White', 'Natural']
export const MOCKUP_SIZE = 'A2'

export interface MockupTarget {
  size: string
  frame: MockupFrame
  artworkUrl: string
}

export function photoNeedsMockups(photo: { printFileUrl?: string | null }): boolean {
  return Boolean(photo.printFileUrl)
}

export function buildMockupTargets(artworkUrl: string): MockupTarget[] {
  return MOCKUP_FRAMES.map(frame => ({ size: MOCKUP_SIZE, frame, artworkUrl }))
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest artelo-mockups
```
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add lib/fulfillment/artelo-mockups.ts __tests__/artelo-mockups.test.ts
git commit -m "feat: mockup pure logic (frames, eligibility, targets) with tests"
```

---

## Task 4: Artelo render call (provisional, gated)

**Files:**
- Modify: `lib/fulfillment/artelo-mockups.ts`

**Context:** Adds the HTTP render call. The endpoint/body/response are provisional — confirmed against Artelo's mockup docs before the script runs live. Returns a discriminated result so the script can skip a failed frame without crashing.

- [ ] **Step 1: Append to `lib/fulfillment/artelo-mockups.ts`**

```typescript
export type MockupRenderResult =
  | { ok: true; url: string }
  | { ok: false; error: string }

/**
 * Request a single framed mockup render from Artelo and return its image URL.
 * NOTE: endpoint/body/response confirmed against Artelo's mockup docs before go-live.
 */
export async function renderMockup(target: MockupTarget, apiKey: string): Promise<MockupRenderResult> {
  try {
    const res = await fetch('https://api.artelo.io/v1/mockups', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        artworkUrl: target.artworkUrl,
        size: target.size,
        frame: target.frame,
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `Artelo ${res.status}: ${text.slice(0, 200)}` }
    }
    const data = await res.json().catch(() => ({})) as { url?: string; mockupUrl?: string }
    const url = data.url ?? data.mockupUrl
    if (!url) return { ok: false, error: 'No mockup URL in Artelo response' }
    return { ok: true, url }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
```

- [ ] **Step 2: Confirm pure-logic tests still pass**

```bash
npx jest artelo-mockups
```
Expected: 3 passing (render is not unit-tested — it's the gated HTTP call).

- [ ] **Step 3: Verify build**

```bash
npm run build
```
Expected: compiles successfully.

- [ ] **Step 4: Commit**

```bash
git add lib/fulfillment/artelo-mockups.ts
git commit -m "feat: Artelo mockup render call (provisional, confirm vs docs)"
```

---

## Task 5: The sync script

**Files:**
- Create: `scripts/sync-artelo-mockups.ts`

**Context:** Mirrors `scripts/setup-print-pricing.mjs`: loads `.env.local`, takes a slug or `all`, supports `--dry`, creates its own Sanity client. For each eligible photo it renders 4 mockups, downloads + uploads them to Sanity, replaces `arteloMockups`, and best-effort deletes the previously-referenced assets. Per-photo isolation; end-of-run summary.

- [ ] **Step 1: Create `scripts/sync-artelo-mockups.ts`**

```typescript
/**
 * Sync Artelo framed mockups for photos.
 *
 * For each eligible photo (forSale + has a printFile master), this renders 4
 * mockups via Artelo (one per frame style at A2), downloads them, uploads them
 * into Sanity, and replaces the photo's `arteloMockups`. Idempotent: re-running
 * replaces the mockups and deletes the previously-referenced assets.
 *
 * Usage:
 *   npm run sync-mockups -- <photo-slug>
 *   npm run sync-mockups -- all
 *   npm run sync-mockups -- <photo-slug> --dry   (preview only, no API/Sanity writes)
 *
 * Gated on ARTELO_API_KEY (in .env.local).
 */

import { createClient } from '@sanity/client'
import { readFileSync } from 'node:fs'
import {
  MOCKUP_SIZE,
  MOCKUP_FRAMES,
  photoNeedsMockups,
  buildMockupTargets,
  renderMockup,
} from '../lib/fulfillment/artelo-mockups'

// ---- Load .env.local (standalone script, not run by Next.js) ----
function loadEnv() {
  try {
    const content = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    for (const line of content.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
      }
    }
  } catch {
    /* no .env.local — rely on real environment */
  }
}
loadEnv()

const arg = process.argv[2]
const dryRun = process.argv.includes('--dry')

if (!arg || arg.startsWith('--')) {
  console.error('Usage: npm run sync-mockups -- <photo-slug | all> [--dry]')
  process.exit(1)
}

const apiKey = process.env.ARTELO_API_KEY
if (!dryRun && (!apiKey || apiKey === 'replace_me')) {
  console.error('✗ ARTELO_API_KEY is not set in .env.local (required unless --dry).')
  process.exit(1)
}

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
})

interface PhotoRow {
  _id: string
  title: string
  slug: string
  printFileUrl?: string
  currentMockupRefs?: string[]
}

async function fetchPhotos(): Promise<PhotoRow[]> {
  const filter =
    arg === 'all'
      ? `_type == "photo" && forSale == true`
      : `_type == "photo" && slug.current == $slug`
  return sanity.fetch(
    `*[${filter}]{
      _id, title, "slug": slug.current,
      "printFileUrl": printFile.asset->url,
      "currentMockupRefs": arteloMockups[].asset._ref
    }`,
    { slug: arg }
  )
}

async function syncPhoto(photo: PhotoRow): Promise<'synced' | 'skipped' | 'partial'> {
  if (!photoNeedsMockups({ printFileUrl: photo.printFileUrl })) {
    console.log(`  · ${photo.title}: no print master — skipped`)
    return 'skipped'
  }

  if (dryRun) {
    console.log(`  · ${photo.title}: would render ${MOCKUP_FRAMES.length} mockups (${MOCKUP_FRAMES.join(', ')}) at ${MOCKUP_SIZE}`)
    return 'synced'
  }

  const targets = buildMockupTargets(photo.printFileUrl as string)
  const newRefs: { _type: 'image'; _key: string; asset: { _type: 'reference'; _ref: string } }[] = []
  let failures = 0

  for (const target of targets) {
    const rendered = await renderMockup(target, apiKey as string)
    if (!rendered.ok) {
      console.log(`    ✗ ${target.frame}: ${rendered.error}`)
      failures++
      continue
    }
    // download the rendered mockup
    const imgRes = await fetch(rendered.url)
    if (!imgRes.ok) {
      console.log(`    ✗ ${target.frame}: download failed (${imgRes.status})`)
      failures++
      continue
    }
    const buffer = Buffer.from(await imgRes.arrayBuffer())
    const asset = await sanity.assets.upload('image', buffer, {
      filename: `${photo.slug}-${target.frame}.jpg`,
    })
    newRefs.push({
      _type: 'image',
      _key: `${photo.slug}-${target.frame}`.toLowerCase().replace(/[^a-z0-9-]/g, ''),
      asset: { _type: 'reference', _ref: asset._id },
    })
    console.log(`    ✓ ${target.frame}`)
  }

  if (newRefs.length === 0) {
    console.log(`  · ${photo.title}: all renders failed — left unchanged`)
    return 'skipped'
  }

  // replace arteloMockups with the fresh assets
  await sanity.patch(photo._id).set({ arteloMockups: newRefs }).commit()

  // best-effort: delete the previously-referenced (now orphaned) assets
  for (const ref of photo.currentMockupRefs ?? []) {
    try {
      await sanity.delete(ref)
    } catch {
      /* ignore — orphan cleanup is best-effort */
    }
  }

  console.log(`  ✓ ${photo.title}: ${newRefs.length}/${targets.length} mockups synced`)
  return failures > 0 ? 'partial' : 'synced'
}

async function main() {
  const photos = await fetchPhotos()
  if (photos.length === 0) {
    console.error(`✗ No matching photo(s) for "${arg}".`)
    process.exit(1)
  }

  console.log(`\nArtelo mockup sync${dryRun ? ' (dry run)' : ''} — ${photos.length} photo(s)\n`)

  const counts = { synced: 0, skipped: 0, partial: 0 }
  for (const photo of photos) {
    const outcome = await syncPhoto(photo)
    counts[outcome]++
  }

  console.log(`\nDone — ${counts.synced} synced, ${counts.partial} partial, ${counts.skipped} skipped.`)
  if (!dryRun) console.log('Mockups appear on print pages within ~60s (ISR revalidation).')
}

main().catch(err => {
  console.error('\n✗ Error:', err.message)
  process.exit(1)
})
```

- [ ] **Step 2: Smoke-test the dry run**

```bash
npm run sync-mockups -- all --dry
```
Expected: lists each for-sale photo and either "would render 4 mockups…" (if it has a print master) or "no print master — skipped". No errors, no writes. (Most photos will show "no print master" until masters are uploaded — that's correct.)

- [ ] **Step 3: Commit**

```bash
git add scripts/sync-artelo-mockups.ts
git commit -m "feat: Artelo mockup sync script (dry-run, idempotent, per-photo isolation)"
```

---

## Task 6: Print page shows Artelo mockups

**Files:**
- Modify: `app/(site)/shop/[slug]/page.tsx`

**Context:** The print page already renders a mockup gallery from `photo.mockupImages`. Change it to render `arteloMockups` first, then `mockupImages`.

- [ ] **Step 1: Update the mockup gallery in `app/(site)/shop/[slug]/page.tsx`**

Find the block that conditionally renders the mockup gallery (it checks `photo.mockupImages && photo.mockupImages.length > 0` and maps over `photo.mockupImages`). Replace that whole block with one that combines both arrays:

```tsx
        {(() => {
          const mockups = [...(photo.arteloMockups ?? []), ...(photo.mockupImages ?? [])]
          if (mockups.length === 0) return null
          return (
            <div className="grid grid-cols-3 gap-px mt-px">
              {mockups.map((img, i) => {
                const src = urlFor(img).width(400).height(400).fit('crop').auto('format').url()
                return (
                  <div key={i} className="relative aspect-square bg-mist">
                    <Image
                      src={src}
                      alt={`${photo.title} mockup ${i + 1}`}
                      fill
                      className="object-cover"
                      sizes="200px"
                    />
                  </div>
                )
              })}
            </div>
          )
        })()}
```

(If the existing block uses slightly different class names or an `alt` of "room mockup", preserve the existing styling — the only required change is sourcing from `[...arteloMockups, ...mockupImages]` instead of just `mockupImages`.)

- [ ] **Step 2: Verify build**

```bash
npm run build
```
Expected: compiles successfully.

- [ ] **Step 3: Commit**

```bash
git add "app/(site)/shop/[slug]/page.tsx"
git commit -m "feat: print page gallery shows Artelo mockups then manual mockups"
```

---

## All Tests

```bash
npx jest
```

Expected: all suites pass, including `artelo-mockups.test.ts` (3 tests). Total ~26 tests.

---

## Go-Live (owner-gated, after the build)

1. Confirm the Task 4 render call (endpoint/body/response) against Artelo's mockup docs; adjust if needed (commit).
2. Set real `ARTELO_API_KEY` in `.env.local`.
3. Upload a `printFile` master to one photo in Sanity.
4. `npm run sync-mockups -- <that-slug> --dry` → confirm it plans 4 renders.
5. `npm run sync-mockups -- <that-slug>` → confirm 4 mockups appear in Sanity `arteloMockups` and on the print page.
6. Once happy: `npm run sync-mockups -- all` to backfill every photo that has a master.
