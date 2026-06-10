interface Props {
  limitedEdition?: boolean
}

interface Spec {
  label: string
  value: string
}

const SPECS: Spec[] = [
  { label: 'Paper', value: 'Giclée archival matte, 300gsm' },
  { label: 'Printing', value: 'Pigment inks, made to order' },
  { label: 'Shipping', value: 'Free worldwide' },
  { label: 'Returns', value: 'Replaced if damaged or faulty' },
]

export default function PrintDetails({ limitedEdition = false }: Props) {
  const specs = limitedEdition
    ? [...SPECS, { label: 'Certificate', value: 'Signed, numbered certificate' }]
    : SPECS

  return (
    <section className="mt-8 border-t border-ink/10 pt-6">
      <h2 className="text-xs font-mono tracking-widest uppercase text-ink/40 mb-5">
        About this print
      </h2>
      <dl className="space-y-3">
        {specs.map(spec => (
          <div key={spec.label} className="flex gap-4">
            <dt className="w-24 shrink-0 text-xs font-mono tracking-widest uppercase text-ink/40 pt-0.5">
              {spec.label}
            </dt>
            <dd className="text-sm text-ink/70">{spec.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 text-xs text-ink/50 leading-relaxed">
        Each print is made to order by a specialist fine-art lab and inspected before it ships.
      </p>
    </section>
  )
}
