import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/studio', '/api/', '/order/'],
    },
    sitemap: 'https://www.archiveone.studio/sitemap.xml',
  }
}
