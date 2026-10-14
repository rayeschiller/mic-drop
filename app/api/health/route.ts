import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"
export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") return new NextResponse(null, { status: 404 })
  const headers = { "Cache-Control": "no-store" }
  try {
    const admin = createAdminClient()
    const [database, auth] = await Promise.all([
      admin.from("slots").select("id,signed_up_at", { head: true }).limit(1),
      admin.auth.admin.listUsers({ page: 1, perPage: 1 }),
    ])
    const healthy = !database.error && !auth.error
    return NextResponse.json({ status: healthy ? "ok" : "unavailable", database: !database.error, auth: !auth.error, project: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname }, { status: healthy ? 200 : 503, headers })
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers })
  }
}
