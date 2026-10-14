import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ClaimMicForm } from "@/components/claim-mic-form"
import { signOut } from "@/app/auth/actions"
import { AuthForm } from "@/components/auth-form"
import { Button } from "@/components/ui/button"
export default async function AccountPage({ searchParams }: { searchParams: Promise<{ mic?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=${encodeURIComponent(params.mic ? `/account?mic=${encodeURIComponent(params.mic)}` : "/account")}`)
  const admin = createAdminClient()
  const { data: mics, error } = await admin.from("mics").select("id,slug,name,venue,date").eq("owner_user_id", user.id).order("date", { ascending: false })
  return <main className="mx-auto max-w-lg px-6 py-16"><Link href="/" className="text-neon-pink">← MicDrop</Link><h1 className="mt-8 text-3xl font-bold">Your account</h1><p className="my-4">Signed in as {user.email}</p><div className="mb-8 flex gap-4"><Link href="/create"><Button>Host a Mic</Button></Link><form action={signOut}><Button variant="outline">Sign out</Button></form></div><section className="my-8"><h2 className="text-xl font-bold">Your mics</h2>{error ? <p role="alert">Unable to load your mics. Please try again.</p> : !mics?.length ? <p className="mt-2 text-muted-foreground">Your saved mics will appear here.</p> : <ul className="mt-4 space-y-3">{mics.map(mic => <li key={mic.id}><Link className="block rounded-lg border p-4 hover:border-neon-pink" href={`/${mic.slug}`}><strong>{mic.name}</strong><p className="text-sm text-muted-foreground">{mic.venue} · {mic.date}</p><span className="text-neon-pink">Manage mic →</span></Link></li>)}</ul>}</section><ClaimMicForm initialMic={params.mic} /><div className="rounded-xl border bg-card p-6"><AuthForm passwordOnly /></div></main>
}
