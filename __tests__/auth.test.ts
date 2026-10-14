import { describe, expect, it, vi, beforeEach } from "vitest"
import { safeNext } from "@/lib/auth/redirect"
const mocks = vi.hoisted(() => ({ auth: { getUser: vi.fn(), updateUser: vi.fn(), signInWithPassword: vi.fn(), signUp: vi.fn(), resetPasswordForEmail: vi.fn(), signOut: vi.fn() }, redirect: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: mocks.auth }) }))
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
import { authenticate } from "@/app/auth/actions"
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
