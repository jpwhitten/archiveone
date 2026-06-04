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

  // Check edition availability server-side before creating session
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
