'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface WishlistContextValue {
  ids: string[]
  toggle: (photoId: string) => void
  has: (photoId: string) => boolean
}

const WishlistContext = createContext<WishlistContextValue | null>(null)

const STORAGE_KEY = 'archiveone-wishlist'

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) setIds(JSON.parse(stored))
    } catch {}
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  }, [ids])

  function toggle(photoId: string) {
    setIds(prev =>
      prev.includes(photoId) ? prev.filter(id => id !== photoId) : [...prev, photoId]
    )
  }

  return (
    <WishlistContext.Provider value={{ ids, toggle, has: id => ids.includes(id) }}>
      {children}
    </WishlistContext.Provider>
  )
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider')
  return ctx
}
