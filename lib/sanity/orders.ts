import { groq } from 'next-sanity'
import { sanityClient, sanityWriteClient } from './client'

export interface OrderItem {
  photoTitle: string
  size: string
  frame: string
  qty: number
}

export interface OrderRecord {
  sessionId: string
  region: string
  customerName: string
  customerEmail: string
  shippingAddress: string
  items: OrderItem[]
  total: number
  fulfilment: 'artelo' | 'manual'
  arteloOrderId?: string
  status: 'submitted' | 'manual' | 'failed'
}

export async function findOrderBySession(sessionId: string): Promise<{ _id: string; arteloOrderId?: string } | null> {
  return sanityClient.fetch(
    groq`*[_type == "order" && sessionId == $sessionId][0]{ _id, arteloOrderId }`,
    { sessionId }
  )
}

export async function upsertOrder(record: OrderRecord): Promise<void> {
  const _id = `order.${record.sessionId}`
  await sanityWriteClient.createOrReplace({
    _id,
    _type: 'order',
    createdAt: new Date().toISOString(),
    ...record,
  })
}
