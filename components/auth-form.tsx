"use client"
import { useState } from "react"
import { authenticate, googleSignIn } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Mode = "login" | "signup" | "reset" | "password" | "magic"
export function AuthForm({ next = "/account", passwordOnly = false }: { next?: string; passwordOnly?: boolean }) {
  const [mode, setMode] = useState<Mode>(passwordOnly ? "password" : "login")
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ error?: string; message?: string }>({})
  return <div>
    <h1 className="mb-6 text-3xl font-bold">{({ login: "Welcome back", signup: "Create an account", reset: "Reset your password", password: "Update your password", magic: "Email me a sign-in link" })[mode]}</h1>
    <form onSubmit={async (event) => {
      event.preventDefault(); setBusy(true); setFeedback({})
      const form = new FormData(event.currentTarget)
      try { setFeedback(await authenticate(mode, form)) }
      catch (error) { if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error; setFeedback({ error: "Something went wrong. Please try again." }) }
      finally { setBusy(false) }
    }} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {mode === "signup" && <div><Label htmlFor="name">Name</Label><Input id="name" name="name" autoComplete="name" maxLength={100} required /></div>}
      {mode !== "password" && <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div>}
      {!["reset", "magic"].includes(mode) && <div><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" minLength={8} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} required /><p className="mt-1 text-sm text-muted-foreground">At least 8 characters.</p></div>}
      {feedback.error && <p role="alert" className="text-destructive">{feedback.error}</p>}
      {feedback.message && <p role="status">{feedback.message}</p>}
      <Button disabled={busy} className="w-full">{busy ? "Please wait…" : ({ login: "Sign in", signup: "Create account", reset: "Send reset link", password: "Save password", magic: "Send magic link" })[mode]}</Button>
    </form>
    {!passwordOnly && <form className="mt-4" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setFeedback({})
      try { setFeedback(await googleSignIn(new FormData(event.currentTarget))) }
      catch (error) { if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error; setFeedback({ error: "Unable to start Google sign-in. Please try again." }) }
      finally { setBusy(false) }
    }}><input type="hidden" name="next" value={next} /><Button variant="outline" disabled={busy} className="w-full">Continue with Google</Button></form>}
    {!passwordOnly && <div className="mt-6 flex flex-wrap gap-4 text-sm">{(["login", "signup", "magic", "reset"] as Mode[]).filter(m => m !== mode).map(m => <button key={m} disabled={busy} className="text-neon-pink hover:underline" onClick={() => { setMode(m); setFeedback({}) }}>{({ login: "Sign in", signup: "Create account", reset: "Forgot password?", password: "", magic: "Email me a sign-in link" })[m]}</button>)}</div>}
  </div>
}
