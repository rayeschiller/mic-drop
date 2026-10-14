import crypto from "node:crypto"
export function claimSlug(value: string): string | null {
  let slug = value.trim().toLowerCase()
  if (/^https?:\/\//.test(slug)) {
    try { slug = new URL(slug).pathname.replace(/^\/|\/$/g, "") } catch { return null }
  }
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 120 ? slug : null
}
export function validClaimPin(pin: string, storedHash: string | null): boolean {
  if (!/^\d{6}$/.test(pin) || !storedHash || !/^[a-f0-9]{64}$/i.test(storedHash)) return false
  const hash = crypto.createHash("sha256").update(pin).digest()
  return crypto.timingSafeEqual(hash, Buffer.from(storedHash, "hex"))
}
