import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
export async function AccountLink() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return <Link className="text-sm font-medium hover:text-neon-pink" href={user ? "/account" : "/login"}>{user ? "My account" : "Sign in"}</Link>
}
