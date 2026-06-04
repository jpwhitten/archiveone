import PhotoCard from './PhotoCard'
import type { Photo } from '@/lib/types'

interface Props {
  photos: Photo[]
  linkPrefix?: string
}

export default function MasonryGrid({ photos, linkPrefix = '/archive' }: Props) {
  return (
    <div className="masonry">
      {photos.map((photo, i) => (
        <PhotoCard
          key={photo._id}
          photo={photo}
          href={`${linkPrefix}/${photo.slug.current}`}
          priority={i < 4}
        />
      ))}
    </div>
  )
}
