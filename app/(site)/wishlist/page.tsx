'use client'

import { useWishlist } from '@/components/wishlist/WishlistContext'
import { useEffect, useState } from 'react'
import { sanityClient } from '@/lib/sanity/client'
import { groq } from 'next-sanity'
import ProductCard from '@/components/shop/ProductCard'
import type { Photo } from '@/lib/types'

export default function WishlistPage() {
  const { ids } = useWishlist()
  const [photos, setPhotos] = useState<Photo[]>([])

  useEffect(() => {
    if (ids.length === 0) { setPhotos([]); return }
    sanityClient
      .fetch<Photo[]>(
        groq`*[_type == "photo" && _id in $ids] {
          _id, title, slug, image, location, forSale,
          editionSize, editionSold, variants,
          "collections": collections[]->{ _id, title, slug }
        }`,
        { ids }
      )
      .then(setPhotos)
  }, [ids])

  return (
    <div className="px-6 py-12">
      <h1 className="text-xs font-mono tracking-widest uppercase text-ink/40 mb-8">
        Wishlist — {ids.length} saved
      </h1>
      {photos.length === 0 ? (
        <p className="text-sm font-mono text-ink/40">Nothing saved yet. Heart a photo to save it.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
          {photos.map(p => <ProductCard key={p._id} photo={p} />)}
        </div>
      )}
    </div>
  )
}
