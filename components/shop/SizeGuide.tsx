// Visual size comparison. Nested, bottom-left aligned rectangles drawn to a
// fixed real-world scale, with a human silhouette (~170cm) for reference.

interface SizeRow {
  name: string
  w: number // mm
  h: number // mm
  cm: string
}

const A_SIZES: SizeRow[] = [
  { name: 'A1', w: 594, h: 841, cm: '59.4 × 84.1 cm' },
  { name: 'A2', w: 420, h: 594, cm: '42.0 × 59.4 cm' },
  { name: 'A3', w: 297, h: 420, cm: '29.7 × 42.0 cm' },
  { name: 'A4', w: 210, h: 297, cm: '21.0 × 29.7 cm' },
]

const SQUARE_SIZES: SizeRow[] = [
  { name: '50×50', w: 500, h: 500, cm: '50 × 50 cm' },
  { name: '40×40', w: 400, h: 400, cm: '40 × 40 cm' },
  { name: '30×30', w: 300, h: 300, cm: '30 × 30 cm' },
  { name: '20×20', w: 200, h: 200, cm: '20 × 20 cm' },
]

const HUMAN_CM = 170
const PX_PER_MM = 280 / 841 // fixed: A1's 841mm height = 280px
const humanH = HUMAN_CM * 10 * PX_PER_MM

export default function SizeGuide({ square = false }: { square?: boolean }) {
  const sizes = square ? SQUARE_SIZES : A_SIZES
  const boxW = sizes[0].w * PX_PER_MM
  const boxH = sizes[0].h * PX_PER_MM

  return (
    <div className="bg-mist p-6">
      <div className="flex items-end justify-center gap-8" style={{ height: humanH + 24 }}>
        {/* Human silhouette for scale */}
        <div className="flex flex-col items-center justify-end h-full">
          <div className="w-6 bg-ink/15 rounded-t-full" style={{ height: humanH }} aria-hidden />
          <span className="mt-2 text-[10px] font-mono text-ink/40">1.7m</span>
        </div>

        {/* Nested print sizes */}
        <div className="relative self-end" style={{ width: boxW, height: boxH }}>
          {sizes.map((s, i) => (
            <div
              key={s.name}
              className="absolute bottom-0 left-0 border border-ink/40 flex items-start justify-center"
              style={{
                width: s.w * PX_PER_MM,
                height: s.h * PX_PER_MM,
                background: `rgba(10,10,10,${0.03 + i * 0.03})`,
              }}
            >
              <span className="mt-1 text-[10px] font-mono text-ink/60">{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      <table className="w-full mt-6 text-xs font-mono text-ink/60">
        <tbody>
          {sizes.slice().reverse().map(s => (
            <tr key={s.name} className="border-t border-ink/10">
              <td className="py-2 text-ink/80">{s.name}</td>
              <td className="py-2 text-right">{s.cm}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
