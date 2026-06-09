import type { MetadataRoute } from 'next'
import { getAllPhotos, getAllCollections } from '@/lib/sanity/queries'

const SITE = 'https://www.archiveone.studio'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [photos, collections] = await Promise.all([getAllPhotos(), getAllCollections()])

  const staticRoutes: MetadataRoute.Sitemap = ['', '/archive', '/shop', '/about', '/wishlist'].map(path => ({
    url: `${SITE}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: path === '' ? 1 : 0.7,
  }))

  const photoRoutes: MetadataRoute.Sitemap = photos
    .filter(p => p.forSale)
    .map(p => ({
      url: `${SITE}/shop/${p.slug.current}`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    }))

  const collectionRoutes: MetadataRoute.Sitemap = collections.map(c => ({
    url: `${SITE}/archive/${c.slug.current}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [...staticRoutes, ...photoRoutes, ...collectionRoutes]
}
