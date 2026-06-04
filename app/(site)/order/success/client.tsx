'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useCart } from '@/components/cart/CartContext'

export default function OrderSuccessClient() {
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
          Your order has been received. You&apos;ll get a confirmation email shortly.
        </p>
        <p className="text-sm font-mono text-ink/40 mb-8">
          Each print is fulfilled individually — expect a shipping notification within 3–5 business days.
        </p>
        {sessionId && (
          <p className="text-xs font-mono text-ink/20 mb-8">
            Order ref: {sessionId.slice(-8).toUpperCase()}
          </p>
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
