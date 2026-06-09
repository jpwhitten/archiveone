/**
 * Global "sold out" test flag. When NEXT_PUBLIC_SOLD_OUT === 'true', every
 * print shows as sold out and checkout is blocked. Toggling on the live site
 * requires a redeploy (the value bakes at build time).
 */
export function isSoldOut(): boolean {
  return process.env.NEXT_PUBLIC_SOLD_OUT === 'true'
}
