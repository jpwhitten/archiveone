'use client'

import Link from 'next/link'
import { useCart } from '@/components/cart/CartContext'

export default function Nav() {
  const { items, openCart } = useCart()
  const count = items.length

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 bg-paper/95 backdrop-blur-sm">
      <Link href="/" className="flex items-center gap-3">
        {/* Double-square logo */}
        <div className="relative w-9 h-9">
          <div className="absolute inset-0 border border-ink" />
          <div className="absolute inset-1 border border-ink" />
        </div>
        <span className="text-sm tracking-display font-sans uppercase">Archive Nº1</span>
      </Link>

      <nav className="hidden md:flex items-center gap-8 text-sm">
        <Link href="/archive" className="hover:opacity-50 transition-opacity">The Archive</Link>
        <Link href="/shop" className="hover:opacity-50 transition-opacity">Shop</Link>
        <Link href="/wishlist" className="hover:opacity-50 transition-opacity">Wishlist</Link>
        <Link href="/about" className="hover:opacity-50 transition-opacity">About</Link>
        <button
          onClick={openCart}
          className="hover:opacity-50 transition-opacity"
        >
          Cart{count > 0 && <span className="ml-1 font-mono">({count})</span>}
        </button>
      </nav>
    </header>
  )
}
