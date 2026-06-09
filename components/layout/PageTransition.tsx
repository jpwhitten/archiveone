'use client'

import { usePathname } from 'next/navigation'

// Re-mounts on route change (keyed by pathname) so the fade-up animation
// replays on every navigation. Subtle premium polish, no dependencies.
export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return (
    <div key={pathname} className="animate-page-in">
      {children}
    </div>
  )
}
