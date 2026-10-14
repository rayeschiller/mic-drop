import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { safeNext } from "@/lib/auth/redirect"
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(safeNext(request.nextUrl.searchParams.get("next")), request.nextUrl.origin))
  }
  return NextResponse.redirect(new URL("/login?error=invalid-link", request.nextUrl.origin))
}
