'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react'
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
      return state.items.length === 0 ? state : { items: [] }
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

  const openCart = useCallback(() => setIsOpen(true), [])
  const closeCart = useCallback(() => setIsOpen(false), [])
  const addItem = useCallback((item: CartItem) => dispatch({ type: 'ADD_ITEM', item }), [])
  const setQuantity = useCallback((key: string, quantity: number) => dispatch({ type: 'SET_QUANTITY', key, quantity }), [])
  const removeItem = useCallback((key: string) => dispatch({ type: 'REMOVE_ITEM', key }), [])
  const clearCart = useCallback(() => dispatch({ type: 'CLEAR' }), [])

  const value = useMemo(
    () => ({ items: state.items, isOpen, openCart, closeCart, addItem, setQuantity, removeItem, clearCart, total, count }),
    [state.items, isOpen, openCart, closeCart, addItem, setQuantity, removeItem, clearCart, total, count]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
