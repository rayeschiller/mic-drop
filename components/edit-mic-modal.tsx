"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Pencil, Check, X, Loader2, Plus, Trash2 } from "lucide-react"
import { checkSlugAvailability, type SectionData, type SectionInput } from "@/app/actions"
import { ImageUpload } from "@/components/image-upload"
import { SignupReleasePicker } from "@/components/signup-release-picker"
import { type RecurringFrequency, DAY_LABELS, calcRecurringDates } from "@/lib/recurring"
import { PlaceAutocomplete, type PlaceResult } from "@/components/place-autocomplete"

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

type SlugStatus = "idle" | "checking" | "available" | "taken" | "invalid" | "unchanged"

interface SectionFormItem {
  id?: string   // existing section id
  name: string
  startTime: string
  endTime: string
  slots: number
  filledSlots: number  // read-only, min for slots input
}

interface MicEditData {
  name: string
  venue: string
  date: string
  startTime: string
  endTime: string
  notes?: string
  totalSlots: number
  slug: string
  imageUrl?: string | null
  sections?: SectionData[]
  seriesSlug?: string | null
  seriesName?: string | null
  signupOpensAt?: string | null
  sendReminders?: boolean
  sendTwoDayReminder?: boolean
  placeId?: string | null
  formattedAddress?: string | null
  latitude?: number | null
  longitude?: number | null
}

type MicSaveData = Omit<MicEditData, "sections"> & {
  sections?: SectionInput[]
  recurringFrequency?: RecurringFrequency
  recurringEndDate?: string
  customDays?: number[]
  applyToSeries?: boolean
}

interface EditMicModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  micData: MicEditData
  currentFilledSlots: number
  onSave: (data: MicSaveData) => void
}

function sectionsToFormItems(sections: SectionData[]): SectionFormItem[] {
  return sections.map((s) => ({
    id: s.id,
    name: s.name || "",
    startTime: s.startTime,
    endTime: s.endTime || "",
    slots: s.totalSlots,
    filledSlots: s.slots.filter((sl) => sl.taken).length,
  }))
}

export function EditMicModal({
  open,
  onOpenChange,
  micData,
  currentFilledSlots,
  onSave,
}: EditMicModalProps) {
  const hasSections = (micData.sections?.length ?? 0) > 0

  const [formData, setFormData] = useState<MicEditData>(micData)
  const [sectionItems, setSectionItems] = useState<SectionFormItem[]>(
    hasSections ? sectionsToFormItems(micData.sections!) : []
  )
  const [slugStatus, setSlugStatus] = useState<SlugStatus>("unchanged")
  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>("weekly")
  const [recurringEndDate, setRecurringEndDate] = useState("")
  const [customDays, setCustomDays] = useState<number[]>([])
  const [applyToSeries, setApplyToSeries] = useState(true)
  const [place, setPlace] = useState<PlaceResult | null>(
    micData.placeId && micData.formattedAddress && micData.latitude != null && micData.longitude != null
      ? { placeId: micData.placeId, formattedAddress: micData.formattedAddress, latitude: micData.latitude, longitude: micData.longitude }
      : null
  )

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setFormData(micData)
      setSectionItems(hasSections ? sectionsToFormItems(micData.sections!) : [])
      setSlugStatus("unchanged")
      // Always reset recurring fields so stale state from a previous open can't sneak through
      setRecurringFrequency("weekly")
      setRecurringEndDate("")
      setCustomDays([])
      setApplyToSeries(true)
      setPlace(
        micData.placeId && micData.formattedAddress && micData.latitude != null && micData.longitude != null
          ? { placeId: micData.placeId, formattedAddress: micData.formattedAddress, latitude: micData.latitude, longitude: micData.longitude }
          : null
      )
    }
    onOpenChange(newOpen)
  }

  const checkSlug = useCallback((value: string, originalSlug: string) => {
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current)

    if (value === originalSlug) {
      setSlugStatus("unchanged")
      return
    }
    if (value.length < 3) {
      setSlugStatus("invalid")
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
    setFormData((prev) => ({ ...prev, slug: sanitized }))
    checkSlug(sanitized, micData.slug)
  }

  useEffect(() => {
    setFormData(micData)
    setSectionItems(hasSections ? sectionsToFormItems(micData.sections!) : [])
    setSlugStatus("unchanged")
    setRecurringFrequency("weekly")
    setRecurringEndDate("")
    setCustomDays([])
    setApplyToSeries(true)
    setPlace(
      micData.placeId && micData.formattedAddress && micData.latitude != null && micData.longitude != null
        ? { placeId: micData.placeId, formattedAddress: micData.formattedAddress, latitude: micData.latitude, longitude: micData.longitude }
        : null
    )
  }, [micData]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateSectionItem = (idx: number, update: Partial<SectionFormItem>) => {
    setSectionItems((prev) => prev.map((s, i) => (i === idx ? { ...s, ...update } : s)))
  }

  const addSection = () => {
    setSectionItems((prev) => [
      ...prev,
      { name: "", startTime: "", endTime: "", slots: 5, filledSlots: 0 },
    ])
  }

  const removeSection = (idx: number) => {
    if (sectionItems[idx].filledSlots > 0) return // can't remove if has performers
    setSectionItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (slugStatus === "taken" || slugStatus === "invalid") return
    if (recurringFrequency === "custom" && recurringEndDate && customDays.length === 0) return

    const recurringFields = recurringEndDate
      ? { recurringFrequency, recurringEndDate, customDays }
      : {}

    const locationData = place
      ? { placeId: place.placeId, formattedAddress: place.formattedAddress, latitude: place.latitude, longitude: place.longitude }
      : { placeId: null, formattedAddress: null, latitude: null, longitude: null }

    const { sections: _sections, ...rest } = formData
    if (hasSections || sectionItems.length > 0) {
      onSave({
        ...rest,
        ...locationData,
        sections: sectionItems.map((s) => ({
          id: s.id,
          name: s.name || undefined,
          startTime: s.startTime,
          endTime: s.endTime || undefined,
          slots: s.slots,
        })),
        ...recurringFields,
        applyToSeries: !!formData.seriesSlug && applyToSeries,
      })
    } else {
      onSave({ ...rest, ...locationData, ...recurringFields, applyToSeries: !!formData.seriesSlug && applyToSeries })
    }
    onOpenChange(false)
  }

  const minSlots = Math.max(1, currentFilledSlots)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Edit Mic Details
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update your mic info. Changes are saved immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Series sync toggle — shown whenever this mic is part of a series */}
          {formData.seriesSlug && (
            <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
              <input
                type="checkbox"
                checked={applyToSeries}
                onChange={(e) => setApplyToSeries(e.target.checked)}
                className="h-4 w-4 accent-neon-pink shrink-0"
              />
              <div>
                <span className="text-sm font-bold">Update all dates in this series</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Applies name, venue, notes, image, location, and time changes to every date. Each date keeps its own lineup.
                </p>
              </div>
            </label>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-name" className="text-foreground font-medium">
              Mic Name
            </Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="border-border bg-secondary/50 focus:border-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-slug" className="text-foreground font-medium">
              Page URL
            </Label>
            <div className="relative">
              <div className="flex items-center rounded-md border border-border bg-secondary/50 focus-within:border-primary overflow-hidden h-10">
                <input
                  id="edit-slug"
                  value={formData.slug}
                  onChange={handleSlugChange}
                  className="flex-1 h-full bg-transparent text-sm outline-none px-3 pr-10"
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
            <p className="text-xs text-muted-foreground">
              {slugStatus === "taken" && (
                <span className="text-destructive">That URL is already taken.</span>
              )}
              {slugStatus === "invalid" && (
                <span className="text-destructive">Must be at least 3 characters.</span>
              )}
              {slugStatus === "available" && (
                <span className="text-neon-green">Available — page will move to /{formData.slug}</span>
              )}
              {(slugStatus === "unchanged" || slugStatus === "idle") && (
                <>Your mic lives at <code>/{formData.slug}</code></>
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Flyer / Image</Label>
            <ImageUpload
              value={formData.imageUrl ?? null}
              onChange={(url) => setFormData({ ...formData, imageUrl: url })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-venue" className="text-foreground font-medium">
              Venue
            </Label>
            <Input
              id="edit-venue"
              value={formData.venue}
              onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
              required
              className="border-border bg-secondary/50 focus:border-primary"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-foreground font-medium">Location</Label>
            <PlaceAutocomplete value={place} onChange={setPlace} size="sm" />
            {place && (
              <p className="text-xs text-neon-green flex items-center gap-1">
                <span>✓</span> Location set — mic will appear in nearby searches
              </p>
            )}
            {!place && (
              <p className="text-xs text-muted-foreground">
                Search for the venue address to show up in &quot;Mics Near You&quot; and on maps.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-date" className="text-foreground font-medium">
              Date
            </Label>
            <Input
              id="edit-date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
              className="border-border bg-secondary/50 focus:border-primary"
            />
          </div>

          {/* Sections (multi-section mic) */}
          {hasSections || sectionItems.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-foreground font-medium">Time Blocks</Label>
                <button
                  type="button"
                  onClick={addSection}
                  className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add block
                </button>
              </div>

              {sectionItems.map((sec, idx) => (
                <div key={sec.id ?? idx} className="rounded-lg border border-border bg-secondary/20 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Block {idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeSection(idx)}
                      disabled={sec.filledSlots > 0}
                      className="text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title={sec.filledSlots > 0 ? "Can't remove — has performers" : "Remove block"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Name (optional)</Label>
                    <Input
                      placeholder='e.g. "Early Set"'
                      value={sec.name}
                      onChange={(e) => updateSectionItem(idx, { name: e.target.value })}
                      className="h-9 text-sm border-border bg-secondary/50 focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Start</Label>
                      <Input
                        type="time"
                        value={sec.startTime}
                        onChange={(e) => updateSectionItem(idx, { startTime: e.target.value })}
                        required
                        className="h-9 text-sm border-border bg-secondary/50 focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">End</Label>
                      <Input
                        type="time"
                        value={sec.endTime}
                        onChange={(e) => updateSectionItem(idx, { endTime: e.target.value })}
                        className="h-9 text-sm border-border bg-secondary/50 focus:border-primary"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Slots</Label>
                      <Input
                        type="number"
                        min={Math.max(1, sec.filledSlots)}
                        max={50}
                        value={sec.slots}
                        onChange={(e) =>
                          updateSectionItem(idx, {
                            slots: Math.max(sec.filledSlots, parseInt(e.target.value) || 1),
                          })
                        }
                        required
                        className="h-9 text-sm border-border bg-secondary/50 focus:border-primary"
                      />
                    </div>
                  </div>
                  {sec.filledSlots > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {sec.filledSlots} performer{sec.filledSlots !== 1 ? "s" : ""} signed up.
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Legacy single-section UI */
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-startTime" className="text-foreground font-medium">
                    Start Time
                  </Label>
                  <Input
                    id="edit-startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                    className="border-border bg-secondary/50 focus:border-primary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-endTime" className="text-foreground font-medium">
                    End Time
                  </Label>
                  <Input
                    id="edit-endTime"
                    type="time"
                    value={formData.endTime ?? ""}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="border-border bg-secondary/50 focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-slots" className="text-foreground font-medium">
                  Total Slots
                </Label>
                <Input
                  id="edit-slots"
                  type="number"
                  min={minSlots}
                  max={50}
                  value={formData.totalSlots}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      totalSlots: Math.max(minSlots, parseInt(e.target.value) || minSlots),
                    })
                  }
                  required
                  className="border-border bg-secondary/50 focus:border-primary"
                />
                {currentFilledSlots > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Minimum {minSlots} (can{"'"}t remove filled slots).
                  </p>
                )}
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="edit-notes" className="text-foreground font-medium">
              Notes
            </Label>
            <Textarea
              id="edit-notes"
              value={formData.notes || ""}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="min-h-20 border-border bg-secondary/50 focus:border-primary"
            />
            <p className="text-xs text-muted-foreground">
              Supports markdown — <code>**bold**</code>, <code>[link text](https://url.com)</code>, etc.
            </p>
          </div>

          {/* Make Recurring */}
          <div className="space-y-3 rounded-lg border border-border/50 bg-secondary/10 p-3">
            <Label className="text-sm font-medium">
              {formData.seriesSlug ? "Add more dates" : "Make Recurring"}
            </Label>
            <p className="text-xs text-muted-foreground">
              {formData.seriesSlug
                ? `Part of series "${formData.seriesName || formData.seriesSlug}". Set a frequency and end date to generate additional linked dates.`
                : "Turn this into a recurring series by setting a frequency and end date. New mic pages will be created for each date and linked together."}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Frequency</Label>
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
                  className="w-full h-9 rounded-md border border-border bg-secondary/50 px-3 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom days</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">End Date</Label>
                <Input
                  type="date"
                  value={recurringEndDate}
                  min={formData.date || undefined}
                  onChange={(e) => setRecurringEndDate(e.target.value)}
                  className="h-9 text-sm border-border bg-secondary/50 focus:border-primary"
                />
              </div>
            </div>

            {recurringFrequency === "custom" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Repeat on</Label>
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
                {recurringEndDate && customDays.length === 0 && (
                  <p className="text-xs text-destructive">Select at least one day.</p>
                )}
              </div>
            )}

            {recurringEndDate && formData.date && (
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

          <SignupReleasePicker
            value={formData.signupOpensAt ?? null}
            onChange={(val) => setFormData((prev) => ({ ...prev, signupOpensAt: val }))}
          />

          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3 space-y-3">
            <span className="text-sm font-medium">Reminder emails</span>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.sendTwoDayReminder ?? false}
                onChange={(e) => setFormData((prev) => ({ ...prev, sendTwoDayReminder: e.target.checked }))}
                className="h-4 w-4 accent-neon-pink"
              />
              <div>
                <span className="text-sm font-bold">2 days before</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Email everyone on the lineup 2 days before the show.
                </p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.sendReminders ?? false}
                onChange={(e) => setFormData((prev) => ({ ...prev, sendReminders: e.target.checked }))}
                className="h-4 w-4 accent-neon-pink"
              />
              <div>
                <span className="text-sm font-bold">Day of show</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Email everyone on the lineup the day of the show at 7am EST / 4am PST.
                </p>
              </div>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="flex-1 border-border bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={slugStatus === "taken" || slugStatus === "invalid"}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
