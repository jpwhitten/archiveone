# Archive One — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build archiveone.studio — a premium photography portfolio and print shop with Sanity CMS, Stripe payments, regional POD order routing, limited editions, wishlist, and CSS frame previews.

**Architecture:** Next.js 15 App Router with TypeScript throughout. Sanity provides the CMS with an embedded Studio at `/studio`. Commerce is handled by Stripe Checkout (hosted) with a webhook that triggers regional order routing and a Resend email to the site owner. Cart and wishlist are client-side only (localStorage + React Context).

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS 3, Sanity v3, next-sanity, @sanity/image-url, Stripe, Resend, Vercel

**Shippable milestones:**
- After Task 8: Portfolio (Archive) is live — photos, collections, home page
- After Task 20: Full site with shop, cart, checkout, and order routing

---

## File Map

```
├── app/
│   ├── layout.tsx                        Root HTML shell (fonts, metadata)
│   ├── (site)/
│   │   ├── layout.tsx                    Site layout with Nav + CartDrawer
│   │   ├── page.tsx                      Home
│   │   ├── archive/
│   │   │   ├── page.tsx                  Full archive grid
│   │   │   └── [collection]/page.tsx     Filtered by collection
│   │   ├── shop/
│   │   │   ├── page.tsx                  Shop grid
│   │   │   └── [slug]/page.tsx           Individual print page
│   │   ├── wishlist/page.tsx
│   │   ├── about/page.tsx
│   │   └── order/success/page.tsx
│   ├── studio/[[...tool]]/page.tsx       Sanity Studio (no layout wrapper)
│   └── api/
│       ├── checkout/route.ts             Create Stripe Checkout Session
│       └── webhooks/stripe/route.ts      Stripe webhook handler
├── components/
│   ├── layout/
│   │   ├── Nav.tsx
│   │   └── CartDrawer.tsx
│   ├── archive/
│   │   ├── MasonryGrid.tsx
│   │   └── PhotoCard.tsx
│   ├── shop/
│   │   ├── ShopGrid.tsx
│   │   ├── ProductCard.tsx
│   │   ├── PrintSelector.tsx
│   │   ├── FramePreview.tsx
│   │   └── CollectionFilter.tsx
│   ├── cart/
│   │   ├── CartContext.tsx
│   │   └── CartItem.tsx
│   ├── wishlist/
│   │   ├── WishlistContext.tsx
│   │   └── WishlistButton.tsx
│   └── ui/
│       └── Marquee.tsx
├── lib/
│   ├── sanity/
│   │   ├── client.ts
│   │   ├── queries.ts
│   │   └── image.ts
│   ├── stripe.ts
│   ├── order-routing.ts
│   └── types.ts
├── sanity/
│   ├── schema/
│   │   ├── photo.ts
│   │   ├── collection.ts
│   │   └── index.ts
│   └── sanity.config.ts
└── __tests__/
    ├── order-routing.test.ts
    └── cart-reducer.test.ts
```

---

## Phase 1: Foundation

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json` (via CLI)
- Create: `.env.local`
- Create: `.gitignore`
- Create: `jest.config.ts`
- Create: `jest.setup.ts`

- [ ] **Step 1: Scaffold Next.js project**

Run in `c:\Users\JPWhi\Projects\ArchiveOne`:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias="@/*" --no-git
```
Answer prompts: accept all defaults.

Expected: Next.js project files appear in the directory.

- [ ] **Step 2: Install additional dependencies**

```bash
npm install sanity next-sanity @sanity/image-url stripe resend
npm install -D jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @types/jest ts-jest
```

- [ ] **Step 3: Create jest.config.ts**

```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
}

export default createJestConfig(config)
```

- [ ] **Step 4: Create jest.setup.ts**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Create .env.local**

```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=replace_me
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_TOKEN=replace_me
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_replace_me
STRIPE_SECRET_KEY=sk_test_replace_me
STRIPE_WEBHOOK_SECRET=whsec_replace_me
RESEND_API_KEY=re_replace_me
NEXT_PUBLIC_SITE_URL=http://localhost:3000
OWNER_EMAIL=your@email.com
```

- [ ] **Step 6: Init git**

```bash
git init
git add .
git commit -m "chore: scaffold Next.js 15 project"
```

---

### Task 2: Sanity Project + Schema

**Files:**
- Create: `sanity/sanity.config.ts`
- Create: `sanity/schema/photo.ts`
- Create: `sanity/schema/collection.ts`
- Create: `sanity/schema/index.ts`

- [ ] **Step 1: Create a Sanity project**

Go to [sanity.io/manage](https://sanity.io/manage) → New Project → name it "Archive One" → dataset: `production`.

Copy the Project ID into `.env.local` as `NEXT_PUBLIC_SANITY_PROJECT_ID`.

Generate a token: Project Settings → API → Tokens → Add API Token → name "write-token", role "Editor". Copy into `SANITY_API_TOKEN`.

- [ ] **Step 2: Create sanity/schema/photo.ts**

```typescript
import { defineType, defineField, defineArrayMember } from 'sanity'

export const photo = defineType({
  name: 'photo',
  title: 'Photo',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title' },
      validation: Rule => Rule.required(),
    }),
    defineField({
      name: 'image',
      type: 'image',
      options: { hotspot: true },
      validation: Rule => Rule.required(),
    }),
    defineField({ name: 'description', type: 'text', rows: 3 }),
    defineField({ name: 'location', type: 'string' }),
    defineField({
      name: 'collections',
      type: 'array',
      of: [defineArrayMember({ type: 'reference', to: [{ type: 'collection' }] })],
    }),
    defineField({ name: 'featured', type: 'boolean', initialValue: false }),
    defineField({ name: 'forSale', type: 'boolean', initialValue: false }),
    defineField({ name: 'editionSize', type: 'number', description: 'Leave blank for open edition' }),
    defineField({ name: 'editionSold', type: 'number', initialValue: 0, readOnly: true }),
    defineField({
      name: 'variants',
      title: 'Print Variants',
      type: 'array',
      of: [defineArrayMember({
        type: 'object',
        fields: [
          defineField({ name: 'size', type: 'string', options: { list: ['A4', 'A3', 'A2', 'A1'] }, validation: Rule => Rule.required() }),
          defineField({ name: 'frame', type: 'string', options: { list: ['Unframed', 'Black', 'White', 'Natural'] }, validation: Rule => Rule.required() }),
          defineField({ name: 'price', type: 'number', description: 'Price in pence (e.g. 4500 = £45.00)', validation: Rule => Rule.required().min(1) }),
          defineField({ name: 'stripePriceId', type: 'string', validation: Rule => Rule.required() }),
        ],
        preview: {
          select: { title: 'size', subtitle: 'frame', price: 'price' },
          prepare({ title, subtitle, price }) {
            return { title: `${title} · ${subtitle}`, subtitle: `£${(price / 100).toFixed(2)}` }
          },
        },
      })],
    }),
    defineField({
      name: 'mockupImages',
      title: 'Room Mockup Images',
      type: 'array',
      of: [defineArrayMember({ type: 'image', options: { hotspot: true } })],
      description: 'Optional lifestyle photos showing the print in a room',
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'location', media: 'image' },
  },
})
```

- [ ] **Step 3: Create sanity/schema/collection.ts**

```typescript
import { defineType, defineField } from 'sanity'

export const collection = defineType({
  name: 'collection',
  title: 'Collection',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', validation: Rule => Rule.required() }),
    defineField({ name: 'slug', type: 'slug', options: { source: 'title' }, validation: Rule => Rule.required() }),
    defineField({ name: 'description', type: 'text', rows: 3 }),
    defineField({ name: 'coverPhoto', type: 'reference', to: [{ type: 'photo' }] }),
  ],
  preview: {
    select: { title: 'title', media: 'coverPhoto.image' },
  },
})
```

- [ ] **Step 4: Create sanity/schema/index.ts**

```typescript
import { photo } from './photo'
import { collection } from './collection'

export const schemaTypes = [photo, collection]
```

- [ ] **Step 5: Create sanity/sanity.config.ts**

```typescript
import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'
import { schemaTypes } from './schema'

export default defineConfig({
  name: 'archive-one',
  title: 'Archive One',
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  plugins: [structureTool(), visionTool()],
  schema: { types: schemaTypes },
})
```

- [ ] **Step 6: Commit**

```bash
git add sanity/
git commit -m "feat: add Sanity schema for Photo and Collection"
```

---

### Task 3: TypeScript Types + Sanity Client + Queries

**Files:**
- Create: `lib/types.ts`
- Create: `lib/sanity/client.ts`
- Create: `lib/sanity/image.ts`
- Create: `lib/sanity/queries.ts`

- [ ] **Step 1: Create lib/types.ts**

```typescript
import type { SanityImageSource } from '@sanity/image-url/lib/types/types'

export interface SanityImage {
  _type: 'image'
  asset: { _ref: string; _type: 'reference' }
  hotspot?: { x: number; y: number }
}

export interface PrintVariant {
  _key: string
  size: 'A4' | 'A3' | 'A2' | 'A1'
  frame: 'Unframed' | 'Black' | 'White' | 'Natural'
  price: number
  stripePriceId: string
}

export interface Collection {
  _id: string
  title: string
  slug: { current: string }
  description?: string
  coverPhoto?: Photo
}

export interface Photo {
  _id: string
  title: string
  slug: { current: string }
  image: SanityImage
  description?: string
  location?: string
  collections?: Collection[]
  featured: boolean
  forSale: boolean
  editionSize?: number
  editionSold: number
  variants?: PrintVariant[]
  mockupImages?: SanityImage[]
}

export interface CartItem {
  photoId: string
  photoTitle: string
  photoSlug: string
  photoImage: SanityImage
  size: PrintVariant['size']
  frame: PrintVariant['frame']
  price: number
  stripePriceId: string
}

export function cartItemKey(item: Pick<CartItem, 'photoId' | 'size' | 'frame'>): string {
  return `${item.photoId}-${item.size}-${item.frame}`
}
```

- [ ] **Step 2: Create lib/sanity/client.ts**

```typescript
import { createClient } from 'next-sanity'

export const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2024-01-01',
  useCdn: true,
})

export const sanityWriteClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
})
```

- [ ] **Step 3: Create lib/sanity/image.ts**

```typescript
import imageUrlBuilder from '@sanity/image-url'
import { sanityClient } from './client'
import type { SanityImage } from '@/lib/types'

const builder = imageUrlBuilder(sanityClient)

export function urlFor(source: SanityImage) {
  return builder.image(source)
}
```

- [ ] **Step 4: Create lib/sanity/queries.ts**

```typescript
import { groq } from 'next-sanity'
import { sanityClient } from './client'
import type { Photo, Collection } from '@/lib/types'

const photoFields = groq`
  _id, title, slug, image, description, location,
  featured, forSale, editionSize, editionSold,
  variants, mockupImages,
  "collections": collections[]->{ _id, title, slug }
`

export async function getFeaturedPhotos(): Promise<Photo[]> {
  return sanityClient.fetch(
    groq`*[_type == "photo" && featured == true] | order(_createdAt desc) [0...20] { ${photoFields} }`
  )
}

export async function getAllPhotos(): Promise<Photo[]> {
  return sanityClient.fetch(
    groq`*[_type == "photo"] | order(_createdAt desc) { ${photoFields} }`
  )
}

export async function getPhotosByCollection(collectionSlug: string): Promise<Photo[]> {
  return sanityClient.fetch(
    groq`*[_type == "photo" && $slug in collections[]->slug.current] | order(_createdAt desc) { ${photoFields} }`,
    { slug: collectionSlug }
  )
}

export async function getShopPhotos(): Promise<Photo[]> {
  return sanityClient.fetch(
    groq`*[_type == "photo" && forSale == true] | order(_createdAt desc) { ${photoFields} }`
  )
}

export async function getPhotoBySlug(slug: string): Promise<Photo | null> {
  return sanityClient.fetch(
    groq`*[_type == "photo" && slug.current == $slug][0] { ${photoFields} }`,
    { slug }
  )
}

export async function getAllCollections(): Promise<Collection[]> {
  return sanityClient.fetch(
    groq`*[_type == "collection"] | order(title asc) {
      _id, title, slug, description,
      coverPhoto->{ _id, title, slug, image }
    }`
  )
}

export async function getCollectionBySlug(slug: string): Promise<Collection | null> {
  return sanityClient.fetch(
    groq`*[_type == "collection" && slug.current == $slug][0] {
      _id, title, slug, description,
      coverPhoto->{ _id, title, slug, image }
    }`,
    { slug }
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/
git commit -m "feat: add types, Sanity client, and GROQ queries"
```

---

### Task 4: Design System

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Update tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A0A0A',
        paper: '#FFFFFF',
        mist: '#F5F5F5',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        display: '0.2em',
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 2: Update app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    box-sizing: border-box;
  }

  body {
    @apply bg-paper text-ink antialiased;
  }

  img {
    @apply block;
  }
}

@layer utilities {
  .masonry {
    columns: 2;
    column-gap: 0;
  }

  .masonry-item {
    break-inside: avoid;
    display: block;
  }
}
```

- [ ] **Step 3: Update app/layout.tsx**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Archive Nº1',
  description: 'Curated photographic works, printed to archival standards.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://archiveone.studio'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.variable}>{children}</body>
    </html>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx tailwind.config.ts
git commit -m "feat: design system — palette, typography, masonry utilities"
```

---

### Task 5: Nav + Site Layout

**Files:**
- Create: `components/layout/Nav.tsx`
- Create: `app/(site)/layout.tsx`
- Create: `components/cart/CartContext.tsx` (stub — full implementation in Task 12)

- [ ] **Step 1: Create CartContext stub**

```tsx
// components/cart/CartContext.tsx
'use client'

import { createContext, useContext, useState } from 'react'
import type { CartItem } from '@/lib/types'

interface CartContextValue {
  items: CartItem[]
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  addItem: (item: CartItem) => void
  removeItem: (key: string) => void
  clearCart: () => void
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)

  return (
    <CartContext.Provider value={{
      items,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem: () => {},
      removeItem: () => {},
      clearCart: () => setItems([]),
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
```

- [ ] **Step 2: Create components/layout/Nav.tsx**

```tsx
'use client'

import Link from 'next/link'
import { useCart } from '@/components/cart/CartContext'

export default function Nav() {
  const { items, openCart } = useCart()
  const count = items.length

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 bg-paper/95 backdrop-blur-sm">
      <Link href="/" className="flex items-center gap-3">
        {/* Double-square logo */}
        <div className="relative w-9 h-9">
          <div className="absolute inset-0 border border-ink" />
          <div className="absolute inset-1 border border-ink" />
        </div>
        <span className="text-sm tracking-display font-sans uppercase">Archive Nº1</span>
      </Link>

      <nav className="hidden md:flex items-center gap-8 text-sm">
        <Link href="/archive" className="hover:opacity-50 transition-opacity">The Archive</Link>
        <Link href="/shop" className="hover:opacity-50 transition-opacity">Shop</Link>
        <Link href="/wishlist" className="hover:opacity-50 transition-opacity">Wishlist</Link>
        <Link href="/about" className="hover:opacity-50 transition-opacity">About</Link>
        <button
          onClick={openCart}
          className="hover:opacity-50 transition-opacity"
        >
          Cart{count > 0 && <span className="ml-1 font-mono">({count})</span>}
        </button>
      </nav>
    </header>
  )
}
```

- [ ] **Step 3: Create app/(site)/layout.tsx**

```tsx
import Nav from '@/components/layout/Nav'
import { CartProvider } from '@/components/cart/CartContext'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Nav />
      <main className="pt-20">{children}</main>
    </CartProvider>
  )
}
```

- [ ] **Step 4: Verify dev server starts**

```bash
npm run dev
```

Expected: `http://localhost:3000` loads without errors. Nav appears at top of page.

- [ ] **Step 5: Commit**

```bash
git add components/layout/ components/cart/CartContext.tsx app/\(site\)/
git commit -m "feat: Nav and site layout with CartProvider stub"
```

---

## Phase 2: Portfolio (Shippable Milestone)

---

### Task 6: Home Page

**Files:**
- Create: `components/archive/PhotoCard.tsx`
- Create: `components/archive/MasonryGrid.tsx`
- Create: `components/ui/Marquee.tsx`
- Create: `app/(site)/page.tsx`

- [ ] **Step 1: Create components/archive/PhotoCard.tsx**

```tsx
import Link from 'next/link'
import Image from 'next/image'
import { urlFor } from '@/lib/sanity/image'
import type { Photo } from '@/lib/types'

interface Props {
  photo: Photo
  href: string
  priority?: boolean
}

export default function PhotoCard({ photo, href, priority = false }: Props) {
  const src = urlFor(photo.image).width(800).auto('format').url()

  return (
    <Link href={href} className="group masonry-item block overflow-hidden">
      <div className="relative overflow-hidden">
        <Image
          src={src}
          alt={photo.title}
          width={800}
          height={0}
          sizes="(max-width: 768px) 100vw, 50vw"
          className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.02]"
          priority={priority}
          style={{ height: 'auto' }}
        />
        <div className="absolute inset-0 flex items-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/30 to-transparent">
          <div className="text-white">
            <p className="text-sm font-sans">{photo.title}</p>
            {photo.location && (
              <p className="text-xs font-mono opacity-75">{photo.location}</p>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Create components/archive/MasonryGrid.tsx**

```tsx
import PhotoCard from './PhotoCard'
import type { Photo } from '@/lib/types'

interface Props {
  photos: Photo[]
  linkPrefix?: string
}

export default function MasonryGrid({ photos, linkPrefix = '/archive' }: Props) {
  return (
    <div className="masonry">
      {photos.map((photo, i) => (
        <PhotoCard
          key={photo._id}
          photo={photo}
          href={`${linkPrefix}/${photo.slug.current}`}
          priority={i < 4}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create components/ui/Marquee.tsx**

```tsx
export default function Marquee({ text }: { text: string }) {
  const repeated = Array(8).fill(text).join(' · ')

  return (
    <div className="overflow-hidden border-y border-ink/10 py-3 my-12">
      <div
        className="whitespace-nowrap text-sm font-mono tracking-wider animate-[marquee_20s_linear_infinite]"
        style={{ display: 'inline-block' }}
      >
        {repeated}&nbsp;&nbsp;&nbsp;{repeated}
      </div>
    </div>
  )
}
```

Add the keyframe to `globals.css`:

```css
@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
```

- [ ] **Step 4: Create app/(site)/page.tsx**

```tsx
import { getFeaturedPhotos } from '@/lib/sanity/queries'
import MasonryGrid from '@/components/archive/MasonryGrid'
import Marquee from '@/components/ui/Marquee'

export default async function HomePage() {
  const photos = await getFeaturedPhotos()

  return (
    <>
      <MasonryGrid photos={photos} linkPrefix="/shop" />
      <Marquee text="COLLECT · PRINTS · ARCHIVE ONE" />
    </>
  )
}
```

- [ ] **Step 5: Test in browser**

Add a photo in Sanity Studio (`/studio`) with `featured: true`. Verify it appears in the masonry grid at `localhost:3000`.

- [ ] **Step 6: Commit**

```bash
git add components/archive/ components/ui/ app/\(site\)/page.tsx
git commit -m "feat: home page with masonry grid and marquee"
```

---

### Task 7: Archive Page

**Files:**
- Create: `app/(site)/archive/page.tsx`

- [ ] **Step 1: Create app/(site)/archive/page.tsx**

```tsx
import { getAllPhotos } from '@/lib/sanity/queries'
import MasonryGrid from '@/components/archive/MasonryGrid'

export const metadata = { title: 'The Archive — Archive Nº1' }

export default async function ArchivePage() {
  const photos = await getAllPhotos()

  return (
    <div>
      <div className="px-6 py-12">
        <h1 className="text-xs font-mono tracking-widest uppercase text-ink/40">
          The Archive — {photos.length} works
        </h1>
      </div>
      <MasonryGrid photos={photos} />
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Navigate to `localhost:3000/archive`. All photos appear in masonry grid.

- [ ] **Step 3: Commit**

```bash
git add app/\(site\)/archive/page.tsx
git commit -m "feat: archive page"
```

---

### Task 8: Collection Pages

**Files:**
- Create: `app/(site)/archive/[collection]/page.tsx`

- [ ] **Step 1: Create app/(site)/archive/[collection]/page.tsx**

```tsx
import { notFound } from 'next/navigation'
import { getCollectionBySlug, getPhotosByCollection, getAllCollections } from '@/lib/sanity/queries'
import MasonryGrid from '@/components/archive/MasonryGrid'

interface Props {
  params: Promise<{ collection: string }>
}

export async function generateStaticParams() {
  const collections = await getAllCollections()
  return collections.map(c => ({ collection: c.slug.current }))
}

export async function generateMetadata({ params }: Props) {
  const { collection: slug } = await params
  const col = await getCollectionBySlug(slug)
  return { title: col ? `${col.title} — Archive Nº1` : 'Archive Nº1' }
}

export default async function CollectionPage({ params }: Props) {
  const { collection: slug } = await params
  const [col, photos] = await Promise.all([
    getCollectionBySlug(slug),
    getPhotosByCollection(slug),
  ])

  if (!col) notFound()

  return (
    <div>
      <div className="px-6 py-12">
        <h1 className="text-xs font-mono tracking-widest uppercase text-ink/40">
          {col.title} — {photos.length} works
        </h1>
        {col.description && (
          <p className="mt-2 text-sm text-ink/60 max-w-md">{col.description}</p>
        )}
      </div>
      <MasonryGrid photos={photos} />
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Create a Collection and a Photo linked to it in Sanity Studio. Navigate to `localhost:3000/archive/[your-collection-slug]`.

- [ ] **Step 3: Commit**

```bash
git add app/\(site\)/archive/
git commit -m "feat: collection archive pages"
```

**Portfolio milestone reached** — deploy to Vercel now if you want the portfolio live before building the shop.

---

## Phase 3: Shop

---

### Task 9: Shop Page

**Files:**
- Create: `components/shop/ProductCard.tsx`
- Create: `components/shop/ShopGrid.tsx`
- Create: `components/shop/CollectionFilter.tsx`
- Create: `app/(site)/shop/page.tsx`

- [ ] **Step 1: Create components/shop/ProductCard.tsx**

```tsx
import Link from 'next/link'
import Image from 'next/image'
import { urlFor } from '@/lib/sanity/image'
import type { Photo } from '@/lib/types'

interface Props {
  photo: Photo
  priority?: boolean
}

export default function ProductCard({ photo, priority = false }: Props) {
  const src = urlFor(photo.image).width(600).height(600).fit('crop').auto('format').url()
  const lowestPrice = photo.variants?.reduce((min, v) => Math.min(min, v.price), Infinity) ?? 0
  const isSoldOut = photo.editionSize != null && photo.editionSold >= photo.editionSize

  return (
    <Link href={`/shop/${photo.slug.current}`} className="group block">
      <div className="relative aspect-square overflow-hidden bg-mist">
        <Image
          src={src}
          alt={photo.title}
          fill
          sizes="(max-width: 768px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          priority={priority}
        />
        {isSoldOut && (
          <div className="absolute inset-0 bg-paper/70 flex items-center justify-center">
            <span className="text-xs font-mono tracking-widest uppercase">Sold Out</span>
          </div>
        )}
      </div>
      <div className="mt-3 px-1">
        <p className="text-sm font-sans">{photo.title}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs font-mono text-ink/60">
            {photo.editionSize
              ? `Edition of ${photo.editionSize}`
              : 'Open edition'}
          </p>
          {lowestPrice > 0 && (
            <p className="text-xs font-mono">
              From £{(lowestPrice / 100).toFixed(2)}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Create components/shop/CollectionFilter.tsx**

```tsx
'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { Collection } from '@/lib/types'

interface Props {
  collections: Collection[]
}

export default function CollectionFilter({ collections }: Props) {
  const params = useSearchParams()
  const active = params.get('collection')

  return (
    <div className="flex gap-4 flex-wrap px-6 py-6">
      <Link
        href="/shop"
        className={`text-xs font-mono tracking-widest uppercase pb-0.5 ${!active ? 'border-b border-ink' : 'text-ink/40 hover:text-ink transition-colors'}`}
      >
        All
      </Link>
      {collections.map(col => (
        <Link
          key={col._id}
          href={`/shop?collection=${col.slug.current}`}
          className={`text-xs font-mono tracking-widest uppercase pb-0.5 ${active === col.slug.current ? 'border-b border-ink' : 'text-ink/40 hover:text-ink transition-colors'}`}
        >
          {col.title}
        </Link>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Create components/shop/ShopGrid.tsx**

```tsx
import ProductCard from './ProductCard'
import type { Photo } from '@/lib/types'

export default function ShopGrid({ photos }: { photos: Photo[] }) {
  if (photos.length === 0) {
    return (
      <div className="px-6 py-24 text-center">
        <p className="text-sm font-mono text-ink/40">No prints available</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-ink/5">
      {photos.map((photo, i) => (
        <div key={photo._id} className="bg-paper p-4">
          <ProductCard photo={photo} priority={i < 6} />
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create app/(site)/shop/page.tsx**

```tsx
import { getShopPhotos, getAllCollections } from '@/lib/sanity/queries'
import ShopGrid from '@/components/shop/ShopGrid'
import CollectionFilter from '@/components/shop/CollectionFilter'
import { Suspense } from 'react'

export const metadata = { title: 'Shop — Archive Nº1' }

interface Props {
  searchParams: Promise<{ collection?: string }>
}

export default async function ShopPage({ searchParams }: Props) {
  const { collection } = await searchParams
  const [allPhotos, collections] = await Promise.all([
    getShopPhotos(),
    getAllCollections(),
  ])

  const photos = collection
    ? allPhotos.filter(p => p.collections?.some(c => c.slug.current === collection))
    : allPhotos

  return (
    <div>
      <div className="px-6 pt-12 pb-2">
        <h1 className="text-xs font-mono tracking-widest uppercase text-ink/40">Shop</h1>
      </div>
      <Suspense>
        <CollectionFilter collections={collections} />
      </Suspense>
      <ShopGrid photos={photos} />
    </div>
  )
}
```

- [ ] **Step 5: Verify in browser**

Navigate to `localhost:3000/shop`. Products appear. Collection filter tabs work.

- [ ] **Step 6: Commit**

```bash
git add components/shop/ProductCard.tsx components/shop/ShopGrid.tsx components/shop/CollectionFilter.tsx app/\(site\)/shop/page.tsx
git commit -m "feat: shop page with product grid and collection filter"
```

---

### Task 10: Print Page — Selector + Frame Preview

**Files:**
- Create: `components/shop/FramePreview.tsx`
- Create: `components/shop/PrintSelector.tsx`
- Create: `app/(site)/shop/[slug]/page.tsx`

- [ ] **Step 1: Create components/shop/FramePreview.tsx**

```tsx
import Image from 'next/image'
import { urlFor } from '@/lib/sanity/image'
import type { SanityImage, PrintVariant } from '@/lib/types'

interface Props {
  image: SanityImage
  size: PrintVariant['size']
  frame: PrintVariant['frame']
}

const SIZE_WIDTH: Record<PrintVariant['size'], string> = {
  A4: 'max-w-[180px]',
  A3: 'max-w-[220px]',
  A2: 'max-w-[260px]',
  A1: 'max-w-[300px]',
}

const FRAME_STYLES: Record<PrintVariant['frame'], string> = {
  Unframed: 'shadow-lg',
  Black: 'border-[18px] border-black p-3 bg-white shadow-2xl',
  White: 'border-[18px] border-white p-3 bg-white shadow-2xl ring-1 ring-gray-200',
  Natural: 'border-[18px] bg-white shadow-2xl p-3',
}

const NATURAL_BORDER = 'border-[18px] p-3 bg-white shadow-2xl'

export default function FramePreview({ image, size, frame }: Props) {
  const src = urlFor(image).width(600).auto('format').url()

  return (
    <div className="flex items-center justify-center bg-mist p-12 min-h-[360px]">
      <div
        className={`transition-all duration-300 ${SIZE_WIDTH[size]}`}
        style={frame === 'Natural' ? { borderColor: '#C8A96E', borderWidth: 18, borderStyle: 'solid', padding: 12, background: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' } : undefined}
      >
        <div className={frame !== 'Natural' ? FRAME_STYLES[frame] : ''}>
          <div className="aspect-[210/297] relative w-full">
            <Image
              src={src}
              alt="Print preview"
              fill
              className="object-cover"
              sizes="300px"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create components/shop/PrintSelector.tsx**

```tsx
'use client'

import { useState } from 'react'
import FramePreview from './FramePreview'
import { useCart } from '@/components/cart/CartContext'
import { cartItemKey } from '@/lib/types'
import type { Photo, PrintVariant } from '@/lib/types'

const SIZES: PrintVariant['size'][] = ['A4', 'A3', 'A2', 'A1']
const FRAMES: PrintVariant['frame'][] = ['Unframed', 'Black', 'White', 'Natural']

interface Props {
  photo: Photo
}

export default function PrintSelector({ photo }: Props) {
  const [size, setSize] = useState<PrintVariant['size']>('A3')
  const [frame, setFrame] = useState<PrintVariant['frame']>('Unframed')
  const { addItem, openCart, items } = useCart()

  const variant = photo.variants?.find(v => v.size === size && v.frame === frame)
  const isSoldOut = photo.editionSize != null && photo.editionSold >= photo.editionSize
  const inCart = variant ? items.some(i => cartItemKey(i) === cartItemKey({ photoId: photo._id, size, frame })) : false

  const availableSizes = SIZES.filter(s => photo.variants?.some(v => v.size === s))
  const availableFrames = FRAMES.filter(f => photo.variants?.some(v => v.size === size && v.frame === f))

  function handleAddToCart() {
    if (!variant) return
    addItem({
      photoId: photo._id,
      photoTitle: photo.title,
      photoSlug: photo.slug.current,
      photoImage: photo.image,
      size,
      frame,
      price: variant.price,
      stripePriceId: variant.stripePriceId,
    })
    openCart()
  }

  return (
    <div className="space-y-8">
      <FramePreview image={photo.image} size={size} frame={frame} />

      {/* Size selector */}
      <div>
        <p className="text-xs font-mono tracking-widest uppercase text-ink/40 mb-3">Size</p>
        <div className="flex gap-2 flex-wrap">
          {availableSizes.map(s => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`px-4 py-2 text-sm font-mono border transition-colors ${
                size === s ? 'border-ink bg-ink text-paper' : 'border-ink/20 hover:border-ink'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Frame selector */}
      <div>
        <p className="text-xs font-mono tracking-widest uppercase text-ink/40 mb-3">Frame</p>
        <div className="flex gap-2 flex-wrap">
          {availableFrames.map(f => (
            <button
              key={f}
              onClick={() => setFrame(f)}
              className={`px-4 py-2 text-sm font-mono border transition-colors ${
                frame === f ? 'border-ink bg-ink text-paper' : 'border-ink/20 hover:border-ink'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Price + edition */}
      <div>
        {variant && (
          <p className="text-2xl font-mono">£{(variant.price / 100).toFixed(2)}</p>
        )}
        <p className="text-xs font-mono text-ink/40 mt-1">
          {photo.editionSize
            ? `Edition ${photo.editionSold + 1} of ${photo.editionSize}`
            : 'Open edition'}
        </p>
      </div>

      {/* Add to cart */}
      <button
        onClick={handleAddToCart}
        disabled={!variant || isSoldOut || inCart}
        className="w-full py-4 text-sm font-mono tracking-widest uppercase bg-ink text-paper hover:bg-ink/80 disabled:bg-ink/20 disabled:cursor-not-allowed transition-colors"
      >
        {isSoldOut ? 'Sold Out' : inCart ? 'In Cart' : 'Add to Cart'}
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Create app/(site)/shop/[slug]/page.tsx**

```tsx
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getPhotoBySlug, getAllPhotos } from '@/lib/sanity/queries'
import { urlFor } from '@/lib/sanity/image'
import PrintSelector from '@/components/shop/PrintSelector'
import WishlistButton from '@/components/wishlist/WishlistButton'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const photos = await getAllPhotos()
  return photos.filter(p => p.forSale).map(p => ({ slug: p.slug.current }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const photo = await getPhotoBySlug(slug)
  if (!photo) return {}
  return {
    title: `${photo.title} — Archive Nº1`,
    openGraph: {
      images: [urlFor(photo.image).width(1200).height(630).fit('crop').url()],
    },
  }
}

export default async function PrintPage({ params }: Props) {
  const { slug } = await params
  const photo = await getPhotoBySlug(slug)

  if (!photo || !photo.forSale) notFound()

  const mainSrc = urlFor(photo.image).width(1200).auto('format').url()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
      {/* Left: image */}
      <div className="relative bg-mist">
        <div className="sticky top-20">
          <div className="relative aspect-[4/5] w-full">
            <Image
              src={mainSrc}
              alt={photo.title}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
          <div className="absolute top-4 right-4">
            <WishlistButton photoId={photo._id} photoSlug={photo.slug.current} />
          </div>
        </div>
      </div>

      {/* Right: details */}
      <div className="px-8 py-12 lg:px-12">
        <div className="mb-8">
          <h1 className="text-2xl font-sans mb-1">{photo.title}</h1>
          {photo.location && (
            <p className="text-sm font-mono text-ink/40">{photo.location}</p>
          )}
          {photo.description && (
            <p className="mt-4 text-sm text-ink/70 leading-relaxed">{photo.description}</p>
          )}
        </div>

        <PrintSelector photo={photo} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create WishlistButton stub** (full implementation in Task 13)

```tsx
// components/wishlist/WishlistButton.tsx
'use client'

export default function WishlistButton({ photoId, photoSlug }: { photoId: string; photoSlug: string }) {
  return (
    <button className="w-9 h-9 bg-paper/80 backdrop-blur-sm flex items-center justify-center hover:bg-paper transition-colors" aria-label="Save to wishlist">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  )
}
```

- [ ] **Step 5: Verify in browser**

Navigate to a print page. Frame preview updates when size/frame changes. Add to cart button opens cart drawer.

- [ ] **Step 6: Commit**

```bash
git add components/shop/ components/wishlist/WishlistButton.tsx app/\(site\)/shop/\[slug\]/
git commit -m "feat: print page with selector and frame preview"
```

---

### Task 11: Room Mockup Gallery

**Files:**
- Modify: `app/(site)/shop/[slug]/page.tsx`

- [ ] **Step 1: Add mockup gallery to print page**

In `app/(site)/shop/[slug]/page.tsx`, add below the main image div (inside the left column, after the sticky wrapper):

```tsx
{photo.mockupImages && photo.mockupImages.length > 0 && (
  <div className="grid grid-cols-3 gap-px mt-px">
    {photo.mockupImages.map((img, i) => {
      const src = urlFor(img).width(400).height(400).fit('crop').auto('format').url()
      return (
        <div key={i} className="relative aspect-square bg-mist">
          <Image
            src={src}
            alt={`${photo.title} room mockup ${i + 1}`}
            fill
            className="object-cover"
            sizes="200px"
          />
        </div>
      )
    })}
  </div>
)}
```

- [ ] **Step 2: Verify**

Upload a mockup image to a photo in Sanity Studio. Confirm it appears below the main image on the print page.

- [ ] **Step 3: Commit**

```bash
git add app/\(site\)/shop/\[slug\]/page.tsx
git commit -m "feat: room mockup gallery on print page"
```

---

## Phase 4: Cart + Wishlist

---

### Task 12: Cart Context + CartDrawer

**Files:**
- Modify: `components/cart/CartContext.tsx` (replace stub with full implementation)
- Create: `components/cart/CartItem.tsx`
- Create: `components/layout/CartDrawer.tsx`
- Modify: `app/(site)/layout.tsx`
- Test: `__tests__/cart-reducer.test.ts`

- [ ] **Step 1: Write failing cart reducer tests**

Create `__tests__/cart-reducer.test.ts`:

```typescript
import { cartReducer } from '@/components/cart/CartContext'
import type { CartItem } from '@/lib/types'

const item: CartItem = {
  photoId: 'photo-1',
  photoTitle: 'Test Photo',
  photoSlug: 'test-photo',
  photoImage: { _type: 'image', asset: { _ref: 'ref', _type: 'reference' } },
  size: 'A3',
  frame: 'Black',
  price: 4500,
  stripePriceId: 'price_test',
}

test('adds item to empty cart', () => {
  const state = cartReducer({ items: [] }, { type: 'ADD_ITEM', item })
  expect(state.items).toHaveLength(1)
  expect(state.items[0].photoId).toBe('photo-1')
})

test('does not add duplicate item', () => {
  const state = cartReducer({ items: [item] }, { type: 'ADD_ITEM', item })
  expect(state.items).toHaveLength(1)
})

test('removes item by key', () => {
  const state = cartReducer({ items: [item] }, { type: 'REMOVE_ITEM', key: 'photo-1-A3-Black' })
  expect(state.items).toHaveLength(0)
})

test('clears all items', () => {
  const state = cartReducer({ items: [item] }, { type: 'CLEAR' })
  expect(state.items).toHaveLength(0)
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/cart-reducer.test.ts
```

Expected: FAIL — `cartReducer` not exported

- [ ] **Step 3: Replace CartContext.tsx with full implementation**

```tsx
'use client'

import { createContext, useContext, useEffect, useReducer, useState } from 'react'
import type { CartItem } from '@/lib/types'
import { cartItemKey } from '@/lib/types'

interface CartState { items: CartItem[] }

type CartAction =
  | { type: 'ADD_ITEM'; item: CartItem }
  | { type: 'REMOVE_ITEM'; key: string }
  | { type: 'CLEAR' }

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const key = cartItemKey(action.item)
      if (state.items.some(i => cartItemKey(i) === key)) return state
      return { items: [...state.items, action.item] }
    }
    case 'REMOVE_ITEM':
      return { items: state.items.filter(i => cartItemKey(i) !== action.key) }
    case 'CLEAR':
      return { items: [] }
    default:
      return state
  }
}

interface CartContextValue {
  items: CartItem[]
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  addItem: (item: CartItem) => void
  removeItem: (key: string) => void
  clearCart: () => void
  total: number
}

const CartContext = createContext<CartContextValue | null>(null)

const STORAGE_KEY = 'archiveone-cart'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] })
  const [isOpen, setIsOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const savedItems: CartItem[] = JSON.parse(stored)
        savedItems.forEach(item => dispatch({ type: 'ADD_ITEM', item }))
      }
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items))
  }, [state.items, hydrated])

  const total = state.items.reduce((sum, i) => sum + i.price, 0)

  return (
    <CartContext.Provider value={{
      items: state.items,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem: item => dispatch({ type: 'ADD_ITEM', item }),
      removeItem: key => dispatch({ type: 'REMOVE_ITEM', key }),
      clearCart: () => dispatch({ type: 'CLEAR' }),
      total,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/cart-reducer.test.ts
```

Expected: 4 passing

- [ ] **Step 5: Create components/cart/CartItem.tsx**

```tsx
import Image from 'next/image'
import { urlFor } from '@/lib/sanity/image'
import { cartItemKey } from '@/lib/types'
import { useCart } from './CartContext'
import type { CartItem as CartItemType } from '@/lib/types'

export default function CartItem({ item }: { item: CartItemType }) {
  const { removeItem } = useCart()
  const src = urlFor(item.photoImage).width(120).height(120).fit('crop').url()

  return (
    <div className="flex gap-4 py-4 border-b border-ink/10">
      <div className="relative w-16 h-16 flex-shrink-0 bg-mist">
        <Image src={src} alt={item.photoTitle} fill className="object-cover" sizes="64px" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-sans truncate">{item.photoTitle}</p>
        <p className="text-xs font-mono text-ink/50 mt-0.5">{item.size} · {item.frame}</p>
        <p className="text-xs font-mono mt-1">£{(item.price / 100).toFixed(2)}</p>
      </div>
      <button
        onClick={() => removeItem(cartItemKey(item))}
        className="text-ink/30 hover:text-ink transition-colors text-xs font-mono"
        aria-label="Remove"
      >
        ✕
      </button>
    </div>
  )
}
```

- [ ] **Step 6: Create components/layout/CartDrawer.tsx**

```tsx
'use client'

import { useEffect } from 'react'
import { useCart } from '@/components/cart/CartContext'
import CartItem from '@/components/cart/CartItem'
import { useRouter } from 'next/navigation'

export default function CartDrawer() {
  const { items, isOpen, closeCart, total } = useCart()
  const router = useRouter()

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  async function handleCheckout() {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    const { url } = await res.json()
    if (url) router.push(url)
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-ink/30 z-40 backdrop-blur-sm"
          onClick={closeCart}
        />
      )}

      {/* Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-paper z-50 flex flex-col shadow-2xl transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-ink/10">
          <h2 className="text-xs font-mono tracking-widest uppercase">Cart ({items.length})</h2>
          <button onClick={closeCart} className="text-ink/40 hover:text-ink transition-colors text-xs font-mono">✕ Close</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          {items.length === 0 ? (
            <p className="text-sm font-mono text-ink/40 text-center py-12">Your cart is empty</p>
          ) : (
            items.map(item => <CartItem key={`${item.photoId}-${item.size}-${item.frame}`} item={item} />)
          )}
        </div>

        {items.length > 0 && (
          <div className="px-6 py-6 border-t border-ink/10">
            <div className="flex justify-between mb-4">
              <span className="text-sm font-mono">Total</span>
              <span className="text-sm font-mono">£{(total / 100).toFixed(2)}</span>
            </div>
            <button
              onClick={handleCheckout}
              className="w-full py-4 bg-ink text-paper text-xs font-mono tracking-widest uppercase hover:bg-ink/80 transition-colors"
            >
              Checkout
            </button>
            <p className="text-xs font-mono text-ink/30 text-center mt-3">Secure checkout via Stripe</p>
          </div>
        )}
      </div>
    </>
  )
}
```

- [ ] **Step 7: Add CartDrawer to site layout**

Update `app/(site)/layout.tsx`:

```tsx
import Nav from '@/components/layout/Nav'
import CartDrawer from '@/components/layout/CartDrawer'
import { CartProvider } from '@/components/cart/CartContext'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Nav />
      <CartDrawer />
      <main className="pt-20">{children}</main>
    </CartProvider>
  )
}
```

- [ ] **Step 8: Verify in browser**

Add a print to cart. Cart drawer slides in from right. Remove item. Verify count in nav updates.

- [ ] **Step 9: Commit**

```bash
git add components/cart/ components/layout/CartDrawer.tsx app/\(site\)/layout.tsx __tests__/cart-reducer.test.ts
git commit -m "feat: cart context with localStorage, cart drawer, tests"
```

---

### Task 13: Wishlist

**Files:**
- Create: `components/wishlist/WishlistContext.tsx`
- Modify: `components/wishlist/WishlistButton.tsx` (replace stub)
- Create: `app/(site)/wishlist/page.tsx`
- Modify: `app/(site)/layout.tsx`

- [ ] **Step 1: Create components/wishlist/WishlistContext.tsx**

```tsx
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface WishlistContextValue {
  ids: string[]
  toggle: (photoId: string) => void
  has: (photoId: string) => boolean
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

const STORAGE_KEY = 'archiveone-wishlist'

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setIds(JSON.parse(stored))
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  }, [ids])

  function toggle(photoId: string) {
    setIds(prev =>
      prev.includes(photoId) ? prev.filter(id => id !== photoId) : [...prev, photoId]
    )
  }

  return (
    <WishlistContext.Provider value={{ ids, toggle, has: id => ids.includes(id) }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider')
  return ctx
}
```

- [ ] **Step 2: Replace WishlistButton stub**

```tsx
'use client'

import { useWishlist } from './WishlistContext'

interface Props {
  photoId: string
  photoSlug: string
}

export default function WishlistButton({ photoId }: Props) {
  const { toggle, has } = useWishlist()
  const saved = has(photoId)

  return (
    <button
      onClick={e => { e.preventDefault(); toggle(photoId) }}
      className="w-9 h-9 bg-paper/80 backdrop-blur-sm flex items-center justify-center hover:bg-paper transition-colors"
      aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  )
}
```

- [ ] **Step 3: Create app/(site)/wishlist/page.tsx**

```tsx
'use client'

import { useWishlist } from '@/components/wishlist/WishlistContext'
import { useEffect, useState } from 'react'
import { sanityClient } from '@/lib/sanity/client'
import { groq } from 'next-sanity'
import ProductCard from '@/components/shop/ProductCard'
import type { Photo } from '@/lib/types'

export default function WishlistPage() {
  const { ids } = useWishlist()
  const [photos, setPhotos] = useState<Photo[]>([])

  useEffect(() => {
    if (ids.length === 0) { setPhotos([]); return }
    sanityClient
      .fetch(groq`*[_type == "photo" && _id in $ids] { _id, title, slug, image, location, forSale, editionSize, editionSold, variants, "collections": collections[]->{ _id, title, slug } }`, { ids })
      .then(setPhotos)
  }, [ids])

  return (
    <div className="px-6 py-12">
      <h1 className="text-xs font-mono tracking-widest uppercase text-ink/40 mb-8">
        Wishlist — {ids.length} saved
      </h1>
      {photos.length === 0 ? (
        <p className="text-sm font-mono text-ink/40">Nothing saved yet. Heart a photo to save it.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          {photos.map(p => <ProductCard key={p._id} photo={p} />)}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Add WishlistProvider to site layout**

Update `app/(site)/layout.tsx`:

```tsx
import Nav from '@/components/layout/Nav'
import CartDrawer from '@/components/layout/CartDrawer'
import { CartProvider } from '@/components/cart/CartContext'
import { WishlistProvider } from '@/components/wishlist/WishlistContext'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <WishlistProvider>
        <Nav />
        <CartDrawer />
        <main className="pt-20">{children}</main>
      </WishlistProvider>
    </CartProvider>
  )
}
```

- [ ] **Step 5: Verify in browser**

Heart a photo on the shop page. Navigate to `/wishlist`. Photo appears. Heart again to remove.

- [ ] **Step 6: Commit**

```bash
git add components/wishlist/ app/\(site\)/wishlist/ app/\(site\)/layout.tsx
git commit -m "feat: wishlist with localStorage persistence"
```

---

## Phase 5: Commerce

---

### Task 14: Order Routing Logic (TDD)

**Files:**
- Create: `lib/order-routing.ts`
- Create: `__tests__/order-routing.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/order-routing.test.ts`:

```typescript
import { getProviderForCountry, PROVIDERS } from '@/lib/order-routing'

test('routes US to US provider', () => {
  expect(getProviderForCountry('US').region).toBe('US')
})

test('routes CA to US provider', () => {
  expect(getProviderForCountry('CA').region).toBe('US')
})

test('routes GB to UK provider', () => {
  expect(getProviderForCountry('GB').region).toBe('UK')
})

test('routes FR to UK provider', () => {
  expect(getProviderForCountry('FR').region).toBe('UK')
})

test('routes AU to AU provider', () => {
  expect(getProviderForCountry('AU').region).toBe('AU')
})

test('routes NZ to AU provider', () => {
  expect(getProviderForCountry('NZ').region).toBe('AU')
})

test('routes unknown country to UK provider', () => {
  expect(getProviderForCountry('JP').region).toBe('UK')
})

test('all providers have name and url fields', () => {
  Object.values(PROVIDERS).forEach(p => {
    expect(p.name).toBeTruthy()
    expect(p.region).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/order-routing.test.ts
```

Expected: FAIL — module not found

- [ ] **Step 3: Implement lib/order-routing.ts**

```typescript
export interface Provider {
  region: 'US' | 'UK' | 'AU'
  name: string
  url: string
}

export const PROVIDERS: Record<'US' | 'UK' | 'AU', Provider> = {
  US: { region: 'US', name: 'Printful US', url: 'https://printful.com' },
  UK: { region: 'UK', name: 'Prodigi UK', url: 'https://prodigi.com' },
  AU: { region: 'AU', name: 'Your AU Provider', url: '' },
}

const REGION_MAP: Record<string, 'US' | 'UK' | 'AU'> = {
  US: 'US', CA: 'US', MX: 'US',
  GB: 'UK', IE: 'UK', FR: 'UK', DE: 'UK', NL: 'UK',
  ES: 'UK', IT: 'UK', PT: 'UK', BE: 'UK', AT: 'UK',
  CH: 'UK', SE: 'UK', NO: 'UK', DK: 'UK', FI: 'UK', PL: 'UK',
  AU: 'AU', NZ: 'AU',
}

export function getProviderForCountry(countryCode: string): Provider {
  const region = REGION_MAP[countryCode] ?? 'UK'
  return PROVIDERS[region]
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/order-routing.test.ts
```

Expected: 8 passing

- [ ] **Step 5: Commit**

```bash
git add lib/order-routing.ts __tests__/order-routing.test.ts
git commit -m "feat: order routing logic with tests"
```

---

### Task 15: Stripe Checkout API Route

**Files:**
- Create: `lib/stripe.ts`
- Create: `app/api/checkout/route.ts`

- [ ] **Step 1: Create lib/stripe.ts**

```typescript
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-04-30.basil',
})
```

- [ ] **Step 2: Create app/api/checkout/route.ts**

```typescript
import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { sanityClient } from '@/lib/sanity/client'
import { groq } from 'next-sanity'
import type { CartItem } from '@/lib/types'

export async function POST(req: Request) {
  const { items }: { items: CartItem[] } = await req.json()

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'No items' }, { status: 400 })
  }

  // Check edition availability server-side
  for (const item of items) {
    const photo = await sanityClient.fetch(
      groq`*[_type == "photo" && _id == $id][0]{ editionSize, editionSold }`,
      { id: item.photoId }
    )
    if (photo?.editionSize != null && photo.editionSold >= photo.editionSize) {
      return NextResponse.json(
        { error: `${item.photoTitle} is sold out` },
        { status: 409 }
      )
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: items.map(item => ({
      price: item.stripePriceId,
      quantity: 1,
    })),
    shipping_address_collection: {
      allowed_countries: [
        'AU', 'AT', 'BE', 'CA', 'DK', 'FI', 'FR', 'DE', 'IE',
        'IT', 'JP', 'MX', 'NL', 'NZ', 'NO', 'PL', 'PT', 'ES',
        'SE', 'CH', 'GB', 'US',
      ],
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/shop`,
    metadata: {
      items: JSON.stringify(items.map(i => ({ photoId: i.photoId, stripePriceId: i.stripePriceId }))),
    },
  })

  return NextResponse.json({ url: session.url })
}
```

- [ ] **Step 3: Test manually**

Add items to cart and click Checkout. You should be redirected to Stripe's hosted checkout page. Use test card `4242 4242 4242 4242`, any future expiry, any CVC.

- [ ] **Step 4: Commit**

```bash
git add lib/stripe.ts app/api/checkout/
git commit -m "feat: Stripe checkout session API route"
```

---

### Task 16: Stripe Webhook + Edition Increment + Order Email

**Files:**
- Create: `app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Install Stripe CLI for local webhook testing**

Download from [stripe.com/docs/stripe-cli](https://stripe.com/docs/stripe-cli). Then run:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret it outputs into `.env.local` as `STRIPE_WEBHOOK_SECRET`.

- [ ] **Step 2: Create app/api/webhooks/stripe/route.ts**

```typescript
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { sanityWriteClient, sanityClient } from '@/lib/sanity/client'
import { getProviderForCountry } from '@/lib/order-routing'
import { Resend } from 'resend'
import { groq } from 'next-sanity'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const body = await req.text()
  const sig = (await headers()).get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  if (event.type !== 'checkout.session.completed') {
    return new Response(null, { status: 200 })
  }

  const session = event.data.object as Stripe.Checkout.Session

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 50,
    expand: ['data.price'],
  })

  const country = session.shipping_details?.address?.country ?? 'GB'
  const provider = getProviderForCountry(country)

  // Increment editionSold for each item
  for (const item of lineItems.data) {
    const priceId = item.price?.id
    if (!priceId) continue

    const photo = await sanityClient.fetch(
      groq`*[_type == "photo" && $priceId in variants[].stripePriceId][0]{ _id, editionSize, editionSold }`,
      { priceId }
    )

    if (photo?._id && photo.editionSize != null) {
      await sanityWriteClient.patch(photo._id).inc({ editionSold: 1 }).commit()
    }
  }

  // Build order email
  const customerName = session.customer_details?.name ?? 'Customer'
  const address = session.shipping_details?.address
  const city = address?.city ?? ''
  const addressLine = [address?.line1, address?.line2, address?.city, address?.postal_code, address?.country]
    .filter(Boolean).join(', ')
  const total = `£${((session.amount_total ?? 0) / 100).toFixed(2)}`

  const itemLines = lineItems.data.map(item => {
    const meta = item.description ?? item.price?.id ?? 'Unknown item'
    return `  → ${meta}`
  }).join('\n')

  const emailHtml = `
    <h2>New Order — ${customerName} · ${city}, ${country}</h2>
    <p><strong>Recommended provider:</strong> ${provider.name}</p>
    <p><a href="${provider.url}">${provider.url}</a></p>
    <h3>Items to fulfil:</h3>
    <pre>${itemLines}</pre>
    <p><strong>Customer:</strong> ${customerName}</p>
    <p><strong>Ship to:</strong> ${addressLine}</p>
    <p><strong>Total charged:</strong> ${total}</p>
  `

  await resend.emails.send({
    from: 'orders@archiveone.studio',
    to: process.env.OWNER_EMAIL!,
    subject: `New Order — ${customerName} · ${city}, ${country}`,
    html: emailHtml,
  })

  return new Response(null, { status: 200 })
}
```

- [ ] **Step 3: Test with Stripe CLI**

With `stripe listen` running, complete a test checkout. Verify:
1. Terminal shows `checkout.session.completed` received
2. Order email arrives in your inbox
3. If the photo had `editionSize` set, `editionSold` increments in Sanity

- [ ] **Step 4: Commit**

```bash
git add app/api/webhooks/
git commit -m "feat: Stripe webhook — edition tracking and order routing email"
```

---

### Task 17: Order Success Page

**Files:**
- Create: `app/(site)/order/success/page.tsx`
- Modify: `components/cart/CartContext.tsx`

- [ ] **Step 1: Create app/(site)/order/success/page.tsx**

```tsx
'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/components/cart/CartContext'

export default function OrderSuccessPage() {
  const params = useSearchParams()
  const sessionId = params.get('session_id')
  const { clearCart } = useCart()

  useEffect(() => {
    clearCart()
  }, [clearCart])

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="relative w-16 h-16 mx-auto mb-8">
          <div className="absolute inset-0 border border-ink" />
          <div className="absolute inset-2 border border-ink" />
        </div>
        <h1 className="text-2xl font-sans mb-4">Thank you</h1>
        <p className="text-sm font-mono text-ink/60 leading-relaxed mb-2">
          Your order has been received. You'll get a confirmation email shortly.
        </p>
        <p className="text-sm font-mono text-ink/40 mb-8">
          Each print is fulfilled individually — expect a shipping notification within 3–5 business days.
        </p>
        {sessionId && (
          <p className="text-xs font-mono text-ink/20 mb-8">Order ref: {sessionId.slice(-8).toUpperCase()}</p>
        )}
        <Link
          href="/shop"
          className="inline-block text-xs font-mono tracking-widest uppercase border border-ink px-8 py-3 hover:bg-ink hover:text-paper transition-colors"
        >
          Continue Browsing
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Wrap in Suspense in a server wrapper**

Wrap the client component to avoid Next.js build error with `useSearchParams`:

```tsx
// app/(site)/order/success/page.tsx
import { Suspense } from 'react'
import OrderSuccessClient from './client'

export default function OrderSuccessPage() {
  return (
    <Suspense>
      <OrderSuccessClient />
    </Suspense>
  )
}
```

Move the client component to `app/(site)/order/success/client.tsx` with the `'use client'` directive.

- [ ] **Step 3: Verify**

Complete a test checkout. You should be redirected to `/order/success`, cart clears, confirmation message shows.

- [ ] **Step 4: Commit**

```bash
git add app/\(site\)/order/
git commit -m "feat: order success page"
```

---

## Phase 6: Launch

---

### Task 18: Open Graph Metadata

**Files:**
- Modify: `app/(site)/shop/[slug]/page.tsx` (already done in Task 10)
- Modify: `app/(site)/archive/[collection]/page.tsx` (already done in Task 8)
- Create: `public/og-default.jpg`

- [ ] **Step 1: Create a default OG image**

Create a 1200×630px branded image (Archive Nº1 logo on white background) and save to `public/og-default.jpg`. You can make this in Canva.

- [ ] **Step 2: Add default OG to root layout**

Update `app/layout.tsx` metadata:

```typescript
export const metadata: Metadata = {
  title: 'Archive Nº1',
  description: 'Curated photographic works, printed to archival standards.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://archiveone.studio'),
  openGraph: {
    title: 'Archive Nº1',
    description: 'Curated photographic works, printed to archival standards.',
    images: ['/og-default.jpg'],
    siteName: 'Archive Nº1',
  },
  twitter: {
    card: 'summary_large_image',
  },
}
```

- [ ] **Step 3: Verify OG tags in browser**

Navigate to a print page. View page source and confirm `<meta property="og:image"` points to the photo URL.

- [ ] **Step 4: Commit**

```bash
git add public/og-default.jpg app/layout.tsx
git commit -m "feat: Open Graph metadata for social sharing"
```

---

### Task 19: About Page

**Files:**
- Create: `app/(site)/about/page.tsx`

- [ ] **Step 1: Create app/(site)/about/page.tsx**

```tsx
export const metadata = { title: 'About — Archive Nº1' }

export default function AboutPage() {
  return (
    <div className="max-w-xl mx-auto px-6 py-24">
      <h1 className="text-xs font-mono tracking-widest uppercase text-ink/40 mb-12">About</h1>

      <div className="space-y-6 text-sm leading-relaxed text-ink/80">
        <p>
          Archive Nº1 is a curated collection of photographic works available as fine-art prints.
          Each image is selected for its ability to hold attention — the kind of photograph that
          rewards a second look.
        </p>
        <p>
          Prints are produced to archival standards using pigment inks on museum-quality paper,
          fulfilled through specialist print studios in the UK, US, and Australia.
        </p>
      </div>

      <div className="mt-16 pt-8 border-t border-ink/10">
        <h2 className="text-xs font-mono tracking-widest uppercase text-ink/40 mb-4">Print quality</h2>
        <ul className="space-y-2 text-sm font-mono text-ink/60">
          <li>Giclée pigment ink printing</li>
          <li>300gsm archival fine-art paper</li>
          <li>Fade-resistant for 100+ years</li>
          <li>Hand-inspected before dispatch</li>
        </ul>
      </div>

      <div className="mt-12 pt-8 border-t border-ink/10">
        <h2 className="text-xs font-mono tracking-widest uppercase text-ink/40 mb-4">Contact</h2>
        <a
          href="mailto:info@archiveone.studio"
          className="text-sm font-mono hover:opacity-50 transition-opacity"
        >
          info@archiveone.studio
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(site\)/about/
git commit -m "feat: about page"
```

---

### Task 20: Sanity Studio Route

**Files:**
- Create: `app/studio/[[...tool]]/page.tsx`

- [ ] **Step 1: Create app/studio/[[...tool]]/page.tsx**

```tsx
import { NextStudio } from 'next-sanity/studio'
import config from '@/sanity/sanity.config'

export { metadata, viewport } from 'next-sanity/studio'

export default function StudioPage() {
  return <NextStudio config={config} />
}
```

- [ ] **Step 2: Add CORS origin in Sanity**

Go to [sanity.io/manage](https://sanity.io/manage) → your project → API → CORS Origins → Add `http://localhost:3000` and `https://archiveone.studio`.

- [ ] **Step 3: Verify**

Navigate to `localhost:3000/studio`. Sanity Studio loads. You can create Photos and Collections.

- [ ] **Step 4: Commit**

```bash
git add app/studio/
git commit -m "feat: embedded Sanity Studio at /studio"
```

---

### Task 21: Vercel Deployment + DNS

- [ ] **Step 1: Push to GitHub**

Create a new repo at github.com (name: `archiveone`), then:

```bash
git remote add origin https://github.com/YOUR_USERNAME/archiveone.git
git push -u origin main
```

- [ ] **Step 2: Deploy to Vercel**

Go to [vercel.com/new](https://vercel.com/new) → Import Git Repository → select `archiveone`.

Framework preset: Next.js. Click Deploy.

- [ ] **Step 3: Add environment variables to Vercel**

In Vercel project → Settings → Environment Variables, add every key from `.env.local`:

```
NEXT_PUBLIC_SANITY_PROJECT_ID
NEXT_PUBLIC_SANITY_DATASET
SANITY_API_TOKEN
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY
NEXT_PUBLIC_SITE_URL       → https://archiveone.studio
OWNER_EMAIL
```

- [ ] **Step 4: Add Stripe webhook for production**

Go to [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks) → Add endpoint:

- URL: `https://archiveone.studio/api/webhooks/stripe`
- Events: `checkout.session.completed`

Copy the new webhook signing secret and update `STRIPE_WEBHOOK_SECRET` in Vercel.

- [ ] **Step 5: Point DNS to Vercel**

In Squarespace Domain Settings → DNS:

Option A (recommended — nameservers):
Change nameservers to Vercel's:
```
ns1.vercel-dns.com
ns2.vercel-dns.com
```

Option B (keep Squarespace DNS, use CNAME):
Add CNAME: `@` → `cname.vercel-dns.com`

Then in Vercel project → Settings → Domains → Add `archiveone.studio`.

- [ ] **Step 6: Redeploy and verify**

Trigger a new deploy in Vercel. Once DNS propagates (up to 48h, usually minutes), visit `https://archiveone.studio`. Site loads with SSL.

- [ ] **Step 7: Final commit**

```bash
git add .
git commit -m "chore: final pre-launch tidy"
git push
```

---

## All Tests

Run the full test suite at any time:

```bash
npx jest
```

Expected:
```
PASS __tests__/cart-reducer.test.ts (4 tests)
PASS __tests__/order-routing.test.ts (8 tests)
```
