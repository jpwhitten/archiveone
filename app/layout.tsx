import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'Archive Nº1',
    template: '%s — Archive Nº1',
  },
  description: 'Curated photographic works, printed to archival standards.',
  metadataBase: new URL('https://www.archiveone.studio'),
  openGraph: {
    title: 'Archive Nº1',
    description: 'Curated photographic works, printed to archival standards.',
    images: ['/og-default.jpg'],
    siteName: 'Archive Nº1',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.variable}>{children}<Analytics /></body>
    </html>
  )
}
