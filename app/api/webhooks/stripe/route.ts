import { headers } from 'next/headers'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { sanityWriteClient, sanityClient } from '@/lib/sanity/client'
import { getProviderForCountry } from '@/lib/order-routing'
import { Resend } from 'resend'
import { groq } from 'next-sanity'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const stripe = getStripe()
  const body = await req.text()
  const sig = (await headers()).get('stripe-signature')

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret || !sig) {
    return new Response('Webhook not configured', { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
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
      await sanityWriteClient.patch(photo._id).inc({ editionSold: item.quantity ?? 1 }).commit()
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
    const qty = item.quantity ?? 1
    return `  → ${description}${qty > 1 ? ` × ${qty}` : ''}`
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

  // Email is best-effort: the order has already been processed, so a Resend
  // failure must not fail the webhook (which would make Stripe retry forever).
  try {
    if (process.env.RESEND_API_KEY && process.env.OWNER_EMAIL) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        // Defaults to Resend's no-setup sender (works when emailing yourself).
        // Set ORDER_EMAIL_FROM to a verified domain address once verified.
        from: process.env.ORDER_EMAIL_FROM || 'Archive One <onboarding@resend.dev>',
        to: process.env.OWNER_EMAIL,
        subject: `New Order — ${customerName} · ${city}, ${country}`,
        html: emailHtml,
      })
    }
  } catch (err) {
    console.error('Order email failed to send:', err)
  }

  return new Response(null, { status: 200 })
}
