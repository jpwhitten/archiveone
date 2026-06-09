# Artelo Fulfilment Integration — Design Spec
**Date:** 2026-06-09
**Project:** Archive One (archiveone.studio)
**Status:** Approved for planning

---

## 1. Overview

Automate **US/NA order fulfilment** through Artelo's REST API. When a US/CA/MX order is paid, the site submits the print order to Artelo automatically — fully hands-off. Every other region (and every failure case) falls back to the existing manual order email. This is the "full automation" upgrade deferred from the original Archive One spec, scoped to one region and one provider.

**Success criteria:** a paid US order results in an Artelo order submitted automatically with the correct product, frame, and full-resolution master, and the owner receives a short "submitted" confirmation. No manual step in the happy path. No order is ever lost — any failure degrades to the manual email flow that exists today.

**Explicitly out of scope (for now):** customer shipping/tracking relay; UK/EU/AU automation (Prodigi/Printseekers); live catalog sync.

---

## 2. Architecture

A provider-agnostic fulfilment layer isolates all provider detail behind one interface. The Stripe webhook becomes thin: verify → assemble an order → dispatch.

```
lib/fulfillment/
├── types.ts          FulfilmentProvider interface, FulfilmentOrder, FulfilmentResult
├── dispatcher.ts     picks provider by region; calls it; owns the fallback rule
├── artelo.ts         Artelo adapter — maps order → Artelo API call
├── artelo-catalog.ts static map: our (size,frame) → Artelo product/variant SKU IDs
└── email.ts          existing manual order email, refactored as a provider

app/api/webhooks/stripe/route.ts   (thin) verify → build FulfilmentOrder → dispatch
```

### Core interface
```ts
interface FulfilmentProvider {
  name: string
  submit(order: FulfilmentOrder): Promise<FulfilmentResult>
}

type FulfilmentResult =
  | { ok: true; providerOrderId?: string }
  | { ok: false; error: string }
```

- **Dispatcher** picks the adapter by shipping country (US/CA/MX → Artelo; else → email) and owns the **fallback rule**: if Artelo cannot safely submit, fall through to the email adapter.
- **Artelo adapter** is the only code that knows Artelo exists; it translates `FulfilmentOrder` → Artelo request and calls the API.
- **Email adapter** is today's manual order email, lifted out of the webhook into its own provider.

Adding a future provider (e.g. Prodigi for UK) = one new adapter file + a dispatcher mapping entry. No webhook changes.

---

## 3. Sanity Schema Change

One new field on the **Photo** type:

```
printFile   file (high-res master)   — full-resolution image sent to Artelo for printing
```

- Type is **`file`** (not `image`) so Sanity stores it untransformed and serves the original at full resolution.
- Sits alongside the existing `image` (web-optimized display version). The site continues to use `image` everywhere; **only fulfilment uses `printFile`**.
- Optional in schema, but **required for automated fulfilment**: a for-sale photo with no `printFile` falls back to the manual email. This enables gradual rollout — upload masters over time; un-mastered photos simply use the manual flow.
- Studio nicety: a soft validation warning when `forSale` is true but `printFile` is empty ("No print master — orders will fall back to manual"). Non-blocking.

**Storage:** Sanity free tier is 20GB and serves assets via CDN at original resolution. 11 photos × ~30MB high-res JPEGs is well within limits. Revisit only if masters become very large (100MB+ TIFFs).

---

## 4. Variant → Artelo SKU Mapping

A static, version-controlled map translating our `(size, frame)` to Artelo's catalog identifiers.

```ts
// lib/fulfillment/artelo-catalog.ts
export const ARTELO_SKUS: Record<string, { productId: string; variantId: string }> = {
  'A4|Unframed': { productId: '…', variantId: '…' },
  'A4|Black':    { productId: '…', variantId: '…' },  // Fine-art matte, Oak black
  'A4|White':    { productId: '…', variantId: '…' },
  'A4|Natural':  { productId: '…', variantId: '…' },
  // … all 16 (size × frame) combinations
}
```

- Keyed by `` `${size}|${frame}` ``.
- IDs come from **Artelo's catalogue** (fine-art-matte A-sizes × Oak frames), pulled from the owner's Artelo account — a prerequisite (see §7).
- **Unmapped variant → fall back to email.** An unmapped combo can never produce a broken Artelo order.
- Static config (not live-synced) because the catalogue is tiny and stable; a hand-maintained, committed file is simpler and dependency-free.

---

## 5. Data Flow

```
Stripe: checkout.session.completed  (US order)
   │ verify signature
   ▼
Webhook builds FulfilmentOrder:
   • recipient: name, email, shipping address     (Stripe session)
   • region: derived from shipping country
   • lines: [{ photoId, title, size, frame, qty, printFileUrl }]  (line items → Sanity)
   ▼
Dispatcher.dispatch(order)
   ├─ region US/CA/MX → ArteloProvider.submit(order)
   │     • map each line via ARTELO_SKUS[`${size}|${frame}`]
   │     • attach printFile URL (full-res master)
   │     • POST Artelo orders/create  (idempotency key = Stripe session id)
   │     • ok   → store arteloOrderId, email owner "Submitted to Artelo #…"
   │     • fail / missing master / unmapped → fall through ↓
   └─ else / fallback → EmailProvider.submit(order)  (manual work-order email)
   ▼
Region-independent (always): increment edition counts, send customer confirmation email,
   upsert the order document
   ▼
Return 200 to Stripe
```

- Edition counting and the customer confirmation email are region-independent and unchanged; only the *fulfilment branch* differs.
- On Artelo success the owner still gets a short "submitted" email (record + no surprises).

---

## 6. Error Handling, Fallback & Idempotency

**Graceful fallback (never drop an order).** The Artelo adapter falls back to the email provider on: API error/timeout/auth failure, missing `printFile`, unmapped variant, or any unexpected exception. Worst case, automation degrades to today's manual flow.

**Idempotency (never print twice).** Stripe retries webhooks on non-200/timeout.
- Pass the **Stripe session id as Artelo's idempotency key** (server-side dedupe).
- Before submitting, check the **order document** (by `sessionId`) for an existing `arteloOrderId`; skip if already submitted.

**Webhook always returns 200 after processing.** Fulfilment is wrapped so a failure logs + falls back but never 500s the webhook (which would cause endless Stripe retries). Extends today's "best-effort email" principle to the whole fulfilment step.

---

## 7. Order Document (Sanity)

A minimal `order` document — idempotency key + operational history.

```
order {
  sessionId        string     (Stripe session id; unique; idempotency key)
  createdAt        datetime
  region           string
  customerName     string
  customerEmail    string
  shippingAddress  text
  items[]          { photoTitle, size, frame, qty }
  total            number     (pence)
  fulfilment       'artelo' | 'manual'
  arteloOrderId    string     (set on Artelo success)
  status           'submitted' | 'manual' | 'failed'
}
```

Provides idempotency (look up by `sessionId` before submitting) and a real order history in the Studio.

---

## 8. Prerequisites (gating implementation)

1. **Artelo account + API key** → `ARTELO_API_KEY` env var (Vercel + `.env.local`).
2. **Catalog product/variant IDs** for fine-art-matte A-sizes × Oak frames → fills `artelo-catalog.ts`.
3. **Order-create request schema** from Artelo's docs → the adapter's request body is marked "to confirm against Artelo docs" until obtained.

---

## 9. Test Strategy & Rollout

- US live-fulfilment stays behind an **`ARTELO_ENABLED`** flag until validated. With the flag off, US orders use the manual email (current behaviour) even after the code ships.
- Validate the adapter against Artelo's **sandbox/test mode** if available; otherwise a single **real low-cost test order** (A4 unframed, shipped to the owner) to confirm the full print+ship loop.
- Flip `ARTELO_ENABLED` on only after the test print passes — a deliberate go-live step.

---

## 10. Known Caveat (document, do not solve now)

**Aspect ratio.** Photos vary in shape; A-series is a fixed ratio. Artelo will crop or border a non-matching image. Confirm Artelo's handling during the test print, then decide policy (crop / white border / nearest size). Does not block the build.

---

## 11. Out of Scope (for now)

- Customer shipping/tracking relay (Artelo status webhooks → customer email).
- UK/EU (Prodigi/Printseekers) and AU automation — the abstraction makes these additive later.
- Live catalog sync from Artelo.
