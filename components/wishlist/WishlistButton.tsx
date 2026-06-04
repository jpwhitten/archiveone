'use client'

export default function WishlistButton({ photoId, photoSlug }: { photoId: string; photoSlug: string }) {
  return (
    <button
      className="w-9 h-9 bg-paper/80 backdrop-blur-sm flex items-center justify-center hover:bg-paper transition-colors"
      aria-label="Save to wishlist"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  )
}
