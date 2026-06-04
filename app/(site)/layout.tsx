import Nav from '@/components/layout/Nav'
import CartDrawer from '@/components/layout/CartDrawer'
import { CartProvider } from '@/components/cart/CartContext'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Nav />
      <CartDrawer />
      <main className="pt-20">{children}</main>
    </CartProvider>
  )
}
