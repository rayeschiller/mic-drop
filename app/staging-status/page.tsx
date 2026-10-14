import Link from "next/link"
import { notFound } from "next/navigation"
import { stagingHealth } from "@/lib/staging-health"
export const dynamic = "force-dynamic"
export default async function StagingStatusPage() {
  if (process.env.VERCEL_ENV !== "preview") notFound()
  const result = await stagingHealth()
  return <main className="mx-auto max-w-lg px-6 py-16"><h1 className="text-3xl font-bold">MicDrop staging status</h1><p className="my-6">{result.status === "ok" ? "Staging is connected." : "Staging needs attention."}</p><ul className="space-y-2">{[["Separate staging database",result.isolated],["Database access",result.database],["Account authentication",result.auth],["Mic ownership schema",result.accounts],["Email sign-in",result.email],["Google sign-in",result.google]].map(([name,ready]) => <li key={String(name)}>{name}: <strong>{ready ? "Ready" : "Needs setup"}</strong></li>)}</ul>{result.project && <p className="my-6 text-sm text-muted-foreground">Database: {result.project}</p>}<Link className="text-neon-pink" href="/login">Open sign-in →</Link></main>
}
