import { MOCKUP_FRAMES, MOCKUP_SIZE, photoNeedsMockups, buildMockupTargets } from '@/lib/fulfillment/artelo-mockups'

test('MOCKUP_FRAMES is the four frame styles', () => {
  expect(MOCKUP_FRAMES).toEqual(['Unframed', 'Black', 'White', 'Natural'])
})

test('photoNeedsMockups is true only when a print master URL exists', () => {
  expect(photoNeedsMockups({ printFileUrl: 'https://cdn/master.jpg' })).toBe(true)
  expect(photoNeedsMockups({ printFileUrl: undefined })).toBe(false)
  expect(photoNeedsMockups({ printFileUrl: '' })).toBe(false)
})

test('buildMockupTargets returns one target per frame at MOCKUP_SIZE', () => {
  const targets = buildMockupTargets('https://cdn/master.jpg')
  expect(targets).toHaveLength(4)
  expect(targets.map(t => t.frame)).toEqual(['Unframed', 'Black', 'White', 'Natural'])
  expect(targets.every(t => t.size === MOCKUP_SIZE)).toBe(true)
  expect(targets.every(t => t.artworkUrl === 'https://cdn/master.jpg')).toBe(true)
})
