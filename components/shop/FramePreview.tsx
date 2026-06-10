import Image from 'next/image'
import { urlFor } from '@/lib/sanity/image'
import type { SanityImage, PrintVariant } from '@/lib/types'

interface Props {
  image: SanityImage
  size: PrintVariant['size']
  frame: PrintVariant['frame']
  aspectRatio?: number
}

// Longest edge of the photo (px) per print size, so larger prints render
// visibly bigger in the preview.
const SIZE_MAX: Record<PrintVariant['size'], number> = {
  A4: 180,
  A3: 225,
  A2: 270,
  A1: 315,
  '20×20': 170,
  '30×30': 215,
  '40×40': 260,
  '50×50': 305,
}

// Physical paper dimensions for the scale caption.
const SIZE_CM: Record<PrintVariant['size'], string> = {
  A4: '21 × 30 cm',
  A3: '30 × 42 cm',
  A2: '42 × 59 cm',
  A1: '59 × 84 cm',
  '20×20': '20 × 20 cm',
  '30×30': '30 × 30 cm',
  '40×40': '40 × 40 cm',
  '50×50': '50 × 50 cm',
}

// Moulding (outer frame profile) per frame option. null = unframed.
// The inset box-shadow gives each frame a bevel so it reads as a real profile.
function moulding(frame: PrintVariant['frame']): React.CSSProperties | null {
  switch (frame) {
    case 'Black':
      return {
        padding: 15,
        background: 'linear-gradient(135deg, #2c2c2c, #090909)',
        boxShadow: 'inset 2px 2px 2px rgba(255,255,255,0.14), inset -2px -2px 3px rgba(0,0,0,0.7)',
      }
    case 'White':
      return {
        padding: 15,
        background: 'linear-gradient(135deg, #ffffff, #ececec)',
        boxShadow:
          'inset 2px 2px 2px rgba(255,255,255,0.9), inset -2px -2px 3px rgba(0,0,0,0.12), 0 0 0 1px #e3e1dc',
      }
    case 'Natural':
      return {
        padding: 15,
        background:
          'repeating-linear-gradient(91deg, rgba(120,80,30,0) 0px, rgba(120,80,30,0.09) 2px, rgba(120,80,30,0) 5px), linear-gradient(135deg, #ddc197, #bf9d62)',
        boxShadow: 'inset 2px 2px 2px rgba(255,255,255,0.32), inset -2px -2px 3px rgba(90,60,20,0.45)',
      }
    default:
      return null
  }
}

export default function FramePreview({ image, size, frame, aspectRatio }: Props) {
  const src = urlFor(image).width(800).quality(90).auto('format').url()

  // width / height. > 1 = landscape, < 1 = portrait. Default to square if unknown.
  const ratio = aspectRatio && aspectRatio > 0 ? aspectRatio : 1
  const max = SIZE_MAX[size]
  const imgWidth = ratio >= 1 ? max : Math.round(max * ratio)
  const imgHeight = ratio >= 1 ? Math.round(max / ratio) : max

  const m = moulding(frame)
  const isUnframed = frame === 'Unframed'
  const matPad = isUnframed ? 11 : 22
  const mouldPad = m ? 15 : 0

  // Ideal block width at this size; capped to the container on narrow screens.
  const blockWidth = imgWidth + 2 * (matPad + mouldPad)

  // Directional cast shadow so the frame sits on the wall and catches light.
  const dropShadow = m
    ? '16px 30px 45px -18px rgba(40,30,15,0.42), 4px 9px 14px -6px rgba(0,0,0,0.28)'
    : '12px 26px 40px -18px rgba(40,30,15,0.32), 3px 7px 12px -6px rgba(0,0,0,0.2)'

  return (
    <div
      className="relative flex flex-col items-center justify-center min-h-[360px] sm:min-h-[480px] overflow-hidden px-6 py-12"
      // Soft gallery wall with a subtle floor line ~70% down.
      style={{
        background:
          'linear-gradient(180deg, #f5f3f0 0%, #efece8 70%, #e7e3dd 70.3%, #e2ddd6 100%)',
      }}
    >
      <div
        className="transition-all duration-300"
        style={{
          ...(m ?? {}),
          boxSizing: 'border-box',
          width: `min(${blockWidth}px, 100%)`,
          boxShadow: m ? `${m.boxShadow as string}, ${dropShadow}` : dropShadow,
        }}
      >
        {/* Mat / mount (or thin paper margin when unframed) */}
        <div style={{ background: '#fcfbf9', padding: matPad, boxSizing: 'border-box' }}>
          {/* Print window — recessed below the mat for framed options */}
          <div
            className="relative"
            style={{
              width: '100%',
              aspectRatio: `${imgWidth} / ${imgHeight}`,
              boxShadow: isUnframed
                ? 'inset 0 0 0 1px rgba(0,0,0,0.05)'
                : 'inset 0 3px 7px -2px rgba(0,0,0,0.28), inset 0 0 0 1px rgba(0,0,0,0.06)',
            }}
          >
            <Image src={src} alt="Print preview" fill className="object-cover" sizes="400px" />
          </div>
        </div>
      </div>

      <p className="mt-7 text-[11px] font-mono tracking-widest uppercase text-ink/40">
        Shown at {size} · {SIZE_CM[size]}
      </p>
    </div>
  )
}
