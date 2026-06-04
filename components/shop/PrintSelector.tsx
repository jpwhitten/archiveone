'use client'

import { useState } from 'react'
import FramePreview from './FramePreview'
import { useCart } from '@/components/cart/CartContext'
import { cartItemKey } from '@/lib/types'
import type { Photo, PrintVariant } from '@/lib/types'

const SIZES: PrintVariant['size'][] = ['A4', 'A3', 'A2', 'A1']
const FRAMES: PrintVariant['frame'][] = ['Unframed', 'Black', 'White', 'Natural']

interface Props {
  photo: Photo
}

export default function PrintSelector({ photo }: Props) {
  const [size, setSize] = useState<PrintVariant['size']>('A3')
  const [frame, setFrame] = useState<PrintVariant['frame']>('Unframed')
  const { addItem, openCart, items } = useCart()

  const variant = photo.variants?.find(v => v.size === size && v.frame === frame)
  const isSoldOut = photo.editionSize != null && photo.editionSold >= photo.editionSize
  const inCart = items.some(i => cartItemKey(i) === cartItemKey({ photoId: photo._id, size, frame }))

  const availableSizes = SIZES.filter(s => photo.variants?.some(v => v.size === s))
  const availableFrames = FRAMES.filter(f => photo.variants?.some(v => v.size === size && v.frame === f))

  function handleAddToCart() {
    if (!variant) return
    addItem({
      photoId: photo._id,
      photoTitle: photo.title,
      photoSlug: photo.slug.current,
      photoImage: photo.image,
      size,
      frame,
      price: variant.price,
      stripePriceId: variant.stripePriceId,
      quantity: 1,
    })
    openCart()
  }

  return (
    <div className="space-y-8">
      <FramePreview image={photo.image} size={size} frame={frame} aspectRatio={photo.imageAspectRatio} />

      <div>
        <p className="text-xs font-mono tracking-widest uppercase text-ink/40 mb-3">Size</p>
        <div className="flex gap-2 flex-wrap">
          {availableSizes.map(s => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className={`px-4 py-2 text-sm font-mono border transition-colors ${
                size === s ? 'border-ink bg-ink text-paper' : 'border-ink/20 hover:border-ink'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-mono tracking-widest uppercase text-ink/40 mb-3">Frame</p>
        <div className="flex gap-2 flex-wrap">
          {availableFrames.map(f => (
            <button
              key={f}
              onClick={() => setFrame(f)}
              className={`px-4 py-2 text-sm font-mono border transition-colors ${
                frame === f ? 'border-ink bg-ink text-paper' : 'border-ink/20 hover:border-ink'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div>
        {variant && (
          <p className="text-2xl font-mono">£{(variant.price / 100).toFixed(2)}</p>
        )}
        <p className="text-xs font-mono text-ink/40 mt-1">
          {photo.editionSize
            ? `Edition ${photo.editionSold + 1} of ${photo.editionSize}`
            : 'Open edition'}
        </p>
      </div>

      <button
        onClick={handleAddToCart}
        disabled={!variant || isSoldOut}
        className="w-full py-4 text-sm font-mono tracking-widest uppercase bg-ink text-paper hover:bg-ink/80 disabled:bg-ink/20 disabled:cursor-not-allowed transition-colors"
      >
        {isSoldOut ? 'Sold Out' : inCart ? 'Add Another' : 'Add to Cart'}
      </button>
    </div>
  )
}
