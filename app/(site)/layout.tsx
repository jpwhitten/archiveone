import Nav from '@/components/layout/Nav'
import CartDrawer from '@/components/layout/CartDrawer'
import { CartProvider } from '@/components/cart/CartContext'
import { WishlistProvider } from '@/components/wishlist/WishlistContext'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <WishlistProvider>
        <Nav />
        <CartDrawer />
        <main className="pt-28">{children}</main>
      </WishlistProvider>
    </CartProvider>
  )
}
