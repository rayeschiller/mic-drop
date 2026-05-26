"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles, Check, X, Loader2, Plus, Trash2, RepeatIcon } from "lucide-react"
import { createMic, checkSlugAvailability } from "@/app/actions"
import { PlaceAutocomplete, type PlaceResult } from "@/components/place-autocomplete"
import { ImageUpload } from "@/components/image-upload"
import { SignupReleasePicker } from "@/components/signup-release-picker"

import { type RecurringFrequency, DAY_LABELS, calcRecurringDates } from "@/lib/recurring"

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
  const [place, setPlace] = useState<PlaceResult | null>(null)

  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>("weekly")
  const [recurringEndDate, setRecurringEndDate] = useState("")
  const [customDays, setCustomDays] = useState<number[]>([])
  const [createdCount, setCreatedCount] = useState(0)
  const [sections, setSections] = useState<SectionFormData[]>(emptySections())
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [signupOpensAt, setSignupOpensAt] = useState<string | null>(null)
  const [sendReminders, setSendReminders] = useState(true)
  const [sendTwoDayReminder, setSendTwoDayReminder] = useState(true)

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
    if (isRecurring && recurringFrequency === "custom" && customDays.length === 0) {
      setSubmitError("Select at least one day for the custom schedule.")
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

    // Capture the host's IANA timezone so reminder crons can convert
    // (date + start_time) into a correct UTC instant regardless of where they live.
    const timezone =
      (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) ||
      "America/Los_Angeles"

    const locationData = place
      ? { placeId: place.placeId, formattedAddress: place.formattedAddress, latitude: place.latitude, longitude: place.longitude }
      : {}

    const result = await createMic({
      ...formData,
      slug: slug || undefined,
      hostEmail: formData.hostEmail,
      imageUrl: imageUrl || undefined,
      seriesSlug,
      seriesName,
      hostPin: sharedPin,
      sections: sectionPayload,
      signupOpensAt: signupOpensAt || undefined,
      sendReminders,
      sendTwoDayReminder,
      timezone,
      ...locationData,
    })

    if (!result.success || !result.slug || !result.hostPin) {
      setSubmitError(result.error || "Something went wrong. Try again.")
      setIsSubmitting(false)
      return
    }

    // Create additional recurring instances if needed
    if (isRecurring && recurringEndDate && seriesSlug) {
      const extraDates = calcRecurringDates(formData.date, recurringFrequency, recurringEndDate, customDays)
      let count = 1
      for (const date of extraDates) {
        const extra = await createMic({
          ...formData,
          date,
          slug: undefined, // auto-generate for each
          hostEmail: "", // email already sent for the first date
          imageUrl: imageUrl || undefined,
          seriesSlug,
          seriesName,
          hostPin: sharedPin,
          sections: sectionPayload,
          signupOpensAt: signupOpensAt || undefined,
          sendReminders,
          sendTwoDayReminder,
          timezone,
          ...locationData,
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

  const fillTestData = () => {
    const today = new Date()
    today.setDate(today.getDate() + 7)
    const date = today.toISOString().split("T")[0]
    const names = [
      "Sweaty Palms Open Mic",
      "Cry Laughing Comedy Night",
      "The Basement Stinker Showcase",
      "Nobody Asked But Here We Are",
      "Please Laugh Open Mic",
      "Comedy for People Who Hate Comedy",
      "The Awkward Pause Invitational",
      "Bombers Anonymous Weekly",
      "Sir Laughs-a-Lot's Sad Hour",
      "Yell Into the Void Tuesdays",
    ]
    const venues = [
      "The Sad Clown Saloon",
      "Chuckle Dungeon",
      "The Weeping Willow Bar",
      "Guffaw Palace",
      "The Discount Laff Shack",
    ]
    const notes = [
      "5 mins each. No crowd work. Bring your own tears.",
      "Keep it tight or we unplug the mic. No exceptions. Yes, even you.",
      "Tags welcome. Crowd work forbidden. Crying in the bathroom: permitted.",
      "This is a safe space. Unless you're doing hacky airplane jokes.",
      "7 minutes hard cap. The light is a suggestion. The bouncer is not.",
    ]
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]
    setFormData({
      name: pick(names),
      venue: pick(venues),
      date,
      notes: pick(notes),
      hostEmail: "test@example.com",
    })
    setSections([{ name: "", startTime: "19:00", endTime: "21:00", slots: 8 }])
    setSlugManuallyEdited(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {process.env.NODE_ENV === "development" && (
        <button
          type="button"
          onClick={fillTestData}
          className="w-full rounded-lg border border-dashed border-yellow-500/50 bg-yellow-500/10 py-2 text-sm text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20 transition-colors"
        >
          Fill test data
        </button>
      )}
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
        <Label className="text-lg font-bold">Venue Location</Label>
        <PlaceAutocomplete
          value={place}
          onChange={(p) => {
            setPlace(p)
            if (p?.name) setFormData((prev) => ({ ...prev, venue: p.name! }))
          }}
        />
        <p className="text-sm text-muted-foreground">
          Optional — shows your mic on the map so comedians can find mics near them.
        </p>
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
          Your Email <span className="text-red-500">*</span>
        </Label>
        <Input
          id="hostEmail"
          type="email"
          required
          placeholder="you@example.com"
          value={formData.hostEmail}
          onChange={(e) => setFormData({ ...formData, hostEmail: e.target.value })}
          className="h-12 text-lg border-border bg-secondary/50 focus:border-neon-pink placeholder:text-muted-foreground/50"
        />
        <p className="text-sm text-muted-foreground">
          We{"'"}ll email you your host PIN so you don{"'"}t lose it.
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
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Frequency</Label>
                <select
                  value={recurringFrequency}
                  onChange={(e) => {
                    const freq = e.target.value as RecurringFrequency
                    setRecurringFrequency(freq)
                    if (freq === "custom" && formData.date) {
                      const day = new Date(formData.date + "T00:00:00").getDay()
                      setCustomDays((prev) => prev.includes(day) ? prev : [...prev, day])
                    }
                  }}
                  className="w-full h-10 rounded-md border border-border bg-secondary/50 px-3 text-sm focus:border-neon-pink focus:outline-none"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom days</option>
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

          {recurringFrequency === "custom" && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Repeat on</Label>
              <div className="flex gap-1.5 flex-wrap">
                {DAY_LABELS.map((label, idx) => {
                  const active = customDays.includes(idx)
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCustomDays((prev) =>
                        active ? prev.filter((d) => d !== idx) : [...prev, idx]
                      )}
                      className={`h-9 w-9 rounded-full text-xs font-bold transition-colors ${
                        active
                          ? "bg-neon-pink text-white"
                          : "border border-border bg-secondary/50 text-muted-foreground hover:border-neon-pink hover:text-neon-pink"
                      }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              {customDays.length === 0 && (
                <p className="text-xs text-destructive">Select at least one day.</p>
              )}
            </div>
          )}
          </div>
        )}

        {isRecurring && formData.date && recurringEndDate && (
          <p className="text-xs text-muted-foreground">
            {(() => {
              const extra = calcRecurringDates(formData.date, recurringFrequency, recurringEndDate, customDays)
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

      <SignupReleasePicker
        value={signupOpensAt}
        onChange={setSignupOpensAt}
      />

      <div className="rounded-xl border border-border/50 bg-secondary/10 p-4 space-y-3">
        <span className="font-bold text-base">Reminder emails</span>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={sendTwoDayReminder}
            onChange={(e) => setSendTwoDayReminder(e.target.checked)}
            className="h-4 w-4 accent-neon-pink"
          />
          <div>
            <span className="text-sm font-bold">2 days before</span>
            <p className="text-sm text-muted-foreground mt-0.5">
              Email everyone on the lineup 2 days before the show.
            </p>
          </div>
        </label>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={sendReminders}
            onChange={(e) => setSendReminders(e.target.checked)}
            className="h-4 w-4 accent-neon-pink"
          />
          <div>
            <span className="text-sm font-bold">Day of show</span>
            <p className="text-sm text-muted-foreground mt-0.5">
              Email everyone on the lineup the day of the show at 7am EST / 4am PST.
            </p>
          </div>
        </label>
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
