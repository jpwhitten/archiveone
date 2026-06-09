import Link from 'next/link'
import Image from 'next/image'
import { urlFor } from '@/lib/sanity/image'
import type { Photo } from '@/lib/types'

interface Props {
  photo: Photo
  href: string
  priority?: boolean
}

export default function PhotoCard({ photo, href, priority = false }: Props) {
  const src = urlFor(photo.image).width(1400).quality(90).auto('format').url()

  return (
    <Link href={href} className="group masonry-item block overflow-hidden">
      <div className="relative overflow-hidden">
        <Image
          src={src}
          alt={photo.title}
          width={1400}
          height={0}
          quality={95}
          {...(photo.lqip ? { placeholder: 'blur' as const, blurDataURL: photo.lqip } : {})}
          sizes="(max-width: 768px) 100vw, 50vw"
          className="w-full h-auto transition-transform duration-500 group-hover:scale-[1.02]"
          priority={priority}
          style={{ height: 'auto' }}
        />
        <div className="absolute inset-0 flex items-end p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-black/30 to-transparent">
          <div className="text-white">
            <p className="text-sm font-sans">{photo.title}</p>
            {photo.location && (
              <p className="text-xs font-mono opacity-75">{photo.location}</p>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
