"use client"

import { useState } from "react"
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
import { Pencil } from "lucide-react"

interface MicEditData {
  name: string
  venue: string
  date: string
  startTime: string
  endTime: string
  notes?: string
  totalSlots: number
}

interface EditMicModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  micData: MicEditData
  currentFilledSlots: number
  onSave: (data: MicEditData) => void
}

export function EditMicModal({
  open,
  onOpenChange,
  micData,
  currentFilledSlots,
  onSave,
}: EditMicModalProps) {
  const [formData, setFormData] = useState<MicEditData>(micData)

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setFormData(micData)
    }
    onOpenChange(newOpen)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
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
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                required
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
