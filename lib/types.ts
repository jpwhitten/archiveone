export interface SanityImage {
  _type: 'image'
  asset: { _ref: string; _type: 'reference' }
  hotspot?: { x: number; y: number }
}

export interface PrintVariant {
  _key: string
  size: 'A4' | 'A3' | 'A2' | 'A1'
  frame: 'Unframed' | 'Black' | 'White' | 'Natural'
  price: number
  stripePriceId: string
}

export interface Collection {
  _id: string
  title: string
  slug: { current: string }
  description?: string
  coverPhoto?: Photo
}

export interface Photo {
  _id: string
  title: string
  slug: { current: string }
  image: SanityImage
  description?: string
  location?: string
  collections?: Collection[]
  featured: boolean
  forSale: boolean
  editionSize?: number
  editionSold: number
  variants?: PrintVariant[]
  mockupImages?: SanityImage[]
}

export interface CartItem {
  photoId: string
  photoTitle: string
  photoSlug: string
  photoImage: SanityImage
  size: PrintVariant['size']
  frame: PrintVariant['frame']
  price: number
  stripePriceId: string
}

export function cartItemKey(item: Pick<CartItem, 'photoId' | 'size' | 'frame'>): string {
  return `${item.photoId}-${item.size}-${item.frame}`
}
