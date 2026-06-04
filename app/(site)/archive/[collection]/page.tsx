import { notFound } from 'next/navigation'
import { getCollectionBySlug, getPhotosByCollection, getAllCollections } from '@/lib/sanity/queries'
import MasonryGrid from '@/components/archive/MasonryGrid'

interface Props {
  params: Promise<{ collection: string }>
}

export async function generateStaticParams() {
  const collections = await getAllCollections()
  return collections.map(c => ({ collection: c.slug.current }))
}

export async function generateMetadata({ params }: Props) {
  const { collection: slug } = await params
  const col = await getCollectionBySlug(slug)
  return { title: col ? `${col.title} — Archive Nº1` : 'Archive Nº1' }
}

export default async function CollectionPage({ params }: Props) {
  const { collection: slug } = await params
  const [col, photos] = await Promise.all([
    getCollectionBySlug(slug),
    getPhotosByCollection(slug),
  ])

  if (!col) notFound()

  return (
    <div>
      <div className="px-6 py-12">
        <h1 className="text-xs font-mono tracking-widest uppercase text-ink/40">
          {col.title} — {photos.length} works
        </h1>
        {col.description && (
          <p className="mt-2 text-sm text-ink/60 max-w-md">{col.description}</p>
        )}
      </div>
      <MasonryGrid photos={photos} />
    </div>
  )
}
