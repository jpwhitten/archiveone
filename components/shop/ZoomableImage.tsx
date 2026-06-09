'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface Props {
  src: string
  fullSrc: string
  alt: string
  blurDataURL?: string
}

export default function ZoomableImage({ src, fullSrc, alt, blurDataURL }: Props) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full cursor-zoom-in"
        aria-label={`Expand ${alt}`}
      >
        <Image
          src={src}
          alt={alt}
          width={1800}
          height={0}
          quality={95}
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="w-full h-auto"
          style={{ height: 'auto' }}
          {...(blurDataURL ? { placeholder: 'blur' as const, blurDataURL } : {})}
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] bg-ink/95 flex items-center justify-center p-4 sm:p-10 cursor-zoom-out"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fullSrc}
            alt={alt}
            className="max-w-full max-h-full object-contain select-none"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-5 right-6 text-paper text-xs font-mono tracking-widest uppercase hover:opacity-60 transition-opacity"
          >
            ✕ Close
          </button>
        </div>
      )}
    </>
  )
}
