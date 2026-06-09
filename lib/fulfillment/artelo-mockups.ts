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

export type MockupRenderResult =
  | { ok: true; url: string }
  | { ok: false; error: string }

/**
 * Request a single framed mockup render from Artelo and return its image URL.
 * NOTE: endpoint/body/response confirmed against Artelo's mockup docs before go-live.
 */
export async function renderMockup(target: MockupTarget, apiKey: string): Promise<MockupRenderResult> {
  try {
    const res = await fetch('https://api.artelo.io/v1/mockups', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        artworkUrl: target.artworkUrl,
        size: target.size,
        frame: target.frame,
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return { ok: false, error: `Artelo ${res.status}: ${text.slice(0, 200)}` }
    }
    const data = await res.json().catch(() => ({})) as { url?: string; mockupUrl?: string }
    const url = data.url ?? data.mockupUrl
    if (!url) return { ok: false, error: 'No mockup URL in Artelo response' }
    return { ok: true, url }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
