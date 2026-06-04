import ProductCard from './ProductCard'
import type { Photo } from '@/lib/types'

export default function ShopGrid({ photos }: { photos: Photo[] }) {
  if (photos.length === 0) {
    return (
      <div className="px-6 py-24 text-center">
        <p className="text-sm font-mono text-ink/40">No prints available</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-10 px-6 pb-16">
      {photos.map((photo, i) => (
        <ProductCard key={photo._id} photo={photo} priority={i < 6} />
      ))}
    </div>
  )
}
