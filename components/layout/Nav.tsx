'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/components/cart/CartContext'

export default function Nav() {
  const { items, openCart } = useCart()
  const count = items.length

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 bg-paper/95 backdrop-blur-sm">
      <Link href="/" className="flex items-center" aria-label="Archive Nº1 — home">
        {/* Full lockup on desktop */}
        <Image
          src="/Archive1-logo.png"
          alt="Archive Nº1"
          width={800}
          height={200}
          priority
          className="hidden md:block h-8 w-auto"
        />
        {/* Square mark on mobile */}
        <Image
          src="/Archive1-logo-mobile.png"
          alt="Archive Nº1"
          width={200}
          height={200}
          priority
          className="md:hidden h-8 w-auto"
        />
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
