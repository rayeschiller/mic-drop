import { createAdminClient } from "@/lib/supabase/admin"
export async function stagingHealth() {
  try {
    const admin = createAdminClient()
    const [database, auth, claims, settings] = await Promise.all([
      admin.from("slots").select("id,signed_up_at", { head: true }).limit(1),
      admin.auth.admin.listUsers({ page: 1, perPage: 1 }),
      admin.from("mics").select("id,owner_user_id", { head: true }).limit(1),
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! }, cache: "no-store" }).then(r => r.ok ? r.json() : null),
    ])
    const project = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname
    const isolated = project === "phwbywnxprqtuuaqcjtk.supabase.co"
    const healthy = !database.error && !auth.error && !claims.error && isolated
    return { status: healthy ? "ok" : "unavailable", database: !database.error, auth: !auth.error, accounts: !claims.error, isolated, google: !!settings?.external?.google, email: !!settings?.external?.email, project }
  } catch { return { status: "unavailable" } }
}
