import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { signOut } from "@/app/auth/actions"
import { AuthForm } from "@/components/auth-form"
import { Button } from "@/components/ui/button"
export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/account")
  return <main className="mx-auto max-w-lg px-6 py-16"><Link href="/" className="text-neon-pink">← MicDrop</Link><h1 className="mt-8 text-3xl font-bold">Your account</h1><p className="my-4">Signed in as {user.email}</p><div className="mb-8 flex gap-4"><Link href="/create"><Button>Host a Mic</Button></Link><form action={signOut}><Button variant="outline">Sign out</Button></form></div><div className="rounded-xl border bg-card p-6"><AuthForm passwordOnly /></div></main>
}
