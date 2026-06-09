export type MockupFrame = 'Unframed' | 'Black' | 'White' | 'Natural'

export const MOCKUP_FRAMES: MockupFrame[] = ['Unframed', 'Black', 'White', 'Natural']
export const MOCKUP_SIZE = 'A2'

export interface MockupTarget {
  size: string
  frame: MockupFrame
  artworkUrl: string
}

export function photoNeedsMockups(photo: { printFileUrl?: string | null }): boolean {
  return Boolean(photo.printFileUrl)
}

export function buildMockupTargets(artworkUrl: string): MockupTarget[] {
  return MOCKUP_FRAMES.map(frame => ({ size: MOCKUP_SIZE, frame, artworkUrl }))
}
