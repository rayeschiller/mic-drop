import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
const html = readFileSync(new URL("../supabase/templates/magic_link.html", import.meta.url), "utf8")
describe("MicDrop sign-in email", () => {
  it("preserves the token-hash callback and email verification type", () => {
    expect(html).toContain('{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email')
    const rendered = html.replaceAll("{{ .SiteURL }}", "https://staging.example.com").replaceAll("{{ .TokenHash }}", "one-time-test-hash").replaceAll("&amp;", "&")
    const signInHref = rendered.match(/href="([^"]*token_hash[^"]*)"/)?.[1]
    expect(signInHref).toBeTruthy()
    const link = new URL(signInHref!)
    expect(link.origin).toBe("https://staging.example.com")
    expect(link.pathname).toBe("/auth/confirm")
    expect(link.searchParams.get("token_hash")).toBe("one-time-test-hash")
    expect(link.searchParams.get("type")).toBe("email")
  })
  it("includes clear signing-in copy and both requested removals", () => {
    expect(html).toContain("Sign in to MicDrop")
    expect(html).toContain("one-time link")
    expect(html).not.toContain("BACK ON THE LIST")
    expect(html).not.toMatch(/brain space/i)
  })
  it("uses mobile-friendly inline styles and no external tracking or scripts", () => {
    expect(html).toContain('name="viewport"')
    expect(html).toContain('role="presentation"')
    expect(html).toContain("max-width:480px")
    expect(html).not.toMatch(/<script|<iframe|<form|<img|onclick=/i)
    expect(html).not.toMatch(/https?:\/\//)
  })
})
