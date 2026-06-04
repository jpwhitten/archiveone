import Nav from '@/components/layout/Nav'
import { CartProvider } from '@/components/cart/CartContext'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <Nav />
      <main className="pt-20">{children}</main>
    </CartProvider>
  )
}
