import Link from "next/link"
import { AuthForm } from "@/components/auth-form"
import { safeNext } from "@/lib/auth/redirect"
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams
  return <main className="mx-auto max-w-md px-6 py-16"><Link href="/" className="mb-8 block text-neon-pink">← MicDrop</Link><div className="rounded-xl border bg-card p-6">{params.error && <p role="alert" className="mb-4 text-destructive">This link has expired or is invalid. Please request a new one.</p>}<AuthForm next={safeNext(params.next)} /></div></main>
}
