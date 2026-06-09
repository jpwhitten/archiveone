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
