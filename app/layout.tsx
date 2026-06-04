import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Archive Nº1',
  description: 'Curated photographic works, printed to archival standards.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://archiveone.studio'),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.variable}>{children}</body>
    </html>
  )
}
