import { beforeEach, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"
const mocks = vi.hoisted(() => ({ create: vi.fn(), claims: vi.fn() }))
vi.mock("@supabase/ssr", () => ({ createServerClient: mocks.create }))
import { updateSession } from "@/lib/supabase/middleware"
beforeEach(() => { vi.resetAllMocks(); process.env.NEXT_PUBLIC_SUPABASE_URL = "https://staging.supabase.co"; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-test-key" })
it("verifies token claims, propagates refreshed cookies, and prevents shared caching", async () => {
  const request = new NextRequest("https://staging.example.com/account", { headers: { cookie: "sb-session=old" } })
  mocks.create.mockImplementation((_url, _key, options) => ({ auth: { getClaims: async () => {
    mocks.claims(); expect(options.cookies.getAll()).toEqual([{ name: "sb-session", value: "old" }])
    options.cookies.setAll([{ name: "sb-session", value: "new", options: { path: "/", httpOnly: true, secure: true } }])
    return { data: { claims: { sub: "test-user" } }, error: null }
  } } }))
  const response = await updateSession(request)
  expect(mocks.claims).toHaveBeenCalledOnce()
  expect(request.cookies.get("sb-session")?.value).toBe("new")
  expect(response.cookies.get("sb-session")?.value).toBe("new")
  expect(response.cookies.get("sb-session")?.httpOnly).toBe(true)
  expect(response.headers.get("cache-control")).toBe("private, no-store")
})
it("never makes anonymous pages publicly cacheable", async () => {
  mocks.create.mockReturnValue({ auth: { getClaims: async () => ({ data: null, error: { message: "No session" } }) } })
  const response = await updateSession(new NextRequest("https://staging.example.com/login"))
  expect(response.headers.get("cache-control")).toBe("private, no-store")
})
