import { headers } from 'next/headers'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { sanityWriteClient, sanityClient } from '@/lib/sanity/client'
import { urlFor } from '@/lib/sanity/image'
import { Resend } from 'resend'
import { groq } from 'next-sanity'
import { dispatch } from '@/lib/fulfillment/dispatcher'
import { notifyOwnerArteloSubmitted } from '@/lib/fulfillment/email'
import { getPrintFileUrlByPriceId } from '@/lib/sanity/queries'
import { findOrderBySession, upsertOrder } from '@/lib/sanity/orders'
import type { FulfilmentOrder, FulfilmentLine } from '@/lib/fulfillment/types'

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

  const existing = await findOrderBySession(session.id)
  if (existing?.arteloOrderId) {
    return new Response(null, { status: 200 }) // already fulfilled via Artelo
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 50,
    expand: ['data.price'],
  })

  const shippingDetails = session.collected_information?.shipping_details
  const country = shippingDetails?.address?.country ?? 'GB'

  // For each line item: look up the photo + the exact variant (size/frame),
  // increment limited-edition counts, and collect fulfilment details.
  const fulfilItems: { photoId: string; photoTitle: string; size: string; frame: string; qty: number; imageUrl: string; printFileUrl?: string }[] = []
  for (const item of lineItems.data) {
    const priceId = item.price?.id
    const qty = item.quantity ?? 1
    if (!priceId) continue

    const photo = await sanityClient.fetch(
      groq`*[_type == "photo" && $priceId in variants[].stripePriceId][0]{
        _id, title, image, editionSize, editionSold,
        "variant": variants[stripePriceId == $priceId][0]{ size, frame }
      }`,
      { priceId }
    )

    if (photo?._id && photo.editionSize != null) {
      await sanityWriteClient.patch(photo._id).inc({ editionSold: qty }).commit()
    }

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
  ].filter((v): v is string => Boolean(v))
  const total = `£${((session.amount_total ?? 0) / 100).toFixed(2)}`
  const orderRef = (session.id ?? '').slice(-8).toUpperCase()

  const label = `font:11px ui-monospace,Menlo,monospace;letter-spacing:1.5px;text-transform:uppercase;color:#9a9a9a`
  const itemRows = fulfilItems.map(i => `
    <tr>
      <td width="60" style="padding:14px 0;border-bottom:1px solid #eee;vertical-align:middle">
        ${i.imageUrl ? `<img src="${i.imageUrl}" width="48" height="48" alt="" style="display:block;width:48px;height:48px;object-fit:cover;border-radius:2px;background:#f5f5f5">` : ''}
      </td>
      <td style="padding:14px 0 14px 14px;border-bottom:1px solid #eee;font:15px -apple-system,Segoe UI,sans-serif;color:#0a0a0a;vertical-align:middle">
        ${i.photoTitle}
        <div style="font:13px ui-monospace,Menlo,monospace;color:#666;margin-top:3px">${[i.size, i.frame].filter(Boolean).join(' · ')}</div>
      </td>
      <td style="padding:14px 0;border-bottom:1px solid #eee;text-align:right;font:14px ui-monospace,Menlo,monospace;color:#0a0a0a;white-space:nowrap;vertical-align:middle">
        ${i.qty > 1 ? `×&nbsp;${i.qty}` : '×&nbsp;1'}
      </td>
    </tr>`).join('')

  // Customer-facing confirmation email.
  const firstName = customerName.split(' ')[0] || 'there'
  const customerHtml = `
<div style="background:#f5f5f5;padding:32px 16px;font:15px -apple-system,Segoe UI,sans-serif;color:#0a0a0a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #eaeaea">
    <tr><td style="padding:36px 32px 8px;text-align:center">
      <div style="font:13px ui-monospace,Menlo,monospace;letter-spacing:3px;text-transform:uppercase">Archive Nº1</div>
      <div style="font:24px -apple-system,Segoe UI,sans-serif;margin-top:22px">Thank you, ${firstName}</div>
      <div style="${label};margin-top:8px">Order ${orderRef} · ${total}</div>
    </td></tr>

    <tr><td style="padding:18px 32px 8px">
      <div style="font:15px -apple-system,Segoe UI,sans-serif;line-height:1.65;color:#444;text-align:center">
        Your order has been received. Each print is made to order on archival fine-art paper and dispatched individually — expect a shipping notification within 3–5 business days.
      </div>
    </td></tr>

    <tr><td style="padding:28px 32px 8px">
      <div style="${label}">Your order</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px">${itemRows}</table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="padding:16px 0 0;font:13px ui-monospace,Menlo,monospace;color:#666">Total</td>
        <td style="padding:16px 0 0;text-align:right;font:14px ui-monospace,Menlo,monospace">${total}</td>
      </tr></table>
    </td></tr>

    <tr><td style="padding:24px 32px 36px">
      <div style="${label}">Shipping to</div>
      <div style="font:15px -apple-system,Segoe UI,sans-serif;line-height:1.5;margin-top:8px">
        <strong>${customerName}</strong><br>${addressLines.join('<br>')}
      </div>
    </td></tr>
  </table>
  <div style="max-width:600px;margin:14px auto 0;${label};text-align:center">Questions? Reply to this email · archiveone.studio</div>
</div>`

  // Customer confirmation email is best-effort: the order is already processed, so a Resend failure
  // must not fail the webhook (which would make Stripe retry forever).
  try {
    // Customer confirmation — only once a verified domain sender is set,
    // since onboarding@resend.dev can't email external recipients.
    if (process.env.RESEND_API_KEY && process.env.ORDER_EMAIL_FROM && customerEmail) {
      const resend = new Resend(process.env.RESEND_API_KEY)
      await resend.emails.send({
        from: process.env.ORDER_EMAIL_FROM,
        to: customerEmail,
        subject: `Your Archive Nº1 order — ${orderRef}`,
        html: customerHtml,
      })
    }
  } catch (err) {
    console.error('Order email failed to send:', err)
  }

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

  // On Artelo success, send the owner a short "submitted" notice.
  if (viaArtelo) {
    await notifyOwnerArteloSubmitted(fulfilmentOrder, arteloOrderId)
  }

  return new Response(null, { status: 200 })
}
