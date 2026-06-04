import { getAllPhotos } from '@/lib/sanity/queries'
import MasonryGrid from '@/components/archive/MasonryGrid'

export const metadata = { title: 'The Archive — Archive Nº1' }

export const revalidate = 60

export default async function ArchivePage() {
  const photos = await getAllPhotos()

  return (
    <div>
      <div className="px-6 py-12">
        <h1 className="text-xs font-mono tracking-widest uppercase text-ink/40">
          The Archive — {photos.length} works
        </h1>
      </div>
      <MasonryGrid photos={photos} />
    </div>
  )
}
