import { getFeaturedPhotos } from '@/lib/sanity/queries'
import MasonryGrid from '@/components/archive/MasonryGrid'
import Marquee from '@/components/ui/Marquee'

export default async function HomePage() {
  const photos = await getFeaturedPhotos()

  return (
    <>
      <MasonryGrid photos={photos} linkPrefix="/shop" />
      <Marquee text="COLLECT · PRINTS · ARCHIVE ONE" />
    </>
  )
}
