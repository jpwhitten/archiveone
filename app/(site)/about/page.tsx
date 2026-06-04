export const metadata = { title: 'About' }

export default function AboutPage() {
  return (
    <div className="max-w-xl mx-auto px-6 py-24">
      <h1 className="text-xs font-mono tracking-widest uppercase text-ink/40 mb-12">About</h1>

      <div className="space-y-6 text-sm leading-relaxed text-ink/80">
        <p>
          Archive Nº1 is a curated collection of photographic works available as fine-art prints.
          Each image is selected for its ability to hold attention — the kind of photograph that
          rewards a second look.
        </p>
        <p>
          Prints are produced to archival standards using pigment inks on museum-quality paper,
          fulfilled through specialist print studios in the UK, US, and Australia.
        </p>
      </div>

      <div className="mt-16 pt-8 border-t border-ink/10">
        <h2 className="text-xs font-mono tracking-widest uppercase text-ink/40 mb-4">Print quality</h2>
        <ul className="space-y-2 text-sm font-mono text-ink/60">
          <li>Giclée pigment ink printing</li>
          <li>300gsm archival fine-art paper</li>
          <li>Fade-resistant for 100+ years</li>
          <li>Hand-inspected before dispatch</li>
        </ul>
      </div>

      <div className="mt-12 pt-8 border-t border-ink/10">
        <h2 className="text-xs font-mono tracking-widest uppercase text-ink/40 mb-4">Contact</h2>
        <a
          href="mailto:info@archiveone.studio"
          className="text-sm font-mono hover:opacity-50 transition-opacity"
        >
          info@archiveone.studio
        </a>
      </div>
    </div>
  )
}
