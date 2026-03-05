"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, Check, X, Loader2 } from "lucide-react"
import { createMic, checkSlugAvailability } from "@/app/actions"

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid"

export function CreateMicForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    venue: "",
    date: "",
    startTime: "",
    endTime: "",
    slots: 10,
    notes: "",
    hostEmail: "",
  })

  const [slug, setSlug] = useState("")
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("idle")
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [createdPin, setCreatedPin] = useState<string | null>(null)
  const [createdSlug, setCreatedSlug] = useState<string | null>(null)

  // Auto-derive slug from name unless user has manually edited it
  useEffect(() => {
    if (slugManuallyEdited) return
    setSlug(toSlug(formData.name))
    setSlugStatus("idle")
  }, [formData.name, slugManuallyEdited])

  const checkSlug = useCallback((value: string) => {
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current)

    if (value.length < 3) {
      setSlugStatus(value.length === 0 ? "idle" : "invalid")
      return
    }

    setSlugStatus("checking")
    checkTimeoutRef.current = setTimeout(async () => {
      const { available } = await checkSlugAvailability(value)
      setSlugStatus(available ? "available" : "taken")
    }, 500)
  }, [])

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = toSlug(e.target.value)
    setSlug(sanitized)
    setSlugManuallyEdited(true)
    checkSlug(sanitized)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (slugStatus === "taken") {
      setSubmitError("That URL is already taken. Choose a different one.")
      return
    }
    setIsSubmitting(true)
    setSubmitError(null)

    const result = await createMic({ ...formData, slug: slug || undefined, hostEmail: formData.hostEmail || undefined })

    if (!result.success || !result.slug || !result.hostPin) {
      setSubmitError(result.error || "Something went wrong. Try again.")
      setIsSubmitting(false)
      return
    }

    setCreatedPin(result.hostPin)
    setCreatedSlug(result.slug)
    setIsSubmitting(false)
  }

  if (createdPin && createdSlug) {
    return (
      <div className="space-y-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neon-green/20 mx-auto">
          <Sparkles className="h-8 w-8 text-neon-green" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Your mic is live.</h2>
          <p className="mt-2 text-muted-foreground">
            Save your host PIN somewhere safe. You{"'"}ll need it to edit or manage the page.
          </p>
        </div>
        <div className="rounded-xl border-2 border-primary bg-card p-6 space-y-1">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Your Host PIN</p>
          <p className="text-4xl font-mono font-bold text-primary tracking-[0.3em]">{createdPin}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Don{"'"}t share this. It{"'"}s the only way to prove you{"'"}re the host.
          </p>
        </div>
        {submitError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {submitError}
          </div>
        )}
        <Button
          onClick={() => router.push(`/${createdSlug}`)}
          className="w-full h-14 text-xl font-bold bg-neon-pink text-primary-foreground hover:bg-neon-pink/90 transition-all duration-200 hover:shadow-[0_0_30px_rgba(236,72,153,0.5)]"
        >
          Go to Your Mic Page
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-lg font-bold">
          Mic Name <span className="text-neon-pink">*</span>
        </Label>
        <Input
          id="name"
          placeholder='e.g. "Sad Clown Tuesday"'
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          className="h-12 text-lg border-border bg-secondary/50 focus:border-neon-pink placeholder:text-muted-foreground/50"
        />
      </div>

      {/* Custom Slug */}
      <div className="space-y-2">
        <Label htmlFor="slug" className="text-lg font-bold">
          Page URL
        </Label>
        <div className="relative">
          <div className="flex items-center rounded-md border border-border bg-secondary/50 focus-within:border-neon-pink overflow-hidden h-12">
            <input
              id="slug"
              value={slug}
              onChange={handleSlugChange}
              placeholder="your-mic-name"
              className="flex-1 h-full bg-transparent text-base outline-none px-3 pr-10"
            />
            <div className="absolute right-3 flex items-center">
              {slugStatus === "checking" && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {slugStatus === "available" && (
                <Check className="h-4 w-4 text-neon-green" />
              )}
              {slugStatus === "taken" && (
                <X className="h-4 w-4 text-destructive" />
              )}
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {slugStatus === "taken" && (
            <span className="text-destructive">That URL is already taken. Try something else.</span>
          )}
          {slugStatus === "invalid" && (
            <span className="text-destructive">Must be at least 3 characters.</span>
          )}
          {slugStatus === "available" && (
            <span className="text-neon-green">Looks good — that URL is available.</span>
          )}
          {(slugStatus === "idle" || slugStatus === "checking") && (
            <>This becomes the link you share: <code className="text-foreground">/{slug || "your-mic-name"}</code>. Auto-filled from the mic name but you can customize it.</>
          )}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="venue" className="text-lg font-bold">
          Venue <span className="text-neon-pink">*</span>
        </Label>
        <Input
          id="venue"
          placeholder="Where is this happening?"
          value={formData.venue}
          onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
          required
          className="h-12 text-lg border-border bg-secondary/50 focus:border-neon-pink placeholder:text-muted-foreground/50"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date" className="text-lg font-bold">
          Date <span className="text-neon-pink">*</span>
        </Label>
        <Input
          id="date"
          type="date"
          value={formData.date}
          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
          required
          className="h-12 text-lg border-border bg-secondary/50 focus:border-neon-pink"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startTime" className="text-lg font-bold">
            Start Time <span className="text-neon-pink">*</span>
          </Label>
          <Input
            id="startTime"
            type="time"
            value={formData.startTime}
            onChange={(e) =>
              setFormData({ ...formData, startTime: e.target.value })
            }
            required
            className="h-12 text-lg border-border bg-secondary/50 focus:border-neon-pink"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endTime" className="text-lg font-bold">
            End Time
          </Label>
          <Input
            id="endTime"
            type="time"
            value={formData.endTime}
            onChange={(e) =>
              setFormData({ ...formData, endTime: e.target.value })
            }
            className="h-12 text-lg border-border bg-secondary/50 focus:border-neon-pink"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="slots" className="text-lg font-bold">
          Number of Slots <span className="text-neon-pink">*</span>
        </Label>
        <Input
          id="slots"
          type="number"
          min={1}
          max={50}
          value={formData.slots}
          onChange={(e) =>
            setFormData({ ...formData, slots: parseInt(e.target.value) || 1 })
          }
          required
          className="h-12 text-lg border-border bg-secondary/50 focus:border-neon-pink"
        />
        <p className="text-sm text-muted-foreground">
          How many brave souls can sign up?
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hostEmail" className="text-lg font-bold">
          Your Email
        </Label>
        <Input
          id="hostEmail"
          type="email"
          placeholder="you@example.com"
          value={formData.hostEmail}
          onChange={(e) => setFormData({ ...formData, hostEmail: e.target.value })}
          className="h-12 text-lg border-border bg-secondary/50 focus:border-neon-pink placeholder:text-muted-foreground/50"
        />
        <p className="text-sm text-muted-foreground">
          We{"'"}ll email you your host PIN so you don{"'"}t lose it. Optional but recommended.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes" className="text-lg font-bold">
          Notes
        </Label>
        <Textarea
          id="notes"
          placeholder='e.g. "5 mins each, no crowd work, bring your own tears"'
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="min-h-24 border-border bg-secondary/50 focus:border-neon-pink placeholder:text-muted-foreground/50"
        />
        <p className="text-sm text-muted-foreground">
          Supports markdown — <code>**bold**</code>, <code>[link text](https://url.com)</code>, etc.
        </p>
      </div>

      {submitError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {submitError}
        </div>
      )}

      <Button
        type="submit"
        disabled={isSubmitting || slugStatus === "taken" || slugStatus === "invalid"}
        className="w-full h-14 text-xl font-bold bg-neon-pink text-primary-foreground hover:bg-neon-pink/90 transition-all duration-200 hover:shadow-[0_0_30px_rgba(236,72,153,0.5)]"
      >
        {isSubmitting ? (
          "Creating..."
        ) : (
          <>
            <Sparkles className="mr-2 h-5 w-5" />
            Generate Mic Page
          </>
        )}
      </Button>
    </form>
  )
}
