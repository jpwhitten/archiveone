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

  // For each line item: look up the photo + the exact variant (size/frame),
  // increment limited-edition counts, and collect fulfilment details.
  const fulfilItems: { title: string; size: string; frame: string; qty: number }[] = []
  for (const item of lineItems.data) {
    const priceId = item.price?.id
    const qty = item.quantity ?? 1
    if (!priceId) continue

    const photo = await sanityClient.fetch(
      groq`*[_type == "photo" && $priceId in variants[].stripePriceId][0]{
        _id, title, editionSize, editionSold,
        "variant": variants[stripePriceId == $priceId][0]{ size, frame }
      }`,
      { priceId }
    )

    if (photo?._id && photo.editionSize != null) {
      await sanityWriteClient.patch(photo._id).inc({ editionSold: qty }).commit()
    }

    fulfilItems.push({
      title: photo?.title ?? item.description ?? 'Unknown print',
      size: photo?.variant?.size ?? '',
      frame: photo?.variant?.frame ?? '',
      qty,
    })
  }

  // Build and send order email
  const customerName = session.customer_details?.name ?? 'Customer'
  const customerEmail = session.customer_details?.email ?? ''
  const address = shippingDetails?.address
  const city = address?.city ?? ''
  const addressLines = [
    address?.line1,
    address?.line2,
    [address?.city, address?.postal_code].filter(Boolean).join(' '),
    address?.country,
  ].filter(Boolean)
  const total = `£${((session.amount_total ?? 0) / 100).toFixed(2)}`
  const orderRef = (session.id ?? '').slice(-8).toUpperCase()

  const label = `font:11px ui-monospace,Menlo,monospace;letter-spacing:1.5px;text-transform:uppercase;color:#9a9a9a`
  const itemRows = fulfilItems.map(i => `
    <tr>
      <td style="padding:14px 0;border-bottom:1px solid #eee;font:15px -apple-system,Segoe UI,sans-serif;color:#0a0a0a">
        ${i.title}
        <div style="font:13px ui-monospace,Menlo,monospace;color:#666;margin-top:3px">${[i.size, i.frame].filter(Boolean).join(' · ')}</div>
      </td>
      <td style="padding:14px 0;border-bottom:1px solid #eee;text-align:right;font:14px ui-monospace,Menlo,monospace;color:#0a0a0a;white-space:nowrap">
        ${i.qty > 1 ? `×&nbsp;${i.qty}` : '×&nbsp;1'}
      </td>
    </tr>`).join('')

  const emailHtml = `
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
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px">${itemRows}</table>
    </td></tr>

    <tr><td style="padding:24px 32px 32px">
      <div style="${label}">Ship to</div>
      <div style="font:15px -apple-system,Segoe UI,sans-serif;line-height:1.5;margin-top:8px">
        <strong>${customerName}</strong><br>
        ${addressLines.join('<br>')}
      </div>
      ${customerEmail ? `<div style="font:13px ui-monospace,Menlo,monospace;color:#666;margin-top:10px">${customerEmail}</div>` : ''}
    </td></tr>
  </table>
  <div style="max-width:600px;margin:14px auto 0;${label};text-align:center">Archive Nº1 · archiveone.studio</div>
</div>`

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
