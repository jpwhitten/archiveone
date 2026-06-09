// Visual size comparison for A-series prints. Nested, bottom-left aligned
// rectangles drawn to scale, with a human silhouette (~170cm) for reference.

const SIZES = [
  { name: 'A1', w: 594, h: 841, cm: '59.4 × 84.1 cm' },
  { name: 'A2', w: 420, h: 594, cm: '42.0 × 59.4 cm' },
  { name: 'A3', w: 297, h: 420, cm: '29.7 × 42.0 cm' },
  { name: 'A4', w: 210, h: 297, cm: '21.0 × 29.7 cm' },
]

const HUMAN_CM = 170
const MAX_MM = 841 // A1 height
const VIEW_H = 280 // px the tallest print occupies
const scale = VIEW_H / MAX_MM
const humanH = (HUMAN_CM * 10) * scale

export default function SizeGuide() {
  return (
    <div className="bg-mist p-6">
      <div className="flex items-end justify-center gap-8" style={{ height: humanH + 24 }}>
        {/* Human silhouette for scale */}
        <div className="flex flex-col items-center justify-end h-full">
          <div
            className="w-6 bg-ink/15 rounded-t-full"
            style={{ height: humanH }}
            aria-hidden
          />
          <span className="mt-2 text-[10px] font-mono text-ink/40">1.7m</span>
        </div>

        {/* Nested print sizes */}
        <div className="relative" style={{ width: SIZES[0].w * scale, height: VIEW_H }}>
          {SIZES.map((s, i) => (
            <div
              key={s.name}
              className="absolute bottom-0 left-0 border border-ink/40 flex items-start justify-center"
              style={{
                width: s.w * scale,
                height: s.h * scale,
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
          {SIZES.slice().reverse().map(s => (
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
