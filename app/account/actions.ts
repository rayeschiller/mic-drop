"use server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { claimSlug, validClaimPin } from "@/lib/auth/mic-claim"
import { revalidatePath } from "next/cache"

export async function getAccountMicAccess(slug: string): Promise<boolean> {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return false
  const admin = createAdminClient()
  const { data, error } = await admin.from("mics").select("id").eq("slug", slug).eq("owner_user_id", user.id).maybeSingle()
  return !error && !!data
}

export async function claimMic(form: FormData): Promise<{ error?: string; message?: string }> {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) return { error: "Sign in before saving a mic to your account." }
  const slug = claimSlug(String(form.get("mic") ?? ""))
  const pin = String(form.get("pin") ?? "")
  if (!slug || !/^\d{6}$/.test(pin)) return { error: "Enter a mic URL or slug and its six-digit host PIN." }
  const admin = createAdminClient()
  const { data: allowed, error: limitError } = await admin.rpc("consume_mic_claim_attempt", { p_user_id: user.id })
  if (limitError || allowed !== true) return { error: "Too many attempts. Please try again in an hour." }
  const { data: mic, error } = await admin.from("mics").select("id,owner_user_id,host_pin_hash").eq("slug", slug).maybeSingle()
  if (error || !mic || !validClaimPin(pin, mic.host_pin_hash)) return { error: "Mic or host PIN is incorrect." }
  if (mic.owner_user_id && mic.owner_user_id !== user.id) return { error: "This mic is already linked to another account." }
  // The database operation atomically enrolls unclaimed recurring dates with
  // this series and verified PIN. It never transfers another account's dates.
  const { data: result, error: saveError } = await admin.rpc("claim_mic_series", {
    p_mic_id: mic.id, p_user_id: user.id, p_pin_hash: mic.host_pin_hash,
  })
  const summary = result?.[0]
  if (saveError || !summary) return { error: "Unable to save this mic. Refresh and try again." }
  revalidatePath("/account")
  revalidatePath("/", "layout")
  const total = summary.saved_count + summary.already_linked_count
  let message = total > 1
    ? summary.saved_count
      ? `Saved ${total} recurring dates to your account. You can manage them without entering the PIN.`
      : `All ${total} recurring dates are already saved to your account.`
    : "Mic saved. You can now manage it from your account without entering the PIN."
  if (summary.skipped_count) message += ` ${summary.skipped_count} date(s) already linked to another account were left alone.`
  return { message }
}
