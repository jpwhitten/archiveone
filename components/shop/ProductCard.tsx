import Link from 'next/link'
import Image from 'next/image'
import { urlFor } from '@/lib/sanity/image'
import type { Photo } from '@/lib/types'

interface Props {
  photo: Photo
  priority?: boolean
}

export default function ProductCard({ photo, priority = false }: Props) {
  const src = urlFor(photo.image).width(1000).height(1000).fit('crop').quality(90).auto('format').url()
  const lowestPrice = photo.variants?.reduce((min, v) => Math.min(min, v.price), Infinity) ?? 0
  const isSoldOut = photo.editionSize != null && photo.editionSold >= photo.editionSize

  return (
    <Link href={`/shop/${photo.slug.current}`} className="group block">
      <div className="relative aspect-square overflow-hidden bg-mist">
        <Image
          src={src}
          alt={photo.title}
          fill
          sizes="(max-width: 768px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          priority={priority}
        />
        {isSoldOut && (
          <div className="absolute inset-0 bg-paper/70 flex items-center justify-center">
            <span className="text-xs font-mono tracking-widest uppercase">Sold Out</span>
          </div>
        )}
      </div>
      <div className="mt-3 px-1">
        <p className="text-sm font-sans">{photo.title}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs font-mono text-ink/60">
            {photo.editionSize
              ? `Edition of ${photo.editionSize}`
              : 'Open edition'}
          </p>
          {lowestPrice > 0 && lowestPrice !== Infinity && (
            <p className="text-xs font-mono">
              From £{(lowestPrice / 100).toFixed(2)}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}
