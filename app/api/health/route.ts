import { NextResponse } from "next/server"
import { stagingHealth } from "@/lib/staging-health"
export const dynamic = "force-dynamic"
export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") return new NextResponse(null, { status: 404 })
  const result = await stagingHealth()
  return NextResponse.json(result, { status: result.status === "ok" ? 200 : 503, headers: { "Cache-Control": "no-store" } })
}
