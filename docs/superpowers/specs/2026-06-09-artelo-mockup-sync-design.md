# Artelo Mockup Sync — Design Spec
**Date:** 2026-06-09
**Project:** Archive One (archiveone.studio)
**Status:** Approved for planning

---

## 1. Overview

Automatically generate framed-on-wall product mockups for each for-sale photo using Artelo's mockup-render API, and store them in Sanity for display on print pages. A manual, idempotent script (following the existing pricing-script pattern) generates **4 mockups per photo** — one per frame style (Unframed, Black, White, Natural) at one representative size — downloads them into Sanity, and writes them to a dedicated `arteloMockups` field.

**Success criteria:** running `npm run sync-mockups -- <slug>` (or all) produces 4 polished framed mockups per eligible photo, visible in that photo's print-page gallery, with no manual image work. Re-running is safe (replaces, never duplicates). Photos without a print master are skipped cleanly.

**Out of scope:** automatic/triggered syncing (it's manual only); per-variant mockups (all 16); reusing Artelo mockup-products for order fulfilment.

---

## 2. Architecture & Flow

Follows the existing `scripts/` pattern: a manual Node script that reads `.env.local`, is idempotent, and supports `--dry`.

```
scripts/sync-artelo-mockups.ts      run: npm run sync-mockups -- <slug>   (or all for-sale photos)
lib/fulfillment/artelo-mockups.ts   Artelo render call: artwork + frame + size → mockup image URL
```

**Per photo:**
```
1. Read printFile master URL (Sanity); skip photo if absent.
2. For each frame style [Unframed, Black, White, Natural] at one size (A2):
     → request a mockup render from Artelo (artwork URL + frame + size)
     → receive a mockup image URL
3. Download each mockup → upload to Sanity as an image asset.
4. Replace the photo's arteloMockups array with the 4 fresh assets;
   best-effort delete the previously-referenced (now orphaned) assets.
```

**Reuses:** the `printFile` master field, the frame list, the Sanity write client, the `.env.local` loader and CLI pattern from the pricing script. **New:** the Artelo render call (`lib/fulfillment/artelo-mockups.ts`), whose exact endpoint/params are confirmed against Artelo's docs at build-time.

---

## 3. Schema

One new field on the **Photo** type:

```
arteloMockups   image[]   — auto-generated framed mockups (managed by the sync script)
```

The existing `mockupImages` (manual room mockups) is unchanged and still supported.

- Studio description: "Managed automatically by the mockup sync — manual edits are overwritten." (Discourages hand-editing.)
- Ownership is clean: the script owns `arteloMockups`; the owner owns `mockupImages`.

**Print-page gallery change:** the existing gallery maps over `mockupImages`; it changes to map over `[...arteloMockups, ...mockupImages]` (synced framed shots first, then any manual ones). One-line change; no other display work.

---

## 4. Idempotency

- Each run **replaces** `arteloMockups` wholesale (writes 4 fresh assets), so re-running never duplicates and never touches `mockupImages`.
- Because Sanity image uploads create new assets each run, the script captures the photo's current `arteloMockups` asset refs first, uploads the 4 new assets, sets the field, then **best-effort deletes the old orphaned assets** so storage doesn't accumulate.

---

## 5. Error Handling

The script fails loud but safe, with per-photo isolation:

- **No `printFile`** → skip the photo with a clear log ("Inca Terns: no print master, skipped"); continue.
- **A frame's render fails** → log, skip that single mockup, keep the others (a photo may end with 3 of 4).
- **Per-photo isolation** → one photo's failure never aborts the batch.
- **End-of-run summary** → e.g. "9 synced, 2 skipped (no master)".
- **`--dry` flag** → prints the planned renders without calling Artelo or writing Sanity (matches the pricing script).

---

## 6. Prerequisites (gate the build, not the design)

1. **`ARTELO_API_KEY`** — same key as the fulfilment integration; not yet obtained.
2. **Artelo mockup-render endpoint** — request shape (artwork URL + product/frame + size) and response (mockup URL) confirmed against Artelo's docs. The render call is written to a sensible provisional shape and marked "confirm against docs."

---

## 7. Safety / Gating

- Pure manual script — runs only when invoked. No webhook involvement, nothing automatic, zero impact on the live shop or checkout.
- It writes **only** the `arteloMockups` field. It cannot touch orders, prices, or anything customer-facing.

---

## 8. Testing

- **Unit-testable without the API:** the pure logic — which photos qualify (have a `printFile`), and the frame list → render-request mapping.
- **Manual validation once the key exists:** `--dry` first, then a single real photo, confirming 4 mockups appear in Sanity and on the print page.

---

## 9. Out of Scope

- Automatic/triggered syncing (manual only).
- Per-variant mockups (all 16) — one per frame style only.
- Reusing the Artelo mockup-products for order fulfilment (fulfilment stays per-order upload).
