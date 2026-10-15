import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
const auth = vi.hoisted(() => ({ exchangeCodeForSession: vi.fn(), verifyOtp: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth }) }))
import { GET as callback } from "@/app/auth/callback/route"
import { GET as confirm } from "@/app/auth/confirm/route"
const origin = "https://staging.example.com"
function request(path: string) { return new NextRequest(origin + path) }
beforeEach(() => vi.resetAllMocks())
describe("OAuth and password-reset callbacks", () => {
  it("exchanges the code and returns to enrollment", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: null })
    const response = await callback(request("/auth/callback?code=test-code&next=%2Faccount%3Fmic%3Dcomedy"))
    expect(response.headers.get("location")).toBe(origin + "/account?mic=comedy")
    expect(auth.exchangeCodeForSession).toHaveBeenCalledWith("test-code")
  })
  it("refuses expired or replayed codes", async () => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: { message: "invalid grant" } })
    expect((await callback(request("/auth/callback?code=used"))).headers.get("location")).toBe(origin + "/login?error=invalid-link")
  })
  it("handles a cancelled Google consent flow", async () => {
    expect((await callback(request("/auth/callback?error=access_denied"))).headers.get("location")).toBe(origin + "/login?error=invalid-link")
    expect(auth.exchangeCodeForSession).not.toHaveBeenCalled()
  })
  it.each(["https://evil.example", "//evil.example", "/\\evil.example"])("blocks an external callback destination %s", async next => {
    auth.exchangeCodeForSession.mockResolvedValue({ error: null })
    const response = await callback(request("/auth/callback?code=valid&next=" + encodeURIComponent(next)))
    expect(response.headers.get("location")).toBe(origin + "/account")
  })
})
describe("email token confirmation", () => {
  it.each(["email", "magiclink", "signup"])("validates %s tokens before signing in", async type => {
    auth.verifyOtp.mockResolvedValue({ error: null })
    const response = await confirm(request(`/auth/confirm?token_hash=one-time-hash&type=${type}`))
    expect(auth.verifyOtp).toHaveBeenCalledWith({ token_hash: "one-time-hash", type })
    expect(response.headers.get("location")).toBe(origin + "/account")
  })
  it("routes recovery tokens to password reset", async () => {
    auth.verifyOtp.mockResolvedValue({ error: null })
    expect((await confirm(request("/auth/confirm?token_hash=hash&type=recovery&next=https://evil.example"))).headers.get("location")).toBe(origin + "/account?reset=1")
  })
  it.each(["/auth/confirm", "/auth/confirm?type=email", "/auth/confirm?token_hash=hash&type=invite", "/auth/confirm?token_hash=hash&type=invalid"])("rejects malformed confirmation %s", async path => {
    expect((await confirm(request(path))).headers.get("location")).toBe(origin + "/login?error=invalid-link")
    expect(auth.verifyOtp).not.toHaveBeenCalled()
  })
  it("does not establish a session for expired or replayed email tokens", async () => {
    auth.verifyOtp.mockResolvedValue({ error: { message: "expired" } })
    expect((await confirm(request("/auth/confirm?token_hash=old&type=email"))).headers.get("location")).toBe(origin + "/login?error=invalid-link")
  })
})
