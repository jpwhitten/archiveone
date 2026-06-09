import Link from 'next/link'

export const metadata = { title: 'Not found — Archive Nº1' }

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-paper text-ink">
      <div className="max-w-md text-center">
        {/* Double-square mark */}
        <div className="relative w-14 h-14 mx-auto mb-10">
          <div className="absolute inset-0 border border-ink" />
          <div className="absolute inset-2 border border-ink" />
        </div>
        <p className="text-xs font-mono tracking-widest uppercase text-ink/40">Error 404</p>
        <h1 className="text-2xl font-sans mt-4 mb-3">This page is out of frame</h1>
        <p className="text-sm font-mono text-ink/50 leading-relaxed mb-10">
          The page you're looking for doesn't exist or has moved.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/"
            className="text-xs font-mono tracking-widest uppercase border border-ink px-7 py-3 hover:bg-ink hover:text-paper transition-colors"
          >
            Home
          </Link>
          <Link
            href="/shop"
            className="text-xs font-mono tracking-widest uppercase px-7 py-3 hover:opacity-50 transition-opacity"
          >
            Browse the Shop
          </Link>
        </div>
      </div>
    </div>
  )
}
