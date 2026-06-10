import { notFound } from 'next/navigation'
import Image from 'next/image'
import { getPhotoBySlug, getAllPhotos, getRelatedPhotos } from '@/lib/sanity/queries'
import { urlFor } from '@/lib/sanity/image'
import PrintSelector from '@/components/shop/PrintSelector'
import PrintDetails from '@/components/shop/PrintDetails'
import SizeGuide from '@/components/shop/SizeGuide'
import ProductCard from '@/components/shop/ProductCard'
import ZoomableImage from '@/components/shop/ZoomableImage'
import WishlistButton from '@/components/wishlist/WishlistButton'
import { isSoldOut } from '@/lib/sold-out'

interface Props {
  params: Promise<{ slug: string }>
}

export const revalidate = 60

export async function generateStaticParams() {
  const photos = await getAllPhotos()
  return photos.map(p => ({ slug: p.slug.current }))
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

  if (!photo) notFound()

  const soldOut = isSoldOut()
  const squareSizes = ['20×20', '30×30', '40×40', '50×50']
  const isSquarePrint = photo.variants?.some(v => squareSizes.includes(v.size)) ?? false
  const isForSale = !soldOut && photo.forSale && (photo.variants?.length ?? 0) > 0
  const mainSrc = urlFor(photo.image).width(1800).quality(90).auto('format').url()
  const related = await getRelatedPhotos(
    photo._id,
    photo.collections?.map(c => c.slug.current) ?? []
  )

  const lowestPrice = photo.variants?.reduce((min, v) => Math.min(min, v.price), Infinity)
  const productJsonLd = isForSale && lowestPrice && lowestPrice !== Infinity ? {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: photo.title,
    image: urlFor(photo.image).width(1200).url(),
    description: photo.description || `Fine-art print — ${photo.title}`,
    brand: { '@type': 'Brand', name: 'Archive Nº1' },
    offers: {
      '@type': 'AggregateOffer',
      priceCurrency: 'GBP',
      lowPrice: (lowestPrice / 100).toFixed(2),
      availability: 'https://schema.org/InStock',
      url: `https://www.archiveone.studio/shop/${photo.slug.current}`,
    },
  } : null

  return (
    <>
      {productJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
        />
      )}
    <div className="grid grid-cols-1 lg:grid-cols-2 min-h-screen">
      <div className="relative bg-mist">
        <div className="sticky top-20 p-6 lg:p-12">
          <div className="relative w-full">
            <ZoomableImage
              src={mainSrc}
              fullSrc={urlFor(photo.image).width(2400).quality(92).url()}
              alt={photo.title}
              blurDataURL={photo.lqip}
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

        {isForSale ? (
          <>
            <PrintSelector photo={photo} />
            <PrintDetails limitedEdition={photo.editionSize != null} />
            <details className="mt-8 border-t border-ink/10 pt-6 group">
              <summary className="text-xs font-mono tracking-widest uppercase text-ink/40 cursor-pointer select-none hover:text-ink transition-colors">
                Size guide
              </summary>
              <div className="mt-5">
                <SizeGuide square={isSquarePrint} />
              </div>
            </details>
          </>
        ) : (
          <p className="text-sm font-mono text-ink/40 border-t border-ink/10 pt-6">
            {soldOut ? 'Sold out.' : 'Not currently available as a print.'}
          </p>
        )}
      </div>
    </div>

    {related.length > 0 && (
      <section className="px-6 md:px-12 py-16 border-t border-ink/10">
        <h2 className="text-xs font-mono tracking-widest uppercase text-ink/40 mb-8">
          More from this series
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-10">
          {related.map(p => (
            <ProductCard key={p._id} photo={p} />
          ))}
        </div>
      </section>
    )}
    </>
  )
}
