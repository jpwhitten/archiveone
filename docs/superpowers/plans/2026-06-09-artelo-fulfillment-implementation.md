# Artelo Fulfilment Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automate US/NA print fulfilment via Artelo's REST API, behind a provider-agnostic fulfilment layer, with a never-drop-an-order fallback to the existing email flow.

**Architecture:** A `lib/fulfillment/` module defines a `FulfilmentProvider` interface. A dispatcher routes orders by region — US/CA/MX to the Artelo adapter, everywhere else to the email adapter — and falls back to email whenever Artelo can't safely submit. The Stripe webhook is refactored to assemble one `FulfilmentOrder` and hand it to the dispatcher. A new Sanity `printFile` field holds the high-res master; a new `order` document gives idempotency + history. US live-fulfilment stays behind an `ARTELO_ENABLED` flag.

**Tech Stack:** Next.js 16 App Router, TypeScript, Sanity, Stripe, Resend, Jest.

**Prerequisites (owner-provided, gate only Task 9's go-live — not the build):**
- `ARTELO_API_KEY` env var
- Artelo catalog product/variant IDs for fine-art-matte A-sizes × Oak frames
- Artelo `orders/create` request schema (the adapter's request body is confirmed against docs in Task 7)

---

## File Map

```
lib/fulfillment/
├── types.ts          FulfilmentOrder, FulfilmentLine, FulfilmentProvider, FulfilmentResult
├── email.ts          EmailProvider — existing manual order email, as a provider
├── artelo-catalog.ts ARTELO_SKUS map: `${size}|${frame}` → { productId, variantId }
├── artelo.ts         ArteloProvider — maps order → Artelo API; missing master/SKU → not-ok
├── dispatcher.ts     dispatch(order): region → provider, with email fallback
lib/sanity/
├── orders.ts         findOrderBySession, upsertOrder (Sanity order doc)
sanity/schema/
├── photo.ts          (modify) add printFile field
├── order.ts          (create) order document type
├── index.ts          (modify) register order type
app/api/webhooks/stripe/
├── route.ts          (modify) build FulfilmentOrder, call dispatch, upsert order
__tests__/
├── fulfillment-dispatcher.test.ts
├── artelo-catalog.test.ts
├── artelo-adapter.test.ts
```

---

## Task 1: Fulfilment Types

**Files:**
- Create: `lib/fulfillment/types.ts`

- [ ] **Step 1: Create lib/fulfillment/types.ts**

```typescript
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/fulfillment/types.ts
git commit -m "feat: fulfilment types and provider interface"
```

---

## Task 2: Artelo Catalog Map (TDD)

**Files:**
- Create: `lib/fulfillment/artelo-catalog.ts`
- Create: `__tests__/artelo-catalog.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/artelo-catalog.test.ts`:

```typescript
import { arteloSkuFor, ARTELO_SKUS } from '@/lib/fulfillment/artelo-catalog'

test('returns SKU for a mapped size+frame', () => {
  // Seed a known entry so the test is independent of real catalog IDs
  ARTELO_SKUS['A4|Unframed'] = { productId: 'p_test', variantId: 'v_test' }
  expect(arteloSkuFor('A4', 'Unframed')).toEqual({ productId: 'p_test', variantId: 'v_test' })
})

test('returns null for an unmapped combination', () => {
  expect(arteloSkuFor('A1', 'Natural')).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest artelo-catalog`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement lib/fulfillment/artelo-catalog.ts**

```typescript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest artelo-catalog`
Expected: 2 passing.

- [ ] **Step 5: Commit**

```bash
git add lib/fulfillment/artelo-catalog.ts __tests__/artelo-catalog.test.ts
git commit -m "feat: Artelo catalog SKU map with unmapped-returns-null"
```

---

## Task 3: Email Provider (refactor existing email into a provider)

**Files:**
- Create: `lib/fulfillment/email.ts`

**Context:** The current order email is built inline in `app/api/webhooks/stripe/route.ts`. This task extracts the owner work-order email into a provider that accepts a `FulfilmentOrder`. The webhook is refactored in Task 8; for now we just create the provider. Reuse the existing email design (branded header, "Fulfil via" provider callout, item rows with thumbnails, ship-to block).

- [ ] **Step 1: Create lib/fulfillment/email.ts**

```typescript
import { Resend } from 'resend'
import { getProviderForCountry } from '@/lib/order-routing'
import type { FulfilmentOrder, FulfilmentProvider, FulfilmentResult } from './types'

const label = `font:11px ui-monospace,Menlo,monospace;letter-spacing:1.5px;text-transform:uppercase;color:#9a9a9a`

function itemRows(order: FulfilmentOrder): string {
  return order.lines.map(i => `
    <tr>
      <td style="padding:14px 0 14px 0;border-bottom:1px solid #eee;font:15px -apple-system,Segoe UI,sans-serif;color:#0a0a0a;vertical-align:middle">
        ${i.photoTitle}
        <div style="font:13px ui-monospace,Menlo,monospace;color:#666;margin-top:3px">${[i.size, i.frame].filter(Boolean).join(' · ')}</div>
      </td>
      <td style="padding:14px 0;border-bottom:1px solid #eee;text-align:right;font:14px ui-monospace,Menlo,monospace;color:#0a0a0a;white-space:nowrap;vertical-align:middle">
        ${i.qty > 1 ? `×&nbsp;${i.qty}` : '×&nbsp;1'}
      </td>
    </tr>`).join('')
}

function buildHtml(order: FulfilmentOrder): string {
  const provider = getProviderForCountry(order.country)
  const total = `£${(order.total / 100).toFixed(2)}`
  const orderRef = order.sessionId.slice(-8).toUpperCase()
  return `
<div style="background:#f5f5f5;padding:32px 16px;font:15px -apple-system,Segoe UI,sans-serif;color:#0a0a0a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #eaeaea">
    <tr><td style="padding:32px 32px 24px">
      <div style="font:13px ui-monospace,Menlo,monospace;letter-spacing:3px;text-transform:uppercase">Archive Nº1</div>
      <div style="font:22px -apple-system,Segoe UI,sans-serif;margin-top:18px">New order received</div>
      <div style="${label};margin-top:6px">Ref ${orderRef} · ${total}</div>
    </td></tr>
    <tr><td style="padding:0 32px">
      <div style="background:#0a0a0a;color:#fff;padding:16px 18px">
        <div style="font:11px ui-monospace,Menlo,monospace;letter-spacing:1.5px;text-transform:uppercase;color:#bdbdbd">Fulfil via</div>
        <div style="font:17px -apple-system,Segoe UI,sans-serif;margin-top:4px">${provider.name}</div>
        ${provider.url ? `<a href="${provider.url}" style="font:13px ui-monospace,Menlo,monospace;color:#9fd0ff;text-decoration:none">${provider.url}</a>` : ''}
      </div>
    </td></tr>
    <tr><td style="padding:28px 32px 8px">
      <div style="${label}">Items to fulfil</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px">${itemRows(order)}</table>
    </td></tr>
    <tr><td style="padding:24px 32px 32px">
      <div style="${label}">Ship to</div>
      <div style="font:15px -apple-system,Segoe UI,sans-serif;line-height:1.5;margin-top:8px">
        <strong>${order.customerName}</strong><br>${order.addressLines.join('<br>')}
      </div>
      ${order.customerEmail ? `<div style="font:13px ui-monospace,Menlo,monospace;color:#666;margin-top:10px">${order.customerEmail}</div>` : ''}
    </td></tr>
  </table>
</div>`
}

export const emailProvider: FulfilmentProvider = {
  name: 'email',
  async submit(order: FulfilmentOrder): Promise<FulfilmentResult> {
    if (!process.env.RESEND_API_KEY || !process.env.OWNER_EMAIL) {
      return { ok: false, provider: 'email', error: 'email not configured' }
    }
    try {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: process.env.ORDER_EMAIL_FROM || 'Archive One <onboarding@resend.dev>',
        to: process.env.OWNER_EMAIL,
        subject: `New Order — ${order.customerName} · ${order.city}, ${order.country}`,
        html: buildHtml(order),
      })
      return { ok: true, provider: 'email' }
    } catch (err) {
      return { ok: false, provider: 'email', error: String(err) }
    }
  },
}

// Brief owner notification when an order was auto-submitted to Artelo.
// Best-effort: never throws.
export async function notifyOwnerArteloSubmitted(order: FulfilmentOrder, arteloOrderId?: string): Promise<void> {
  if (!process.env.RESEND_API_KEY || !process.env.OWNER_EMAIL) return
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const orderRef = order.sessionId.slice(-8).toUpperCase()
    await resend.emails.send({
      from: process.env.ORDER_EMAIL_FROM || 'Archive One <onboarding@resend.dev>',
      to: process.env.OWNER_EMAIL,
      subject: `✅ Submitted to Artelo — ${order.customerName} · Ref ${orderRef}`,
      html: `<div style="font:15px -apple-system,Segoe UI,sans-serif;color:#0a0a0a;padding:24px">
        <p>Order <strong>${orderRef}</strong> was auto-submitted to Artelo${arteloOrderId ? ` (Artelo #${arteloOrderId})` : ''}.</p>
        <p>${order.lines.map(l => `${l.photoTitle} — ${l.size} · ${l.frame} ×${l.qty}`).join('<br>')}</p>
        <p>Ship to: ${order.customerName}, ${order.addressLines.join(', ')}</p>
        <p style="color:#666">No action needed unless Artelo flags an issue.</p>
      </div>`,
    })
  } catch (err) {
    console.error('Artelo-submitted notice failed:', err)
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/fulfillment/email.ts
git commit -m "feat: email fulfilment provider (extracted work-order email)"
```

---

## Task 4: Artelo Adapter — pre-submit guards (TDD)

**Files:**
- Create: `lib/fulfillment/artelo.ts`
- Create: `__tests__/artelo-adapter.test.ts`

**Context:** This task builds the adapter's *decision logic* — when it can and cannot submit — without the real HTTP call yet (that's Task 7, confirmed against Artelo docs). The adapter returns `{ ok: false }` when a line is missing a print master or an SKU mapping, so the dispatcher falls back to email. We isolate the "can we submit?" check in a pure, testable function.

- [ ] **Step 1: Write the failing test**

Create `__tests__/artelo-adapter.test.ts`:

```typescript
import { unfulfillableReason } from '@/lib/fulfillment/artelo'
import { ARTELO_SKUS } from '@/lib/fulfillment/artelo-catalog'
import type { FulfilmentOrder } from '@/lib/fulfillment/types'

function order(overrides: Partial<FulfilmentOrder['lines'][0]> = {}): FulfilmentOrder {
  return {
    sessionId: 'cs_test_123',
    region: 'US',
    country: 'US',
    customerName: 'Sarah M',
    customerEmail: 'sarah@example.com',
    shippingAddress: '14 Park Lane, NY',
    addressLines: ['14 Park Lane', 'New York'],
    city: 'New York',
    total: 5500,
    lines: [{
      photoId: 'photo-1',
      photoTitle: 'Inca Terns',
      size: 'A4',
      frame: 'Unframed',
      qty: 1,
      printFileUrl: 'https://cdn.example.com/master.jpg',
      ...overrides,
    }],
  }
}

test('returns a reason when a line has no print master', () => {
  ARTELO_SKUS['A4|Unframed'] = { productId: 'p1', variantId: 'v1' }
  const reason = unfulfillableReason(order({ printFileUrl: undefined }))
  expect(reason).toMatch(/master/i)
})

test('returns a reason when a line has no SKU mapping', () => {
  ARTELO_SKUS['A4|Unframed'] = { productId: '', variantId: '' } // unmapped
  const reason = unfulfillableReason(order())
  expect(reason).toMatch(/sku|mapping/i)
})

test('returns null when every line is mappable and has a master', () => {
  ARTELO_SKUS['A4|Unframed'] = { productId: 'p1', variantId: 'v1' }
  expect(unfulfillableReason(order())).toBeNull()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest artelo-adapter`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement lib/fulfillment/artelo.ts (guards only)**

```typescript
import { arteloSkuFor } from './artelo-catalog'
import type { FulfilmentOrder, FulfilmentProvider, FulfilmentResult } from './types'

/**
 * Returns a human-readable reason the order cannot be submitted to Artelo,
 * or null if every line is mappable and has a print master.
 */
export function unfulfillableReason(order: FulfilmentOrder): string | null {
  for (const line of order.lines) {
    if (!line.printFileUrl) {
      return `Missing print master for "${line.photoTitle}" (${line.size} · ${line.frame})`
    }
    if (!arteloSkuFor(line.size, line.frame)) {
      return `No Artelo SKU mapping for ${line.size} · ${line.frame}`
    }
  }
  return null
}

export const arteloProvider: FulfilmentProvider = {
  name: 'artelo',
  async submit(order: FulfilmentOrder): Promise<FulfilmentResult> {
    const reason = unfulfillableReason(order)
    if (reason) return { ok: false, provider: 'artelo', error: reason }
    // Real Artelo HTTP call added in Task 7.
    return { ok: false, provider: 'artelo', error: 'Artelo submit not yet implemented' }
  },
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest artelo-adapter`
Expected: 3 passing.

- [ ] **Step 5: Commit**

```bash
git add lib/fulfillment/artelo.ts __tests__/artelo-adapter.test.ts
git commit -m "feat: Artelo adapter pre-submit guards (master + SKU checks)"
```

---

## Task 5: Dispatcher with fallback (TDD)

**Files:**
- Create: `lib/fulfillment/dispatcher.ts`
- Create: `__tests__/fulfillment-dispatcher.test.ts`

**Context:** The dispatcher routes by region and owns the fallback. US/CA/MX → Artelo; if Artelo returns `{ ok: false }`, fall back to email. All other regions → email directly. To keep it testable, the dispatcher accepts the two providers as injectable parameters with sensible defaults.

- [ ] **Step 1: Write the failing test**

Create `__tests__/fulfillment-dispatcher.test.ts`:

```typescript
import { dispatch } from '@/lib/fulfillment/dispatcher'
import type { FulfilmentOrder, FulfilmentProvider, FulfilmentResult } from '@/lib/fulfillment/types'

function makeOrder(country: string): FulfilmentOrder {
  return {
    sessionId: 'cs_1', region: 'US', country,
    customerName: 'A', customerEmail: 'a@b.com',
    shippingAddress: 'x', addressLines: ['x'], city: 'NY', total: 100,
    lines: [{ photoId: 'p', photoTitle: 'T', size: 'A4', frame: 'Unframed', qty: 1, printFileUrl: 'u' }],
  }
}

const okArtelo: FulfilmentProvider = { name: 'artelo', async submit() { return { ok: true, provider: 'artelo', providerOrderId: 'AO1' } } }
const failArtelo: FulfilmentProvider = { name: 'artelo', async submit() { return { ok: false, provider: 'artelo', error: 'boom' } } }
const okEmail: FulfilmentProvider = { name: 'email', async submit() { return { ok: true, provider: 'email' } } }

test('US order goes to Artelo when it succeeds', async () => {
  const res = await dispatch(makeOrder('US'), { artelo: okArtelo, email: okEmail })
  expect(res.ok).toBe(true)
  expect(res.provider).toBe('artelo')
})

test('US order falls back to email when Artelo fails', async () => {
  const res = await dispatch(makeOrder('US'), { artelo: failArtelo, email: okEmail })
  expect(res.ok).toBe(true)
  expect(res.provider).toBe('email')
})

test('non-US order goes straight to email', async () => {
  let arteloCalled = false
  const spyArtelo: FulfilmentProvider = { name: 'artelo', async submit() { arteloCalled = true; return { ok: false, provider: 'artelo', error: '' } } }
  const res = await dispatch(makeOrder('GB'), { artelo: spyArtelo, email: okEmail })
  expect(res.provider).toBe('email')
  expect(arteloCalled).toBe(false)
})

test('ARTELO_ENABLED=false sends US to email', async () => {
  const res = await dispatch(makeOrder('US'), { artelo: okArtelo, email: okEmail, arteloEnabled: false })
  expect(res.provider).toBe('email')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest fulfillment-dispatcher`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement lib/fulfillment/dispatcher.ts**

```typescript
import { arteloProvider } from './artelo'
import { emailProvider } from './email'
import type { FulfilmentOrder, FulfilmentProvider, FulfilmentResult } from './types'

const ARTELO_COUNTRIES = new Set(['US', 'CA', 'MX'])

interface DispatchDeps {
  artelo?: FulfilmentProvider
  email?: FulfilmentProvider
  arteloEnabled?: boolean
}

export async function dispatch(
  order: FulfilmentOrder,
  deps: DispatchDeps = {}
): Promise<FulfilmentResult> {
  const artelo = deps.artelo ?? arteloProvider
  const email = deps.email ?? emailProvider
  const arteloEnabled = deps.arteloEnabled ?? process.env.ARTELO_ENABLED === 'true'

  if (arteloEnabled && ARTELO_COUNTRIES.has(order.country)) {
    const res = await artelo.submit(order)
    if (res.ok) return res
    // fall through to email on any Artelo failure
  }
  return email.submit(order)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest fulfillment-dispatcher`
Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add lib/fulfillment/dispatcher.ts __tests__/fulfillment-dispatcher.test.ts
git commit -m "feat: fulfilment dispatcher with region routing and email fallback"
```

---

## Task 6: Sanity schema — printFile field + order document

**Files:**
- Modify: `sanity/schema/photo.ts`
- Create: `sanity/schema/order.ts`
- Modify: `sanity/schema/index.ts`

- [ ] **Step 1: Add printFile field to sanity/schema/photo.ts**

Add this field to the Photo `fields` array, immediately after the `mockupImages` field definition:

```typescript
    defineField({
      name: 'printFile',
      title: 'Print master (high-res)',
      type: 'file',
      description: 'Full-resolution master used for printing. Separate from the web image. Required for automated fulfilment.',
    }),
```

- [ ] **Step 2: Create sanity/schema/order.ts**

```typescript
import { defineType, defineField, defineArrayMember } from 'sanity'

export const order = defineType({
  name: 'order',
  title: 'Order',
  type: 'document',
  readOnly: true,
  fields: [
    defineField({ name: 'sessionId', type: 'string' }),
    defineField({ name: 'createdAt', type: 'datetime' }),
    defineField({ name: 'region', type: 'string' }),
    defineField({ name: 'customerName', type: 'string' }),
    defineField({ name: 'customerEmail', type: 'string' }),
    defineField({ name: 'shippingAddress', type: 'text' }),
    defineField({
      name: 'items',
      type: 'array',
      of: [defineArrayMember({
        type: 'object',
        fields: [
          defineField({ name: 'photoTitle', type: 'string' }),
          defineField({ name: 'size', type: 'string' }),
          defineField({ name: 'frame', type: 'string' }),
          defineField({ name: 'qty', type: 'number' }),
        ],
      })],
    }),
    defineField({ name: 'total', type: 'number', description: 'Pence' }),
    defineField({ name: 'fulfilment', type: 'string', options: { list: ['artelo', 'manual'] } }),
    defineField({ name: 'arteloOrderId', type: 'string' }),
    defineField({ name: 'status', type: 'string', options: { list: ['submitted', 'manual', 'failed'] } }),
  ],
  orderings: [{ name: 'newest', title: 'Newest', by: [{ field: 'createdAt', direction: 'desc' }] }],
  preview: {
    select: { title: 'customerName', subtitle: 'status', date: 'createdAt' },
    prepare({ title, subtitle }) {
      return { title: title || 'Order', subtitle }
    },
  },
})
```

- [ ] **Step 3: Register the order type in sanity/schema/index.ts**

```typescript
import { photo } from './photo'
import { collection } from './collection'
import { order } from './order'

export const schemaTypes = [photo, collection, order]
```

- [ ] **Step 4: Verify build**

Run: `npm run build`
Expected: Compiles successfully.

- [ ] **Step 5: Commit**

```bash
git add sanity/schema/photo.ts sanity/schema/order.ts sanity/schema/index.ts
git commit -m "feat: Sanity printFile field and order document type"
```

---

## Task 7: Sanity order helpers + printFile in queries

**Files:**
- Create: `lib/sanity/orders.ts`
- Modify: `lib/sanity/queries.ts`

**Context:** The webhook needs to (a) look up an existing order by session id for idempotency, (b) upsert the order record, and (c) read each photo's `printFile` URL. Sanity serves a file asset's original URL via `asset->url`.

- [ ] **Step 1: Create lib/sanity/orders.ts**

```typescript
import { groq } from 'next-sanity'
import { sanityClient, sanityWriteClient } from './client'

export interface OrderItem {
  photoTitle: string
  size: string
  frame: string
  qty: number
}

export interface OrderRecord {
  sessionId: string
  region: string
  customerName: string
  customerEmail: string
  shippingAddress: string
  items: OrderItem[]
  total: number
  fulfilment: 'artelo' | 'manual'
  arteloOrderId?: string
  status: 'submitted' | 'manual' | 'failed'
}

export async function findOrderBySession(sessionId: string): Promise<{ _id: string; arteloOrderId?: string } | null> {
  return sanityClient.fetch(
    groq`*[_type == "order" && sessionId == $sessionId][0]{ _id, arteloOrderId }`,
    { sessionId }
  )
}

export async function upsertOrder(record: OrderRecord): Promise<void> {
  const _id = `order.${record.sessionId}`
  await sanityWriteClient.createOrReplace({
    _id,
    _type: 'order',
    createdAt: new Date().toISOString(),
    ...record,
  })
}
```

- [ ] **Step 2: Add printFile URL to the photo lookup in lib/sanity/queries.ts**

Find the `getPhotoBySlug` function and the `photoFields` fragment. We need the print-file URL available when the webhook looks up photos by Stripe price id. Add a dedicated lookup function at the end of `lib/sanity/queries.ts`:

```typescript
export async function getPrintFileUrlByPriceId(priceId: string): Promise<string | undefined> {
  const res = await sanityClient.fetch<{ url?: string } | null>(
    groq`*[_type == "photo" && $priceId in variants[].stripePriceId][0]{
      "url": printFile.asset->url
    }`,
    { priceId }
  )
  return res?.url ?? undefined
}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Compiles successfully.

- [ ] **Step 4: Commit**

```bash
git add lib/sanity/orders.ts lib/sanity/queries.ts
git commit -m "feat: order doc helpers and printFile URL lookup"
```

---

## Task 8: Artelo HTTP call (behind flag, confirmed against docs)

**Files:**
- Modify: `lib/fulfillment/artelo.ts`

**Context:** This adds the real Artelo `orders/create` HTTP call. The exact endpoint path, auth header, and request body **must be confirmed against Artelo's documentation** before running live; the structure below follows the spec's described model (REST, JSON, idempotency key = Stripe session id, line items reference product/variant ids, artwork attached by URL). If the real schema differs, only this function changes — the guards, dispatcher, and tests are unaffected.

- [ ] **Step 1: Replace the `submit` body in lib/fulfillment/artelo.ts**

Replace the `arteloProvider` definition (keep `unfulfillableReason` unchanged) with:

```typescript
export const arteloProvider: FulfilmentProvider = {
  name: 'artelo',
  async submit(order: FulfilmentOrder): Promise<FulfilmentResult> {
    const reason = unfulfillableReason(order)
    if (reason) return { ok: false, provider: 'artelo', error: reason }

    const apiKey = process.env.ARTELO_API_KEY
    if (!apiKey) return { ok: false, provider: 'artelo', error: 'ARTELO_API_KEY not set' }

    // NOTE: endpoint/headers/body confirmed against Artelo docs before go-live.
    const items = order.lines.map(line => {
      const sku = arteloSkuFor(line.size, line.frame)! // guarded by unfulfillableReason
      return {
        productId: sku.productId,
        variantId: sku.variantId,
        quantity: line.qty,
        artworkUrl: line.printFileUrl,
      }
    })

    const body = {
      idempotencyKey: order.sessionId,
      recipient: {
        name: order.customerName,
        email: order.customerEmail,
        address: order.addressLines,
        country: order.country,
      },
      items,
    }

    try {
      const res = await fetch('https://api.artelo.io/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': order.sessionId,
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        return { ok: false, provider: 'artelo', error: `Artelo ${res.status}: ${text.slice(0, 300)}` }
      }
      const data = await res.json().catch(() => ({})) as { id?: string; orderId?: string }
      return { ok: true, provider: 'artelo', providerOrderId: data.id ?? data.orderId }
    } catch (err) {
      return { ok: false, provider: 'artelo', error: String(err) }
    }
  },
}
```

Ensure the import line at the top includes `arteloSkuFor`:

```typescript
import { arteloSkuFor } from './artelo-catalog'
```

- [ ] **Step 2: Run the adapter tests (guards unchanged)**

Run: `npx jest artelo-adapter`
Expected: 3 passing (guard behaviour unchanged).

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Compiles successfully.

- [ ] **Step 4: Commit**

```bash
git add lib/fulfillment/artelo.ts
git commit -m "feat: Artelo orders/create HTTP call (schema to confirm vs docs)"
```

---

## Task 9: Wire dispatcher into the Stripe webhook

**Files:**
- Modify: `app/api/webhooks/stripe/route.ts`

**Context:** Refactor the webhook to: keep signature verification, edition counting, and the customer confirmation email; replace the inline owner email with building a `FulfilmentOrder` and calling `dispatch`; add idempotency via the order doc; and upsert the order record. The owner email is now sent *by the email provider inside dispatch* — so remove the inline owner-email send but keep the customer confirmation email.

- [ ] **Step 1: Add imports at the top of app/api/webhooks/stripe/route.ts**

```typescript
import { dispatch } from '@/lib/fulfillment/dispatcher'
import { notifyOwnerArteloSubmitted } from '@/lib/fulfillment/email'
import { getPrintFileUrlByPriceId } from '@/lib/sanity/queries'
import { findOrderBySession, upsertOrder } from '@/lib/sanity/orders'
import type { FulfilmentOrder, FulfilmentLine } from '@/lib/fulfillment/types'
```

(Note: the webhook may already import `getProviderForCountry` from `@/lib/order-routing`; keep that import if present.)

- [ ] **Step 2: Add idempotency short-circuit after `session` is obtained**

Immediately after the line `const session = event.data.object as Stripe.Checkout.Session`, add:

```typescript
  const existing = await findOrderBySession(session.id)
  if (existing?.arteloOrderId) {
    return new Response(null, { status: 200 }) // already fulfilled via Artelo
  }
```

- [ ] **Step 3: Build FulfilmentLine[] in the line-item loop**

The existing loop builds `fulfilItems` (title/size/frame/qty/imageUrl) and increments editions. Extend each pushed item to also resolve the print-file URL and region fields. Replace the existing `fulfilItems.push({ ... })` call with:

```typescript
    const printFileUrl = await getPrintFileUrlByPriceId(priceId)
    fulfilItems.push({
      photoId: photo?._id ?? '',
      photoTitle: photo?.title ?? item.description ?? 'Unknown print',
      size: photo?.variant?.size ?? '',
      frame: photo?.variant?.frame ?? '',
      qty,
      imageUrl: photo?.image ? urlFor(photo.image).width(120).height(120).fit('crop').format('jpg').url() : '',
      printFileUrl,
    })
```

Update the `fulfilItems` type declaration (the `const fulfilItems: {...}[] = []` line) to:

```typescript
  const fulfilItems: { photoId: string; photoTitle: string; size: string; frame: string; qty: number; imageUrl: string; printFileUrl?: string }[] = []
```

(Note: the GROQ in this loop already selects `_id, title, image, ...` and the matched `variant`. No GROQ change needed.)

- [ ] **Step 4: Replace the inline owner email send with dispatch**

Find the `try { ... }` block that sends the owner email (`from: ... to: process.env.OWNER_EMAIL ...`). Remove **only the owner-email `resend.emails.send(...)` call** (keep the customer confirmation send). In its place, after the customer email block, add the fulfilment dispatch and order upsert:

```typescript
  const region = (['US', 'CA', 'MX'].includes(country) ? 'US' : ['AU', 'NZ'].includes(country) ? 'AU' : 'UK') as 'US' | 'UK' | 'AU'
  const lines: FulfilmentLine[] = fulfilItems.map(i => ({
    photoId: i.photoId,
    photoTitle: i.photoTitle,
    size: i.size as FulfilmentLine['size'],
    frame: i.frame as FulfilmentLine['frame'],
    qty: i.qty,
    printFileUrl: i.printFileUrl,
  }))
  const fulfilmentOrder: FulfilmentOrder = {
    sessionId: session.id,
    region,
    country,
    customerName,
    customerEmail,
    shippingAddress: addressLines.join(', '),
    addressLines,
    city,
    total: session.amount_total ?? 0,
    lines,
  }

  let result
  try {
    result = await dispatch(fulfilmentOrder)
  } catch (err) {
    console.error('Fulfilment dispatch failed:', err)
    result = { ok: false as const, provider: 'none', error: String(err) }
  }

  // Narrow the result once so TypeScript knows providerOrderId is available.
  let viaArtelo = false
  let arteloOrderId: string | undefined
  if (result.ok && result.provider === 'artelo') {
    viaArtelo = true
    arteloOrderId = result.providerOrderId
  }

  try {
    await upsertOrder({
      sessionId: session.id,
      region,
      customerName,
      customerEmail,
      shippingAddress: addressLines.join(', '),
      items: fulfilItems.map(i => ({ photoTitle: i.photoTitle, size: i.size, frame: i.frame, qty: i.qty })),
      total: session.amount_total ?? 0,
      fulfilment: viaArtelo ? 'artelo' : 'manual',
      arteloOrderId,
      status: result.ok ? (viaArtelo ? 'submitted' : 'manual') : 'failed',
    })
  } catch (err) {
    console.error('Order upsert failed:', err)
  }

  // On Artelo success, send the owner a short "submitted" notice (spec §5).
  if (viaArtelo) {
    await notifyOwnerArteloSubmitted(fulfilmentOrder, arteloOrderId)
  }
```

- [ ] **Step 5: Verify build and tests**

Run: `npm run build && npx jest`
Expected: build compiles; all tests pass (cart, order-routing, artelo-catalog, artelo-adapter, fulfillment-dispatcher).

- [ ] **Step 6: Commit**

```bash
git add app/api/webhooks/stripe/route.ts
git commit -m "feat: webhook builds FulfilmentOrder, dispatches, and records order"
```

---

## Task 10: Go-live config + docs (owner-gated)

**Files:**
- Modify: `.env.local`

**Context:** This task documents the flip-to-live steps. It does not change app behaviour beyond env. Keep `ARTELO_ENABLED` unset/false until the catalog IDs are filled and a test order passes.

- [ ] **Step 1: Add Artelo env vars to .env.local**

```bash
ARTELO_API_KEY=replace_me
ARTELO_ENABLED=false
```

- [ ] **Step 2: Document go-live steps (no code)**

Go-live, in order:
1. Fill `ARTELO_SKUS` in `lib/fulfillment/artelo-catalog.ts` with real catalog product/variant ids (commit).
2. Confirm the Task 8 request shape against Artelo's `orders/create` docs; adjust the body/endpoint/headers if needed (commit).
3. Set `ARTELO_API_KEY` (real key) in Vercel + `.env.local`.
4. Upload a `printFile` master to one US-eligible photo in Sanity.
5. With `ARTELO_ENABLED=false` still, run a live test US checkout → confirm the order falls back to email and an `order` doc is created with `status: manual`.
6. Set `ARTELO_ENABLED=true` for a single controlled test → place one US test order (A4 unframed to yourself) → confirm Artelo receives it and the `order` doc shows `status: submitted` + `arteloOrderId`.
7. Confirm the physical test print (quality + aspect-ratio handling) before leaving it on.

- [ ] **Step 3: Commit**

```bash
git add .env.local
git commit -m "chore: Artelo env flags and go-live runbook"
```

Note: `.env.local` is gitignored; if the commit includes nothing, that's expected — the runbook lives in this plan.

---

## All Tests

```bash
npx jest
```

Expected:
```
PASS __tests__/cart-reducer.test.ts
PASS __tests__/order-routing.test.ts
PASS __tests__/artelo-catalog.test.ts
PASS __tests__/artelo-adapter.test.ts
PASS __tests__/fulfillment-dispatcher.test.ts
```
