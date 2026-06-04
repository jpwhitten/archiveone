import Image from 'next/image'
import { urlFor } from '@/lib/sanity/image'
import type { SanityImage, PrintVariant } from '@/lib/types'

interface Props {
  image: SanityImage
  size: PrintVariant['size']
  frame: PrintVariant['frame']
}

const SIZE_WIDTH: Record<PrintVariant['size'], string> = {
  A4: 'max-w-[180px]',
  A3: 'max-w-[220px]',
  A2: 'max-w-[260px]',
  A1: 'max-w-[300px]',
}

export default function FramePreview({ image, size, frame }: Props) {
  const src = urlFor(image).width(600).auto('format').url()

  const frameStyle: React.CSSProperties = frame === 'Black'
    ? { border: '18px solid #0A0A0A', padding: 12, background: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }
    : frame === 'White'
    ? { border: '18px solid #FFFFFF', padding: 12, background: 'white', outline: '1px solid #e5e7eb', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }
    : frame === 'Natural'
    ? { border: '18px solid #C8A96E', padding: 12, background: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }
    : { boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }

  return (
    <div className="flex items-center justify-center bg-mist p-12 min-h-[360px]">
      <div
        className={`transition-all duration-300 w-full ${SIZE_WIDTH[size]}`}
        style={frameStyle}
      >
        <div className="aspect-[210/297] relative w-full">
          <Image
            src={src}
            alt="Print preview"
            fill
            className="object-cover"
            sizes="300px"
          />
        </div>
      </div>
    </div>
  )
}
