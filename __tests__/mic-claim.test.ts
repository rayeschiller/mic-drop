import crypto from "node:crypto"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { claimSlug, validClaimPin } from "@/lib/auth/mic-claim"
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), rpc: vi.fn(), maybeSingle: vi.fn(), update: vi.fn(), eq: vi.fn(), is: vi.fn(), revalidate: vi.fn() }))
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser } }) }))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => {
  const chain = { select: vi.fn().mockReturnThis(), eq: mocks.eq.mockReturnThis(), is: mocks.is.mockReturnThis(), maybeSingle: mocks.maybeSingle, update: mocks.update.mockReturnThis() }
  return { rpc: mocks.rpc, from: () => chain }
} }))
import { claimMic, getAccountMicAccess } from "@/app/account/actions"
const hash = crypto.createHash("sha256").update("123456").digest("hex")
function form(pin = "123456") { const value = new FormData(); value.set("mic", "https://micdrop.site/comedy-night"); value.set("pin", pin); return value }
beforeEach(() => { vi.resetAllMocks(); mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } }); mocks.rpc.mockResolvedValue({ data: true, error: null }) })
describe("PIN enrollment", () => {
  it("extracts a slug from a mic URL", () => expect(claimSlug("https://micdrop.site/comedy-night?x=1")).toBe("comedy-night"))
  it.each(["../account", "a/b", "", "https://example.com/a/b"])("rejects invalid mic path %s", input => expect(claimSlug(input)).toBeNull())
  it("uses a constant-time hash check and refuses malformed hashes", () => {
    expect(validClaimPin("123456", hash)).toBe(true)
    expect(validClaimPin("123457", hash)).toBe(false)
    expect(validClaimPin("123456", "bad")).toBe(false)
  })
  it("requires authenticated enrollment", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    expect(await claimMic(form())).toHaveProperty("error")
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it("enforces persistent attempt limits before reading a PIN hash", async () => {
    mocks.rpc.mockResolvedValue({ data: false })
    expect(await claimMic(form())).toHaveProperty("error")
    expect(mocks.maybeSingle).not.toHaveBeenCalled()
  })
  it("does not write ownership after an incorrect PIN", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: "mic-1", host_pin_hash: hash, owner_user_id: null } })
    expect(await claimMic(form("111111"))).toHaveProperty("error")
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it("does not transfer an already claimed mic even with the correct PIN", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: "mic-1", host_pin_hash: hash, owner_user_id: "someone-else" } })
    expect(await claimMic(form())).toHaveProperty("error")
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it("enrolls the series with verified server identity and a verified PIN hash", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: "mic-1", host_pin_hash: hash, owner_user_id: null } })
    mocks.rpc.mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ data: [{ saved_count: 6, already_linked_count: 0, skipped_count: 0 }] })
    expect((await claimMic(form())).message).toContain("6 recurring dates")
    expect(mocks.rpc).toHaveBeenNthCalledWith(2, "claim_mic_series", { p_mic_id: "mic-1", p_user_id: "user-1", p_pin_hash: hash })
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it("can enroll remaining series dates when the main date is already owned", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: "mic-1", host_pin_hash: hash, owner_user_id: "user-1" } })
    mocks.rpc.mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ data: [{ saved_count: 5, already_linked_count: 1, skipped_count: 0 }] })
    expect((await claimMic(form())).message).toContain("6 recurring dates")
  })
  it("reports dates linked to other accounts without transferring them", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: "mic-1", host_pin_hash: hash, owner_user_id: null } })
    mocks.rpc.mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ data: [{ saved_count: 4, already_linked_count: 0, skipped_count: 2 }] })
    expect((await claimMic(form())).message).toContain("2 date(s) already linked to another account were left alone")
  })
  it("fails safely when a conflicting claim wins", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: "mic-1", host_pin_hash: hash, owner_user_id: null } })
    mocks.rpc.mockResolvedValueOnce({ data: true }).mockResolvedValueOnce({ data: null, error: { message: "already claimed" } })
    expect(await claimMic(form())).toHaveProperty("error")
  })
  it("checks account host access against the verified owner", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: "mic-1" } })
    expect(await getAccountMicAccess("comedy-night")).toBe(true)
    expect(mocks.eq).toHaveBeenCalledWith("owner_user_id", "user-1")
  })
})
