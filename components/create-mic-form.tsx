"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, Check, X, Loader2, Plus, Trash2, RepeatIcon } from "lucide-react"
import { createMic, checkSlugAvailability } from "@/app/actions"
import { ImageUpload } from "@/components/image-upload"

type RecurringFrequency = "weekly" | "biweekly" | "monthly"

function calcRecurringDates(startDate: string, frequency: RecurringFrequency, endDate: string): string[] {
  const dates: string[] = []
  const end = new Date(endDate + "T00:00:00")
  let current = new Date(startDate + "T00:00:00")
  current.setDate(current.getDate() + (frequency === "weekly" ? 7 : frequency === "biweekly" ? 14 : 0))

  while (current <= end) {
    dates.push(current.toISOString().split("T")[0])
    if (frequency === "monthly") {
      current = new Date(current)
      current.setMonth(current.getMonth() + 1)
    } else {
      current = new Date(current)
      current.setDate(current.getDate() + (frequency === "weekly" ? 7 : 14))
    }
    if (dates.length >= 52) break // safety cap
  }
  return dates
}

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid"

interface SectionFormData {
  name: string
  startTime: string
  endTime: string
  slots: number
}

function emptySections(): SectionFormData[] {
  return [{ name: "", startTime: "", endTime: "", slots: 10 }]
}

export function CreateMicForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    venue: "",
    date: "",
    notes: "",
    hostEmail: "",
  })

  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>("weekly")
  const [recurringEndDate, setRecurringEndDate] = useState("")
  const [createdCount, setCreatedCount] = useState(0)
  const [sections, setSections] = useState<SectionFormData[]>(emptySections())
  const [imageUrl, setImageUrl] = useState<string | null>(null)

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

  const updateSection = (idx: number, update: Partial<SectionFormData>) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, ...update } : s)))
  }

  const addSection = () => {
    setSections((prev) => {
      const last = prev[prev.length - 1]
      let nextStart = ""
      if (last) {
        if (last.endTime) {
          nextStart = last.endTime
        } else if (last.startTime) {
          // add 1 hour
          const [h, m] = last.startTime.split(":").map(Number)
          const next = new Date(0, 0, 0, h + 1, m)
          nextStart = `${String(next.getHours()).padStart(2, "0")}:${String(next.getMinutes()).padStart(2, "0")}`
        }
      }
      return [...prev, { name: "", startTime: nextStart, endTime: "", slots: 10 }]
    })
  }

  const removeSection = (idx: number) => {
    setSections((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (slugStatus === "taken") {
      setSubmitError("That URL is already taken. Choose a different one.")
      return
    }
    setIsSubmitting(true)
    setSubmitError(null)

    const sectionPayload = sections.map((s) => ({
      name: s.name || undefined,
      startTime: s.startTime,
      endTime: s.endTime || undefined,
      slots: s.slots,
    }))

    // For recurring series, generate a shared PIN and series slug once
    const sharedPin = isRecurring ? Math.floor(100000 + Math.random() * 900000).toString() : undefined
    const seriesSlug = isRecurring ? `${toSlug(formData.name)}-${Math.random().toString(36).substring(2, 6)}` : undefined
    const seriesName = isRecurring ? formData.name : undefined

    const result = await createMic({
      ...formData,
      slug: slug || undefined,
      hostEmail: formData.hostEmail || undefined,
      imageUrl: imageUrl || undefined,
      seriesSlug,
      seriesName,
      hostPin: sharedPin,
      sections: sectionPayload,
    })

    if (!result.success || !result.slug || !result.hostPin) {
      setSubmitError(result.error || "Something went wrong. Try again.")
      setIsSubmitting(false)
      return
    }

    // Create additional recurring instances if needed
    if (isRecurring && recurringEndDate && seriesSlug) {
      const extraDates = calcRecurringDates(formData.date, recurringFrequency, recurringEndDate)
      let count = 1
      for (const date of extraDates) {
        const extra = await createMic({
          ...formData,
          date,
          slug: undefined, // auto-generate for each
          hostEmail: formData.hostEmail || undefined,
          imageUrl: imageUrl || undefined,
          seriesSlug,
          seriesName,
          hostPin: sharedPin,
          sections: sectionPayload,
        })
        if (extra.success) count++
      }
      setCreatedCount(count)
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
          <h2 className="text-2xl font-bold text-foreground">
            {createdCount > 1 ? `${createdCount} dates created.` : "Your mic is live."}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {createdCount > 1
              ? "All dates share the same PIN. Save it — you'll need it to edit any of them."
              : "Save your host PIN somewhere safe. You'll need it to edit or manage the page."}
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
        <Label className="text-lg font-bold">Flyer / Image</Label>
        <ImageUpload value={imageUrl} onChange={setImageUrl} />
        <p className="text-sm text-muted-foreground">Optional. Shows at the top of your mic page.</p>
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

      {/* Time Blocks / Sections */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-bold">
            Time Blocks <span className="text-neon-pink">*</span>
          </Label>
          <button
            type="button"
            onClick={addSection}
            className="flex items-center gap-1.5 text-sm text-neon-pink hover:text-neon-pink/80 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add time block
          </button>
        </div>

        <div className="space-y-3">
          {sections.map((sec, idx) => (
            <div key={idx} className="rounded-xl border border-border bg-secondary/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {sections.length > 1 ? `Block ${idx + 1}` : "Time & Slots"}
                </span>
                {sections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeSection(idx)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {sections.length > 1 && (
                <div className="space-y-1.5">
                  <Label htmlFor={`sec-name-${idx}`} className="text-sm font-medium">
                    Block Name <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id={`sec-name-${idx}`}
                    placeholder='e.g. "Early Set" or "Late Night"'
                    value={sec.name}
                    onChange={(e) => updateSection(idx, { name: e.target.value })}
                    className="h-10 border-border bg-secondary/50 focus:border-neon-pink placeholder:text-muted-foreground/50"
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`sec-start-${idx}`} className="text-sm font-medium">
                    Start <span className="text-neon-pink">*</span>
                  </Label>
                  <Input
                    id={`sec-start-${idx}`}
                    type="time"
                    value={sec.startTime}
                    onChange={(e) => updateSection(idx, { startTime: e.target.value })}
                    required
                    className="h-10 border-border bg-secondary/50 focus:border-neon-pink"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`sec-end-${idx}`} className="text-sm font-medium">
                    End
                  </Label>
                  <Input
                    id={`sec-end-${idx}`}
                    type="time"
                    value={sec.endTime}
                    onChange={(e) => updateSection(idx, { endTime: e.target.value })}
                    className="h-10 border-border bg-secondary/50 focus:border-neon-pink"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`sec-slots-${idx}`} className="text-sm font-medium">
                    Slots <span className="text-neon-pink">*</span>
                  </Label>
                  <Input
                    id={`sec-slots-${idx}`}
                    type="number"
                    min={1}
                    max={50}
                    value={sec.slots}
                    onChange={(e) => updateSection(idx, { slots: parseInt(e.target.value) || 1 })}
                    required
                    className="h-10 border-border bg-secondary/50 focus:border-neon-pink"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
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

      {/* Recurring */}
      <div className="space-y-3 rounded-xl border border-border/50 bg-secondary/10 p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isRecurring}
            onChange={(e) => setIsRecurring(e.target.checked)}
            className="h-4 w-4 accent-neon-pink"
          />
          <div>
            <span className="font-bold text-base flex items-center gap-2">
              <RepeatIcon className="h-4 w-4 text-neon-pink" />
              Recurring event
            </span>
            <p className="text-sm text-muted-foreground mt-0.5">
              Auto-create all future dates and link them together.
            </p>
          </div>
        </label>

        {isRecurring && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Frequency</Label>
              <select
                value={recurringFrequency}
                onChange={(e) => setRecurringFrequency(e.target.value as RecurringFrequency)}
                className="w-full h-10 rounded-md border border-border bg-secondary/50 px-3 text-sm focus:border-neon-pink focus:outline-none"
              >
                <option value="weekly">Weekly</option>
                <option value="biweekly">Biweekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recurringEndDate" className="text-sm font-medium">
                End Date <span className="text-neon-pink">*</span>
              </Label>
              <Input
                id="recurringEndDate"
                type="date"
                value={recurringEndDate}
                min={formData.date || undefined}
                onChange={(e) => setRecurringEndDate(e.target.value)}
                required={isRecurring}
                className="h-10 border-border bg-secondary/50 focus:border-neon-pink"
              />
            </div>
          </div>
        )}

        {isRecurring && formData.date && recurringEndDate && (
          <p className="text-xs text-muted-foreground">
            {(() => {
              const extra = calcRecurringDates(formData.date, recurringFrequency, recurringEndDate)
              const total = extra.length + 1
              return total > 1
                ? `Creates ${total} dates total — all linked and sharing one host PIN.`
                : "No additional dates in range."
            })()}
          </p>
        )}
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
