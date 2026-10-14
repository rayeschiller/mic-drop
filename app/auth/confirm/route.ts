import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { safeNext } from "@/lib/auth/redirect"
export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get("token_hash")
  const type = request.nextUrl.searchParams.get("type")
  if (token_hash && (type === "signup" || type === "recovery" || type === "email" || type === "magiclink")) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) return NextResponse.redirect(new URL(type === "recovery" ? "/account?reset=1" : safeNext(request.nextUrl.searchParams.get("next")), request.nextUrl.origin))
  }
  return NextResponse.redirect(new URL("/login?error=invalid-link", request.nextUrl.origin))
}
