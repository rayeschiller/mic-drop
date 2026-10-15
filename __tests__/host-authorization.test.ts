import crypto from "node:crypto"
import { beforeEach, describe, expect, it, vi } from "vitest"
const mocks = vi.hoisted(() => ({ accountAccess: vi.fn(), getUser: vi.fn(), single: vi.fn(), calls: [] as Array<{ table: string; operation: string; filters: unknown[] }>, inserts: [] as Array<{ table: string; value: unknown }>, results: [] as unknown[] }))
vi.mock("@/app/account/actions", () => ({ getAccountMicAccess: mocks.accountAccess }))
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { getUser: mocks.getUser } }) }))
vi.mock("@/lib/email", () => ({ sendHostPinEmail: vi.fn(), sendNewSignupNotificationEmail: vi.fn(), sendSignupConfirmationEmail: vi.fn(), sendWaitlistConfirmationEmail: vi.fn(), sendWaitlistPromotionEmail: vi.fn() }))
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: (table: string) => {
  const call = { table, operation: "read", filters: [] as unknown[] }
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockImplementation((value: unknown) => { mocks.inserts.push({ table, value }); return chain }),
    update: vi.fn().mockImplementation(() => { call.operation = "update"; return chain }),
    eq: vi.fn().mockImplementation((...args: unknown[]) => { call.filters.push(args); return chain }),
    single: mocks.single,
    then: (resolve: (value: unknown) => unknown) => { mocks.calls.push(call); return Promise.resolve(mocks.results.shift()).then(resolve) },
  }
  return chain
} }) }))
import { createMic, verifyHostPin, getMicWithEmails, hostRemoveSlot, hostRemoveWaitlistEntry, hostUpdateMic, hostUpdateSeriesMics } from "@/app/actions"
const hash = crypto.createHash("sha256").update("123456").digest("hex")
beforeEach(() => { vi.resetAllMocks(); mocks.calls.length = 0; mocks.inserts.length = 0; mocks.results.length = 0; mocks.accountAccess.mockResolvedValue(false) })
describe("host authorization at server-action boundaries", () => {
  it("lets a verified account owner manage a mic without supplying a PIN", async () => {
    mocks.accountAccess.mockResolvedValue(true)
    expect(await verifyHostPin("comedy", "")).toEqual({ success: true })
    expect(mocks.single).not.toHaveBeenCalled()
  })
  it("preserves guest host access with the correct PIN", async () => {
    mocks.single.mockResolvedValue({ data: { host_pin_hash: hash } })
    expect(await verifyHostPin("comedy", "123456")).toEqual({ success: true })
  })
  it.each(["", "000000", "__account__", "undefined"])("does not accept non-owner bypass PIN %s", async pin => {
    mocks.single.mockResolvedValue({ data: { host_pin_hash: hash } })
    expect((await verifyHostPin("comedy", pin)).success).toBe(false)
  })
  it("rejects nonexistent mics", async () => {
    mocks.single.mockResolvedValue({ data: null })
    expect((await verifyHostPin("absent", "123456")).success).toBe(false)
  })
  it("does not return performer emails to an unauthorized caller", async () => {
    mocks.single.mockResolvedValue({ data: { host_pin_hash: hash } })
    expect(await getMicWithEmails("comedy", "000000")).toEqual({ mic: null, error: "Unauthorized" })
    expect(mocks.single).toHaveBeenCalledOnce()
  })
  it("independently rejects unauthorized slot removal, waitlist removal, mic editing, and series editing", async () => {
    mocks.single.mockResolvedValue({ data: { host_pin_hash: hash } })
    const results = await Promise.all([
      hostRemoveSlot("comedy", "000000", 1),
      hostRemoveWaitlistEntry("comedy", "000000", "entry-1"),
      hostUpdateMic("comedy", "000000", { name: "attacker edit", venue: "test", date: "2026-12-01" }),
      hostUpdateSeriesMics("comedy", "000000", "another-series", { name: "attacker edit", venue: "test" }),
    ])
    results.forEach(result => expect(result).toEqual({ success: false, error: "Unauthorized" }))
    expect(mocks.calls).toEqual([])
  })
  it("scopes PIN-authorized series reads and writes to that PIN", async () => {
    mocks.single.mockResolvedValue({ data: { host_pin_hash: hash } })
    mocks.results.push({ data: [{ id: "mic-1", slug: "comedy", total_slots: 5 }] }, { error: null })
    expect(await hostUpdateSeriesMics("comedy", "123456", "weekly", { name: "updated", venue: "test" })).toEqual({ success: true })
    expect(mocks.calls).toHaveLength(2)
    mocks.calls.forEach(call => {
      expect(call.filters).toContainEqual(["series_slug", "weekly"])
      expect(call.filters).toContainEqual(["host_pin_hash", hash])
    })
  })
  it("scopes account-authorized series reads and writes to the verified account", async () => {
    mocks.accountAccess.mockResolvedValue(true)
    mocks.getUser.mockResolvedValue({ data: { user: { id: "owner-1" } } })
    mocks.results.push({ data: [{ id: "mic-1", slug: "comedy", total_slots: 5 }] }, { error: null })
    expect(await hostUpdateSeriesMics("comedy", "", "weekly", { name: "updated", venue: "test" })).toEqual({ success: true })
    expect(mocks.calls).toHaveLength(2)
    mocks.calls.forEach(call => expect(call.filters).toContainEqual(["owner_user_id", "owner-1"]))
  })
  it("fails closed when an owner's session expires during an operation", async () => {
    mocks.accountAccess.mockResolvedValue(true)
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    expect(await hostUpdateSeriesMics("comedy", "", "weekly", { name: "updated", venue: "test" })).toEqual({ success: false, error: "Unauthorized" })
    expect(mocks.calls).toEqual([])
  })
})

describe("new mic account ownership", () => {
  const mic = { name: "QA mic", venue: "Test venue", date: "2026-11-01", sections: [{ startTime: "19:00", slots: 1 }], notes: "", hostEmail: "", slug: "qa-new-mic", owner_user_id: "client-injected-user" }
  it("automatically attaches a new mic to the verified account", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id: "verified-owner" } } })
    mocks.single.mockResolvedValueOnce({ data: { id: "mic-1" } }).mockResolvedValueOnce({ data: { id: "section-1" } })
    mocks.results.push({ error: null })
    expect((await createMic(mic)).success).toBe(true)
    expect(mocks.inserts.find(item => item.table === "mics")?.value).toMatchObject({ owner_user_id: "verified-owner" })
  })
  it("keeps guest mics unclaimed and ignores injected ownership", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    mocks.single.mockResolvedValueOnce({ data: { id: "mic-1" } }).mockResolvedValueOnce({ data: { id: "section-1" } })
    mocks.results.push({ error: null })
    expect((await createMic(mic)).success).toBe(true)
    expect(mocks.inserts.find(item => item.table === "mics")?.value).toMatchObject({ owner_user_id: null })
  })
})
