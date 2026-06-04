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

  const shippingDetails = session.collected_information?.shipping_details
  const country = shippingDetails?.address?.country ?? 'GB'
  const provider = getProviderForCountry(country)

  // Increment editionSold for limited edition prints
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

  // Build and send order email
  const customerName = session.customer_details?.name ?? 'Customer'
  const address = shippingDetails?.address
  const city = address?.city ?? ''
  const addressLine = [address?.line1, address?.line2, address?.city, address?.postal_code, address?.country]
    .filter(Boolean).join(', ')
  const total = `£${((session.amount_total ?? 0) / 100).toFixed(2)}`

  const itemLines = lineItems.data.map(item => {
    const description = item.description ?? item.price?.id ?? 'Unknown item'
    return `  → ${description}`
  }).join('\n')

  const emailHtml = `
    <h2>New Order — ${customerName} · ${city}, ${country}</h2>
    <p><strong>Recommended provider:</strong> ${provider.name}</p>
    ${provider.url ? `<p><a href="${provider.url}">${provider.url}</a></p>` : ''}
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
