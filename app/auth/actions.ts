"use server"

import { createClient } from "@/lib/supabase/server"
import { safeNext, siteUrl } from "@/lib/auth/redirect"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export type AuthResult = { error?: string; message?: string }
export async function authenticate(mode: string, form: FormData): Promise<AuthResult> {
  if (!["login", "signup", "reset", "password"].includes(mode)) return { error: "Invalid request." }
  const email = String(form.get("email") ?? "").trim()
  const password = String(form.get("password") ?? "")
  const next = safeNext(String(form.get("next") ?? ""))
  if (mode !== "password" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address." }
  if (mode !== "reset" && (password.length < 8 || password.length > 128)) return { error: "Use a password with 8–128 characters." }
  const supabase = await createClient()
  if (mode === "reset") {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/auth/callback?next=/account?reset=1` })
    if (error) return { error: "Unable to request a reset. Please try again later." }
    return { message: "If an account exists for that email, a password reset link is on its way." }
  }
  if (mode === "signup") {
    const name = String(form.get("name") ?? "").trim().slice(0, 100)
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { display_name: name }, emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}` } })
    if (error) return { error: "Unable to create an account. Please try again or sign in." }
    if (!data.session) return { message: "Check your email to confirm your account, then sign in." }
  } else if (mode === "password") {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Open your password reset link or sign in first." }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { error: "Unable to update your password. Request a new link and try again." }
    return { message: "Your password has been updated." }
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: "Unable to sign in. Check your email and password, and confirm your email first." }
  }
  revalidatePath("/", "layout")
  redirect(next)
}

export async function signOut() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error("Unable to sign out. Please try again.")
  revalidatePath("/", "layout")
  redirect("/")
}
