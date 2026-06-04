import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getPhotoBySlug, getAllPhotos } from '@/lib/sanity/queries'
import { urlFor } from '@/lib/sanity/image'
import PrintSelector from '@/components/shop/PrintSelector'
import WishlistButton from '@/components/wishlist/WishlistButton'

interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 60

export async function generateStaticParams() {
  const photos = await getAllPhotos()
  return photos.filter(p => p.forSale).map(p => ({ slug: p.slug.current }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const photo = await getPhotoBySlug(slug)
  if (!photo) return {}
  return {
    title: `${photo.title} — Archive Nº1`,
    openGraph: {
      images: [urlFor(photo.image).width(1200).height(630).fit('crop').url()],
    },
  }
}

export default async function PrintPage({ params }: Props) {
  const { slug } = await params
  const photo = await getPhotoBySlug(slug)

  if (!photo || !photo.forSale) notFound()

  const mainSrc = urlFor(photo.image).width(1800).quality(90).auto('format').url()

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
      <div className="relative bg-mist">
        <div className="sticky top-20 p-6 lg:p-12">
          <div className="relative w-full">
            <Image
              src={mainSrc}
              alt={photo.title}
              width={1800}
              height={0}
              quality={95}
              className="w-full h-auto"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              style={{ height: 'auto' }}
            />
            <div className="absolute top-4 right-4">
              <WishlistButton photoId={photo._id} photoSlug={photo.slug.current} />
            </div>
          </div>
        </div>

        {photo.mockupImages && photo.mockupImages.length > 0 && (
          <div className="grid grid-cols-3 gap-px mt-px">
            {photo.mockupImages.map((img, i) => {
              const src = urlFor(img).width(400).height(400).fit('crop').auto('format').url()
              return (
                <div key={i} className="relative aspect-square bg-mist">
                  <Image
                    src={src}
                    alt={`${photo.title} room mockup ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="200px"
                  />
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="px-8 py-12 lg:px-12">
        <div className="mb-8">
          <h1 className="text-2xl font-sans mb-1">{photo.title}</h1>
          {photo.location && (
            <p className="text-sm font-mono text-ink/40">{photo.location}</p>
          )}
          {photo.description && (
            <p className="mt-4 text-sm text-ink/70 leading-relaxed">{photo.description}</p>
          )}
        </div>

        <PrintSelector photo={photo} />
      </div>
    </div>
  )
}
