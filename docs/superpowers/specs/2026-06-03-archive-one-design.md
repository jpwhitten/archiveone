# Archive One — Design Spec
**Date:** 2026-06-03  
**Domain:** archiveone.studio  
**Status:** Approved for implementation

---

## 1. Overview

Archive One is a premium photography portfolio and print shop. The work is the product — the site's job is to get out of the way and let the photographs speak. Customers browse an editorial archive, discover collections, and purchase physical fine-art prints fulfilled via regional print-on-demand providers.

This is a learning project. Budget is minimised. The stack runs entirely on free tiers until real sales volume requires upgrades.

---

## 2. Stack

| Layer | Tool | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) | TypeScript throughout |
| Hosting | Vercel (hobby tier) | Free |
| CMS | Sanity | Free tier, 20GB |
| Payments | Stripe | No monthly fee, ~1.5% + 25p per transaction |
| Email | Resend | Free tier, 3,000 emails/month |
| Domain | archiveone.studio | Purchased on Squarespace, point DNS to Vercel |

---

## 3. Pages & Routes

```
/                               Home
/archive                        Full portfolio grid
/archive/[collection-slug]      Collection view in archive
/shop                           Shop grid (filterable by collection)
/shop/[photo-slug]              Individual print page
/wishlist                       Saved prints (localStorage)
/about                          About + print quality info
/order/success                  Post-payment confirmation
```

**Cart** is a slide-out drawer, not a page. Accessible from the persistent nav.

---

## 4. Navigation

```
[Archive Nº1 logo]                    The Archive · Shop · Wishlist · About · Cart (count)
```

Mobile: single column layout, hamburger menu.

---

## 5. Data Model (Sanity)

### Photo
```
title           string        "Flamingos, Camargue"
slug            slug          flamingos-camargue
image           image         high-res, Sanity CDN + transforms
description     text          optional caption or story
location        string        optional "Camargue, France"
collections[]   reference[]   links to Collection documents
featured        boolean       appears in home page grid
forSale         boolean       toggle to list in Shop
editionSize     number        optional — null means open edition
editionSold     number        auto-incremented by Stripe webhook
variants[]      object[]      purchasable size + frame combinations:
                                size          "A4" | "A3" | "A2" | "A1"
                                frame         "Unframed" | "Black" | "White" | "Natural"
                                price         integer (pence, e.g. 4500 = £45.00)
                                stripePriceId string (created in Stripe, pasted here)
mockupImages[]  image[]       optional lifestyle/room mockup photos (uploaded manually)
```

### Collection
```
title           string        "Paris"
slug            slug          paris
description     text          optional
coverPhoto      reference     reference to one Photo
```

Photos belong to collections via the `collections[]` field on Photo (many-to-many). Collections are purely editorial — they group and organise photos for browsing. No commerce logic is attached to collections.

---

## 6. Commerce Flow

```
1. Customer browses Shop or Archive
2. On a print page: selects size + frame → clicks "Add to Cart"
3. Cart drawer opens — shows all items, running total
4. Customer clicks "Checkout"
5. Server action creates a Stripe Checkout Session (line items + shipping address collection)
6. Customer redirected to Stripe hosted checkout page
7. Payment confirmed → redirected to /order/success
8. Stripe fires checkout.session.completed webhook
9. Server reads shipping country from webhook payload
10. Region routing maps country → recommended POD provider
11. Resend sends order summary email to site owner
```

### Cart
- Stored in React Context + localStorage (client-side only)
- Each cart item:
  ```
  photoId, photoTitle, photoImage, size, frame, price, stripePriceId
  ```
- No backend cart. No user accounts required to purchase.

### Stripe Checkout
- Hosted Stripe page (no custom payment form to build)
- Shipping address collected by Stripe during checkout
- Success URL: `/order/success?session_id={CHECKOUT_SESSION_ID}`

### Region Routing Logic
```
US, CA, MX          → US provider
GB, IE, + EU        → UK provider
AU, NZ              → AU provider
All other countries → UK provider (international shipping)
```

Provider list and region mappings live in a config file — no database changes needed when swapping providers.

### Order Email (via Resend)

Sent to site owner on each successful payment:

```
Subject: New Order — [Customer Name] · [City, Country]

Recommended provider: Prodigi UK

Items to fulfil:
  → Flamingos, Camargue      A3 · Black Frame    (Edition 12 of 50)
  → Eiffel Tower at Night    A2 · Unframed       (Open edition)

Customer: Sarah Mitchell
Ship to: 14 Park Lane, London, W1K 1BE

Total charged: £85.00

Log in at prodigi.com to submit this order.
```

---

## 7. Limited Editions

- `editionSize` on Photo — optional integer. If null, print is open edition.
- `editionSold` on Photo — incremented automatically by the Stripe webhook on purchase.
- Print page displays: **"Edition 12 of 50"** or **"Open edition"**
- When `editionSold >= editionSize`, the variant is marked sold out and cannot be added to cart.
- Sold out state is enforced server-side (checkout session creation checks edition count).

---

## 8. Wishlist

- Stored in localStorage — no backend, no user accounts.
- Heart icon on every photo card (Archive, Shop) and on individual print pages.
- `/wishlist` page shows all saved prints with photo, title, starting price, and "Add to Cart" button.
- Wishlist persists across sessions on the same device.

---

## 9. Open Graph / Social Sharing

- Every print page (`/shop/[slug]`) generates an OG image from the photo itself via Next.js `generateMetadata`.
- Every collection page generates an OG image from the collection's cover photo.
- Home page and About use a static branded OG image.
- When a print link is shared on Instagram, iMessage, Twitter, etc. — the photograph appears as the preview.

---

## 10. Visual Design System

### Palette
```
Background    #FFFFFF / #F5F5F5
Text          #0A0A0A
Accent        None — photos provide all colour
```

### Typography
```
Logo / Display    Spaced grotesque (tracking: wide)
Body / Nav        Inter or DM Sans
Prices / Labels   Monospace — editorial feel
```

### Layout
```
Home          Two-column masonry grid, edge-to-edge images
Archive       Masonry grid, full catalogue
Shop          Uniform grid (consistent image height) — cleaner for products
Print page    Large image left · details + selector right
Marquee       Scrolling strip — "COLLECT · PRINTS · ARCHIVE ONE ·"
Nav           Minimal top bar — logo left, links right
```

### Interactions
```
Image hover     Subtle scale (1.02) + title fade in
Cart drawer     Slides in from the right
Add to cart     Drawer opens automatically — no page navigation
Mobile          Single column, hamburger nav
```

Photos are always full-bleed. No drop shadows. No decorative borders.

---

## 11. Domain Setup

- Domain purchased on Squarespace (archiveone.studio)
- Point DNS to Vercel by adding Vercel's nameservers or A/CNAME records in Squarespace DNS settings
- Vercel handles SSL automatically

---

## 12. Print Mockups

Two layers of product visualisation on every print page:

### CSS Frame Preview (always present)
- Rendered entirely in React + CSS — no external service
- Shows the actual photograph inside a simulated frame matching the customer's current selection
- Updates live as the customer changes size or frame option
- Frame styles:
  ```
  Unframed      thin border-radius: 0, subtle drop shadow
  Black frame   thick black border + white mat
  White frame   thick white border + white mat
  Natural       thick warm-wood-tone border + white mat
  ```
- Proportions scale with the selected size (A4 is visibly smaller than A1)

### Room Mockup Images (optional, per photo)
- Stored in `mockupImages[]` on the Photo type in Sanity
- Lifestyle images you produce manually — print on a wall, on a shelf, in a room
- Displayed as a secondary image gallery below the frame preview on the print page
- If no mockup images are uploaded, the section simply doesn't render

### Print Page Layout
```
[Large photo — main image]
[Room mockup thumbnails if available]

[Live CSS frame preview — updates with selection]
  Size:   A4 · A3 · A2 · A1
  Frame:  Unframed · Black · White · Natural
  Price:  £45.00
  Edition: 12 of 50 remaining (or Open edition)
  [Add to Cart]
```

---

## 13. What's Explicitly Out of Scope (for now)

- User accounts / order history
- Bundle / multi-print discount products
- Automated POD API integration (orders are fulfilled manually via email)
- Commission / bespoke inquiry form
- Analytics (can add Vercel Analytics in one line later)
