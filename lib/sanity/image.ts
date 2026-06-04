import imageUrlBuilder from '@sanity/image-url'
import type { SanityImage } from '@/lib/types'

const builder = imageUrlBuilder({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? '',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
})

export function urlFor(source: SanityImage) {
  return builder.image(source)
}
