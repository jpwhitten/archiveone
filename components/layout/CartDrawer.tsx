'use client'

import { useEffect } from 'react'
import { useCart } from '@/components/cart/CartContext'
import CartItem from '@/components/cart/CartItem'
import { useRouter } from 'next/navigation'
import { isSoldOut } from '@/lib/sold-out'

export default function CartDrawer() {
  const { items, isOpen, closeCart, total } = useCart()
  const router = useRouter()
  const soldOut = isSoldOut()

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  async function handleCheckout() {
    if (soldOut) return
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
      {isOpen && (
        <div
          className="fixed inset-0 bg-ink/30 z-40 backdrop-blur-sm"
          onClick={closeCart}
        />
      )}

      <div className={`fixed top-0 right-0 h-full w-full max-w-sm bg-paper z-50 flex flex-col shadow-2xl transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-ink/10">
          <h2 className="text-xs font-mono tracking-widest uppercase">Cart ({items.length})</h2>
          <button onClick={closeCart} className="text-ink/40 hover:text-ink transition-colors text-xs font-mono">✕ Close</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          {items.length === 0 ? (
            <p className="text-sm font-mono text-ink/40 text-center py-12">Your cart is empty</p>
          ) : (
            items.map(item => (
              <CartItem key={`${item.photoId}-${item.size}-${item.frame}`} item={item} />
            ))
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
              disabled={soldOut}
              className="w-full py-4 bg-ink text-paper text-xs font-mono tracking-widest uppercase hover:bg-ink/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-ink"
            >
              {soldOut ? 'Sold out' : 'Checkout'}
            </button>
            <p className="text-xs font-mono text-ink/30 text-center mt-3">
              {soldOut ? 'Sold out — checkout is disabled.' : 'Secure checkout via Stripe'}
            </p>
          </div>
        )}
      </div>
    </>
  )
}
