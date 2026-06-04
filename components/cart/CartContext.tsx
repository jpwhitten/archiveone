'use client'

import { createContext, useContext, useEffect, useReducer, useState } from 'react'
import type { CartItem } from '@/lib/types'
import { cartItemKey } from '@/lib/types'

interface CartState { items: CartItem[] }

type CartAction =
  | { type: 'ADD_ITEM'; item: CartItem }
  | { type: 'SET_QUANTITY'; key: string; quantity: number }
  | { type: 'REMOVE_ITEM'; key: string }
  | { type: 'CLEAR' }

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const key = cartItemKey(action.item)
      const addQty = action.item.quantity > 0 ? action.item.quantity : 1
      const existing = state.items.find(i => cartItemKey(i) === key)
      if (existing) {
        return {
          items: state.items.map(i =>
            cartItemKey(i) === key ? { ...i, quantity: i.quantity + addQty } : i
          ),
        }
      }
      return { items: [...state.items, { ...action.item, quantity: addQty }] }
    }
    case 'SET_QUANTITY': {
      if (action.quantity <= 0) {
        return { items: state.items.filter(i => cartItemKey(i) !== action.key) }
      }
      return {
        items: state.items.map(i =>
          cartItemKey(i) === action.key ? { ...i, quantity: action.quantity } : i
        ),
      }
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
  setQuantity: (key: string, quantity: number) => void
  removeItem: (key: string) => void
  clearCart: () => void
  total: number
  count: number
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
        savedItems.forEach(item =>
          dispatch({ type: 'ADD_ITEM', item: { ...item, quantity: item.quantity || 1 } })
        )
      }
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items))
  }, [state.items, hydrated])

  const total = state.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const count = state.items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{
      items: state.items,
      isOpen,
      openCart: () => setIsOpen(true),
      closeCart: () => setIsOpen(false),
      addItem: item => dispatch({ type: 'ADD_ITEM', item }),
      setQuantity: (key, quantity) => dispatch({ type: 'SET_QUANTITY', key, quantity }),
      removeItem: key => dispatch({ type: 'REMOVE_ITEM', key }),
      clearCart: () => dispatch({ type: 'CLEAR' }),
      total,
      count,
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
