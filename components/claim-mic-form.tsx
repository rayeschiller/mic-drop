"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { claimMic } from "@/app/account/actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
export function ClaimMicForm({ initialMic = "" }: { initialMic?: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ error?: string; message?: string }>({})
  return <section className="my-8 rounded-xl border bg-card p-6"><h2 className="mb-2 text-xl font-bold">Save an existing mic</h2><p className="mb-4 text-sm text-muted-foreground">Already have a host PIN? Add your mic to this account, then manage it without entering your PIN again. Each date can be saved separately.</p><form className="space-y-4" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setFeedback({})
    const element = event.currentTarget
    try { const result = await claimMic(new FormData(element)); setFeedback(result); if (!result.error) { element.reset(); router.refresh() } }
    catch { setFeedback({ error: "Unable to save your mic. Please try again." }) }
    finally { setBusy(false) }
  }}><div><Label htmlFor="mic">Mic URL or slug</Label><Input id="mic" name="mic" defaultValue={initialMic} placeholder="https://micdrop.site/your-mic" required maxLength={500} /></div><div><Label htmlFor="host-pin">Host PIN</Label><Input id="host-pin" name="pin" type="password" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} autoComplete="off" required /></div>{feedback.error && <p role="alert" className="text-destructive">{feedback.error}</p>}{feedback.message && <p role="status">{feedback.message}</p>}<Button disabled={busy}>{busy ? "Saving…" : "Save mic to my account"}</Button></form></section>
}
