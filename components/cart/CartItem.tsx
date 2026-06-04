'use client'

import Image from 'next/image'
import { urlFor } from '@/lib/sanity/image'
import { cartItemKey } from '@/lib/types'
import { useCart } from './CartContext'
import type { CartItem as CartItemType } from '@/lib/types'

export default function CartItem({ item }: { item: CartItemType }) {
  const { removeItem } = useCart()
  const src = urlFor(item.photoImage).width(120).height(120).fit('crop').url()

  return (
    <div className="flex gap-4 py-4 border-b border-ink/10">
      <div className="relative w-16 h-16 flex-shrink-0 bg-mist">
        <Image src={src} alt={item.photoTitle} fill className="object-cover" sizes="64px" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-sans truncate">{item.photoTitle}</p>
        <p className="text-xs font-mono text-ink/50 mt-0.5">{item.size} · {item.frame}</p>
        <p className="text-xs font-mono mt-1">£{(item.price / 100).toFixed(2)}</p>
      </div>
      <button
        onClick={() => removeItem(cartItemKey(item))}
        className="text-ink/30 hover:text-ink transition-colors text-xs font-mono"
        aria-label="Remove"
      >
        ✕
      </button>
    </div>
  )
}
