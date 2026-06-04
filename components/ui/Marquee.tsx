export default function Marquee({ text }: { text: string }) {
  const repeated = Array(8).fill(text).join(' · ')

  return (
    <div className="overflow-hidden border-y border-ink/10 py-3 my-12">
      <div
        className="whitespace-nowrap text-sm font-mono tracking-wider"
        style={{ display: 'inline-block', animation: 'marquee 20s linear infinite' }}
      >
        {repeated}&nbsp;&nbsp;&nbsp;{repeated}
      </div>
    </div>
  )
}
