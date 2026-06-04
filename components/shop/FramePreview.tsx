import Image from 'next/image'
import { urlFor } from '@/lib/sanity/image'
import type { SanityImage, PrintVariant } from '@/lib/types'

interface Props {
  image: SanityImage
  size: PrintVariant['size']
  frame: PrintVariant['frame']
  aspectRatio?: number
}

// Longest edge of the photo (px) for each print size, so larger prints
// render visibly bigger in the preview.
const SIZE_MAX: Record<PrintVariant['size'], number> = {
  A4: 190,
  A3: 240,
  A2: 290,
  A1: 340,
}

export default function FramePreview({ image, size, frame, aspectRatio }: Props) {
  const src = urlFor(image).width(800).quality(90).auto('format').url()

  // width / height. > 1 = landscape, < 1 = portrait. Default to square if unknown.
  const ratio = aspectRatio && aspectRatio > 0 ? aspectRatio : 1
  const max = SIZE_MAX[size]
  const imgWidth = ratio >= 1 ? max : Math.round(max * ratio)
  const imgHeight = ratio >= 1 ? Math.round(max / ratio) : max

  const frameStyle: React.CSSProperties = frame === 'Black'
    ? { border: '18px solid #0A0A0A', padding: 12, background: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }
    : frame === 'White'
    ? { border: '18px solid #FFFFFF', padding: 12, background: 'white', outline: '1px solid #e5e7eb', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }
    : frame === 'Natural'
    ? { border: '18px solid #C8A96E', padding: 12, background: 'white', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }
    : { boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }

  return (
    <div className="flex items-center justify-center bg-mist p-12 min-h-[420px]">
      <div className="transition-all duration-300" style={frameStyle}>
        <div className="relative" style={{ width: imgWidth, height: imgHeight }}>
          <Image
            src={src}
            alt="Print preview"
            fill
            className="object-cover"
            sizes="400px"
          />
        </div>
      </div>
    </div>
  )
}
