import { Suspense } from 'react'
import OrderSuccessClient from './client'

export const metadata = { title: 'Order Confirmed — Archive Nº1' }

export default function OrderSuccessPage() {
  return (
    <Suspense>
      <OrderSuccessClient />
    </Suspense>
  )
}
