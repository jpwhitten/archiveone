import { getShopPhotos, getAllCollections } from '@/lib/sanity/queries'
import ShopGrid from '@/components/shop/ShopGrid'
import CollectionFilter from '@/components/shop/CollectionFilter'
import { Suspense } from 'react'

export const metadata = { title: 'Shop — Archive Nº1' }

interface Props {
  searchParams: Promise<{ collection?: string }>
}

export default async function ShopPage({ searchParams }: Props) {
  const { collection } = await searchParams
  const [allPhotos, collections] = await Promise.all([
    getShopPhotos(),
    getAllCollections(),
  ])

  const photos = collection
    ? allPhotos.filter(p => p.collections?.some(c => c.slug.current === collection))
    : allPhotos

  return (
    <div>
      <div className="px-6 pt-12 pb-2">
        <h1 className="text-xs font-mono tracking-widest uppercase text-ink/40">Shop</h1>
      </div>
      <Suspense>
        <CollectionFilter collections={collections} />
      </Suspense>
      <ShopGrid photos={photos} />
    </div>
  )
}
