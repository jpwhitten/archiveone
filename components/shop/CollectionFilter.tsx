'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { Collection } from '@/lib/types'

interface Props {
  collections: Collection[]
}

export default function CollectionFilter({ collections }: Props) {
  const params = useSearchParams()
  const active = params.get('collection')

  return (
    <div className="flex gap-4 flex-wrap px-6 py-6">
      <Link
        href="/shop"
        className={`text-xs font-mono tracking-widest uppercase pb-0.5 ${!active ? 'border-b border-ink' : 'text-ink/40 hover:text-ink transition-colors'}`}
      >
        All
      </Link>
      {collections.map(col => (
        <Link
          key={col._id}
          href={`/shop?collection=${col.slug.current}`}
          className={`text-xs font-mono tracking-widest uppercase pb-0.5 ${active === col.slug.current ? 'border-b border-ink' : 'text-ink/40 hover:text-ink transition-colors'}`}
        >
          {col.title}
        </Link>
      ))}
    </div>
  )
}
