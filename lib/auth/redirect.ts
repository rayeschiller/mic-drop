export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\r\n]/.test(value)) return "/account"
  try {
    const url = new URL(value, "https://micdrop.invalid")
    return url.origin === "https://micdrop.invalid" ? url.pathname + url.search : "/account"
  } catch { return "/account" }
}

export function siteUrl(): string {
  const value = process.env.NEXT_PUBLIC_SITE_URL
  if (!value) throw new Error("NEXT_PUBLIC_SITE_URL must be configured for authentication emails.")
  return new URL(value).origin
}
