import Link from 'next/link'
import Image from 'next/image'
import { getArchiveCollections } from '@/lib/sanity/queries'
import { urlFor } from '@/lib/sanity/image'

export const metadata = { title: 'The Archive — Archive Nº1' }

export const revalidate = 60

export default async function ArchivePage() {
  const collections = (await getArchiveCollections()).filter(c => c.count > 0)

  return (
    <div className="px-6 py-12">
      <h1 className="text-xs font-mono tracking-widest uppercase text-ink/40 mb-12">
        The Archive — {collections.length} {collections.length === 1 ? 'collection' : 'collections'}
      </h1>

      {collections.length === 0 ? (
        <p className="text-sm font-mono text-ink/40">No collections yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-14">
          {collections.map((c, i) => (
            <Link key={c._id} href={`/archive/${c.slug.current}`} className="group block">
              <div className="relative aspect-[4/3] overflow-hidden bg-mist">
                {c.cover && (
                  <Image
                    src={urlFor(c.cover).width(1400).height(1050).fit('crop').quality(90).url()}
                    alt={c.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    priority={i < 2}
                  />
                )}
              </div>
              <div className="mt-4 flex items-baseline justify-between gap-4">
                <h2 className="text-xl font-sans">{c.title}</h2>
                <span className="text-xs font-mono text-ink/40 whitespace-nowrap">
                  {c.count} {c.count === 1 ? 'work' : 'works'}
                </span>
              </div>
              {c.description && (
                <p className="mt-1 text-sm text-ink/60 leading-relaxed max-w-md">{c.description}</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
