import { describe, expect, it, vi, beforeEach } from "vitest"
import { safeNext } from "@/lib/auth/redirect"
const mocks = vi.hoisted(() => ({ auth: { getUser: vi.fn(), updateUser: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn(), resetPasswordForEmail: vi.fn(), signOut: vi.fn(), signInWithOtp: vi.fn(), signInWithOAuth: vi.fn() }, redirect: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: mocks.auth }) }))
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
import { authenticate, googleSignIn } from "@/app/auth/actions"
function form(values: Record<string, string>) { const f = new FormData(); Object.entries(values).forEach(([k,v]) => f.set(k,v)); return f }
beforeEach(() => { vi.resetAllMocks(); process.env.NEXT_PUBLIC_SITE_URL = "https://staging.example.com" })
describe("authentication boundaries", () => {
  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "/\nevil.example"])("rejects external redirect %s", value => expect(safeNext(value)).toBe("/account"))
  it("preserves local destination", () => expect(safeNext("/create?from=login")).toBe("/create?from=login"))
  it("refuses password changes without a verified user", async () => {
    mocks.auth.getUser.mockResolvedValue({ data: { user: null } })
    expect(await authenticate("password", form({ password: "password123" }))).toHaveProperty("error")
    expect(mocks.auth.updateUser).not.toHaveBeenCalled()
  })
  it("does not redirect after rejected credentials", async () => {
    mocks.auth.signInWithPassword.mockResolvedValue({ error: { message: "secret backend error" } })
    const result = await authenticate("login", form({ email: "user@example.com", password: "password123" }))
    expect(result.error).not.toContain("secret backend")
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
  it("requires confirmation when signup returns no session", async () => {
    mocks.auth.signUp.mockResolvedValue({ data: { session: null }, error: null })
    expect(await authenticate("signup", form({ email: "user@example.com", password: "password123" }))).toHaveProperty("message")
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
  it("uses staging origin for reset mail", async () => {
    mocks.auth.resetPasswordForEmail.mockResolvedValue({ error: null })
    await authenticate("reset", form({ email: "user@example.com" }))
    expect(mocks.auth.resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", { redirectTo: "https://staging.example.com/auth/callback?next=/account?reset=1" })
  })
})

describe("passwordless sign-in", () => {
  it("sends magic links without requiring a password and sanitizes destinations", async () => {
    mocks.auth.signInWithOtp.mockResolvedValue({ error: null })
    const result = await authenticate("magic", form({ email: "user@example.com", next: "//evil.example" }))
    expect(result).toHaveProperty("message")
    expect(mocks.auth.signInWithOtp).toHaveBeenCalledWith({ email: "user@example.com", options: { shouldCreateUser: true, emailRedirectTo: "https://staging.example.com/auth/callback?next=%2Faccount" } })
  })
  it("does not advertise successful mail delivery when Supabase rejects it", async () => {
    mocks.auth.signInWithOtp.mockResolvedValue({ error: { message: "rate limited" } })
    expect(await authenticate("magic", form({ email: "user@example.com" }))).toHaveProperty("error")
  })
  it("handles an unconfigured Google provider without redirecting", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ external: { google: false } }) }))
    expect(await googleSignIn(form({}))).toHaveProperty("error")
    expect(mocks.auth.signInWithOAuth).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
  it("starts Google with minimal scopes and a safe callback destination", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ external: { google: true } }) }))
    mocks.auth.signInWithOAuth.mockResolvedValue({ data: { url: "https://auth.example.com/authorize" }, error: null })
    await googleSignIn(form({ next: "/account?mic=comedy" }))
    expect(mocks.auth.signInWithOAuth).toHaveBeenCalledWith({ provider: "google", options: { scopes: "openid email profile", redirectTo: "https://staging.example.com/auth/callback?next=%2Faccount%3Fmic%3Dcomedy" } })
    expect(mocks.redirect).toHaveBeenCalledWith("https://auth.example.com/authorize")
    vi.unstubAllGlobals()
  })
})
