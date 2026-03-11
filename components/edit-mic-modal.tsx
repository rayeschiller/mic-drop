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
}

type MicSaveData = Omit<MicEditData, "sections"> & { sections?: SectionInput[] }

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

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setFormData(micData)
      setSectionItems(hasSections ? sectionsToFormItems(micData.sections!) : [])
      setSlugStatus("unchanged")
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

    const { sections: _sections, ...rest } = formData
    if (hasSections || sectionItems.length > 0) {
      onSave({
        ...rest,
        sections: sectionItems.map((s) => ({
          id: s.id,
          name: s.name || undefined,
          startTime: s.startTime,
          endTime: s.endTime || undefined,
          slots: s.slots,
        })),
      })
    } else {
      onSave(rest)
    }
    onOpenChange(false)
  }

  const minSlots = Math.max(1, currentFilledSlots)

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

          {/* Series */}
          <div className="space-y-3 rounded-lg border border-border/50 bg-secondary/10 p-3">
            <Label className="text-sm font-medium">Recurring Series</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Series Name</Label>
                <Input
                  placeholder='e.g. "Tuesday Nights"'
                  value={formData.seriesName || ""}
                  onChange={(e) => setFormData({ ...formData, seriesName: e.target.value })}
                  className="h-9 text-sm border-border bg-secondary/50 focus:border-primary"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Series ID</Label>
                <Input
                  placeholder='e.g. "tuesday-nights"'
                  value={formData.seriesSlug || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, seriesSlug: toSlug(e.target.value) })
                  }
                  className="h-9 text-sm border-border bg-secondary/50 focus:border-primary"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Leave blank if this is a one-off event.
            </p>
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
