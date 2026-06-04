'use client'

import { createContext, useContext, useEffect, useReducer, useState } from 'react'
import type { CartItem } from '@/lib/types'
import { cartItemKey } from '@/lib/types'

interface CartState { items: CartItem[] }

type CartAction =
  | { type: 'ADD_ITEM'; item: CartItem }
  | { type: 'REMOVE_ITEM'; key: string }
  | { type: 'CLEAR' }

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const key = cartItemKey(action.item)
      if (state.items.some(i => cartItemKey(i) === key)) return state
      return { items: [...state.items, action.item] }
    }
    case 'REMOVE_ITEM':
      return { items: state.items.filter(i => cartItemKey(i) !== action.key) }
    case 'CLEAR':
      return { items: [] }
    default:
      return state
  }
}

interface CartContextValue {
  items: CartItem[]
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
  addItem: (item: CartItem) => void
  removeItem: (key: string) => void
  clearCart: () => void
  total: number
}

const CartContext = createContext<CartContextValue | null>(null)

const STORAGE_KEY = 'archiveone-cart'

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] })
  const [isOpen, setIsOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const savedItems: CartItem[] = JSON.parse(stored)
        savedItems.forEach(item => dispatch({ type: 'ADD_ITEM', item }))
      }
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items))
  }, [state.items, hydrated])

  const total = state.items.reduce((sum, i) => sum + i.price, 0)

  return (
    <CartContext.Provider value={{
      items: state.items,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem: item => dispatch({ type: 'ADD_ITEM', item }),
      removeItem: key => dispatch({ type: 'REMOVE_ITEM', key }),
      clearCart: () => dispatch({ type: 'CLEAR' }),
      total,
    }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
