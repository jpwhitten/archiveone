'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/components/cart/CartContext'

const LINKS = [
  { href: '/archive', label: 'The Archive' },
  { href: '/shop', label: 'Shop' },
  { href: '/wishlist', label: 'Wishlist' },
  { href: '/about', label: 'About' },
]

export default function Nav() {
  const { items, openCart } = useCart()
  const count = items.length
  const [menuOpen, setMenuOpen] = useState(false)

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
          className="hidden md:block h-11 w-auto"
        />
        {/* Square mark on mobile */}
        <Image
          src="/Archive1-logo-mobile.png"
          alt="Archive Nº1"
          width={200}
          height={200}
          priority
          className="md:hidden h-11 w-auto"
        />
      </Link>

      {/* Desktop nav */}
      <nav className="hidden md:flex items-center gap-8 text-sm">
        {LINKS.map(link => (
          <Link key={link.href} href={link.href} className="hover:opacity-50 transition-opacity">
            {link.label}
          </Link>
        ))}
        <button onClick={openCart} className="hover:opacity-50 transition-opacity">
          Cart{count > 0 && <span className="ml-1 font-mono">({count})</span>}
        </button>
      </nav>

      {/* Mobile controls */}
      <div className="flex md:hidden items-center gap-5">
        <button onClick={openCart} className="text-sm" aria-label="Open cart">
          Cart{count > 0 && <span className="ml-1 font-mono">({count})</span>}
        </button>
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="flex flex-col gap-1.5 w-6"
        >
          <span className="block h-px w-full bg-ink" />
          <span className="block h-px w-full bg-ink" />
          <span className="block h-px w-full bg-ink" />
        </button>
      </div>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-paper flex flex-col md:hidden">
          <div className="flex items-center justify-between px-6 py-5">
            <Image
              src="/Archive1-logo-mobile.png"
              alt="Archive Nº1"
              width={200}
              height={200}
              className="h-11 w-auto"
            />
            <button
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="text-sm font-mono"
            >
              ✕ Close
            </button>
          </div>
          <nav className="flex flex-col gap-2 px-6 mt-8">
            {LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="text-2xl font-sans py-3 border-b border-ink/10"
              >
                {link.label}
              </Link>
            ))}
            <button
              onClick={() => { setMenuOpen(false); openCart() }}
              className="text-2xl font-sans py-3 text-left"
            >
              Cart{count > 0 && <span className="ml-2 font-mono text-base">({count})</span>}
            </button>
          </nav>
        </div>
      )}
    </header>
  )
}
