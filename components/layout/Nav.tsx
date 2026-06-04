'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useCart } from '@/components/cart/CartContext'

const LINKS = [
  { href: '/archive', label: 'The Archive' },
  { href: '/shop', label: 'Shop' },
  { href: '/wishlist', label: 'Wishlist' },
  { href: '/about', label: 'About' },
]

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  )
}

export default function Nav() {
  const { count, openCart } = useCart()
  const [menuOpen, setMenuOpen] = useState(false)

  // Lock body scroll while the mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-5 bg-paper">
      <Link href="/" className="flex items-center" aria-label="Archive Nº1 — home">
        {/* Full lockup on desktop */}
        <Image
          src="/Archive1-logo.png"
          alt="Archive Nº1"
          width={800}
          height={200}
          priority
          unoptimized
          className="hidden md:block h-[66px] w-auto"
        />
        {/* Square mark on mobile */}
        <Image
          src="/Archive1-logo-mobile.png"
          alt="Archive Nº1"
          width={200}
          height={200}
          priority
          unoptimized
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
        <button
          onClick={openCart}
          className="relative hover:opacity-50 transition-opacity"
          aria-label={`Open cart${count > 0 ? `, ${count} items` : ''}`}
        >
          <CartIcon />
          {count > 0 && (
            <span className="absolute -top-2 -right-2.5 text-[10px] font-mono leading-none">{count}</span>
          )}
        </button>
      </nav>

      {/* Mobile controls */}
      <div className="flex md:hidden items-center gap-5">
        <button
          onClick={openCart}
          className="relative"
          aria-label={`Open cart${count > 0 ? `, ${count} items` : ''}`}
        >
          <CartIcon />
          {count > 0 && (
            <span className="absolute -top-2 -right-2.5 text-[10px] font-mono leading-none">{count}</span>
          )}
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
        <div className="fixed inset-0 z-[60] bg-paper flex flex-col md:hidden">
          <div className="flex items-center justify-between px-6 py-5">
            <Image
              src="/Archive1-logo-mobile.png"
              alt="Archive Nº1"
              width={200}
              height={200}
              unoptimized
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
