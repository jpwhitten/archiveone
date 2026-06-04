'use client'

import Image from 'next/image'
import { urlFor } from '@/lib/sanity/image'
import { cartItemKey } from '@/lib/types'
import { useCart } from './CartContext'
import type { CartItem as CartItemType } from '@/lib/types'

export default function CartItem({ item }: { item: CartItemType }) {
  const { setQuantity, removeItem } = useCart()
  const src = urlFor(item.photoImage).width(120).height(120).fit('crop').url()
  const key = cartItemKey(item)
  const lineTotal = item.price * item.quantity

  return (
    <div className="flex gap-4 py-4 border-b border-ink/10">
      <div className="relative w-16 h-16 flex-shrink-0 bg-mist">
        <Image src={src} alt={item.photoTitle} fill className="object-cover" sizes="64px" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-sans truncate">{item.photoTitle}</p>
        <p className="text-xs font-mono text-ink/50 mt-0.5">{item.size} · {item.frame}</p>

        <div className="flex items-center gap-3 mt-2">
          <div className="flex items-center border border-ink/15">
            <button
              onClick={() => setQuantity(key, item.quantity - 1)}
              className="w-6 h-6 flex items-center justify-center text-ink/50 hover:text-ink transition-colors"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="w-6 text-center text-xs font-mono">{item.quantity}</span>
            <button
              onClick={() => setQuantity(key, item.quantity + 1)}
              className="w-6 h-6 flex items-center justify-center text-ink/50 hover:text-ink transition-colors"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <span className="text-xs font-mono">£{(lineTotal / 100).toFixed(2)}</span>
        </div>
      </div>
      <button
        onClick={() => removeItem(key)}
        className="text-ink/30 hover:text-ink transition-colors text-xs font-mono self-start"
        aria-label="Remove"
      >
        ✕
      </button>
    </div>
  )
}
