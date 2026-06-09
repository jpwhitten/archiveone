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

  await sanity.patch(photo._id).set({ arteloMockups: newRefs }).commit()

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
