/**
 * Set up print pricing for a photo.
 *
 * For one photo, this creates a Stripe product + a price for every size/frame
 * variant, then writes those variants into the Sanity photo and flips `forSale`
 * on — so the photo becomes purchasable in one command.
 *
 * Usage:
 *   node scripts/setup-print-pricing.mjs <photo-slug>
 *   node scripts/setup-print-pricing.mjs <photo-slug> --dry   (preview only, no changes)
 *
 * Safety:
 *   - Refuses to run unless STRIPE_SECRET_KEY is a TEST key (sk_test_...).
 *   - Idempotent: re-running reuses existing Stripe prices (by lookup key) and
 *     replaces the photo's variants cleanly, so it's safe to run again.
 *
 * Prices below are RETAIL (what the customer pays) in GBP pence, and INCLUDE a
 * shipping buffer (we sell with free shipping). Edit PRICING to taste — remember
 * each price must clear: provider base cost + shipping + Stripe fee (~1.5% + 25p)
 * + your margin.
 */

import Stripe from 'stripe'
import { createClient } from '@sanity/client'
import { readFileSync } from 'node:fs'

// ---- Pricing matrix (GBP pence). 3500 = £35.00. Free shipping baked in. ----
const PRICING = {
  A4: { Unframed: 3500, Black: 6500, White: 6500, Natural: 7000 },
  A3: { Unframed: 5500, Black: 9000, White: 9000, Natural: 9500 },
  A2: { Unframed: 8000, Black: 13000, White: 13000, Natural: 14000 },
  A1: { Unframed: 12000, Black: 18500, White: 18500, Natural: 20000 },
}
const SIZES = ['A4', 'A3', 'A2', 'A1']
const FRAMES = ['Unframed', 'Black', 'White', 'Natural']

// ---- Load .env.local (this is a standalone script, not run by Next.js) ----
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

const slug = process.argv[2]
const dryRun = process.argv.includes('--dry')

if (!slug || slug.startsWith('--')) {
  console.error('Usage: node scripts/setup-print-pricing.mjs <photo-slug> [--dry]')
  process.exit(1)
}

const stripeKey = process.env.STRIPE_SECRET_KEY
if (!stripeKey) {
  console.error('✗ STRIPE_SECRET_KEY is not set in .env.local')
  process.exit(1)
}
if (!stripeKey.startsWith('sk_test_')) {
  console.error('✗ Refusing to run: STRIPE_SECRET_KEY is not a TEST key (must start with sk_test_).')
  console.error('  This is a safety guard so the script never touches live/real money.')
  process.exit(1)
}

const stripe = new Stripe(stripeKey)
const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
})

const gbp = pence => `£${(pence / 100).toFixed(2)}`

async function main() {
  // 1. Find the photo in Sanity
  const photo = await sanity.fetch(
    `*[_type == "photo" && slug.current == $slug][0]{ _id, title, "slug": slug.current }`,
    { slug }
  )
  if (!photo) {
    console.error(`✗ No photo found in Sanity with slug "${slug}".`)
    process.exit(1)
  }

  console.log(`\nPhoto: ${photo.title}  (${photo.slug})`)
  console.log(dryRun ? '(dry run — no changes will be made)\n' : '')

  if (dryRun) {
    for (const size of SIZES) {
      for (const frame of FRAMES) {
        console.log(`  ${size} · ${frame.padEnd(8)} → ${gbp(PRICING[size][frame])}`)
      }
    }
    console.log('\nRun without --dry to create Stripe prices and update Sanity.')
    return
  }

  // 2. Find or create the Stripe product for this photo.
  // Prefer deriving the product from an existing price (reliable + immediate);
  // fall back to product search; otherwise create one.
  let product
  const firstKey = `${slug}-${SIZES[0]}-${FRAMES[0]}`.toLowerCase().replace(/[^a-z0-9-]/g, '')
  const seedPrice = await stripe.prices.list({ lookup_keys: [firstKey], limit: 1 })
  if (seedPrice.data[0]) {
    product = await stripe.products.retrieve(seedPrice.data[0].product)
  } else {
    const found = await stripe.products.search({ query: `metadata['photoSlug']:'${slug}'` })
    product = found.data[0]
  }
  if (!product) {
    product = await stripe.products.create({
      name: photo.title,
      metadata: { photoSlug: slug },
    })
    console.log(`  created Stripe product ${product.id}`)
  } else {
    console.log(`  reusing Stripe product ${product.id}`)
  }

  // 3. Create/reuse a price per variant
  const variants = []
  for (const size of SIZES) {
    for (const frame of FRAMES) {
      const amount = PRICING[size][frame]
      const lookupKey = `${slug}-${size}-${frame}`.toLowerCase().replace(/[^a-z0-9-]/g, '')

      const existing = await stripe.prices.list({ lookup_keys: [lookupKey], limit: 1 })
      let price = existing.data[0]

      if (price && price.unit_amount !== amount) {
        // price changed — create a new one and move the lookup key over
        price = await stripe.prices.create({
          product: product.id,
          currency: 'gbp',
          unit_amount: amount,
          lookup_key: lookupKey,
          transfer_lookup_key: true,
          metadata: { size, frame },
        })
      } else if (!price) {
        price = await stripe.prices.create({
          product: product.id,
          currency: 'gbp',
          unit_amount: amount,
          lookup_key: lookupKey,
          metadata: { size, frame },
        })
      }

      variants.push({
        _key: lookupKey,
        size,
        frame,
        price: amount,
        stripePriceId: price.id,
      })
      console.log(`  ${size} · ${frame.padEnd(8)} ${gbp(amount).padStart(8)}  ${price.id}`)
    }
  }

  // 4. Write variants into the photo and mark it for sale
  await sanity.patch(photo._id).set({ variants, forSale: true }).commit()

  console.log(`\n✓ Wrote ${variants.length} variants to "${photo.title}" and set forSale = true.`)
  console.log('  It should appear in the shop within ~60s (ISR revalidation).')
}

main().catch(err => {
  console.error('\n✗ Error:', err.message)
  process.exit(1)
})
