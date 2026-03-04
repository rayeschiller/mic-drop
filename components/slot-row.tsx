"use client"

import { Button } from "@/components/ui/button"
import { Mic2, User } from "lucide-react"

export interface SlotData {
  number: number
  taken: boolean
  performerName?: string
  performerInstagram?: string
  performerEmail?: string // Only visible to host
}

interface SlotRowProps {
  slot: SlotData
  onTakeSlot: (slotNumber: number) => void
  onRemoveSlot?: (slotNumber: number) => void
}

export function SlotRow({ slot, onTakeSlot, onRemoveSlot }: SlotRowProps) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg border-2 px-4 py-3 transition-all duration-200 ${
        slot.taken
          ? "border-border bg-secondary/50"
          : "border-dashed border-border hover:border-neon-green hover:bg-secondary/30"
      }`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-full font-mono text-lg font-bold ${
            slot.taken
              ? "bg-muted text-muted-foreground"
              : "bg-neon-green/20 text-neon-green"
          }`}
        >
          {slot.number}
        </div>

        {slot.taken ? (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">{slot.performerName}</p>
              {slot.performerInstagram && (
                <p className="text-xs text-muted-foreground font-mono">
                  @{slot.performerInstagram.replace(/^@/, "")}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mic2 className="h-4 w-4" />
            <span className="text-sm">Available</span>
          </div>
        )}
      </div>

      {!slot.taken && (
        <Button
          onClick={() => onTakeSlot(slot.number)}
          variant="outline"
          className="border-neon-pink text-neon-pink hover:bg-neon-pink hover:text-primary-foreground font-bold transition-all duration-200"
        >
          Take This Spot
        </Button>
      )}

      {slot.taken && onRemoveSlot && (
        <button
          onClick={() => onRemoveSlot(slot.number)}
          className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
          title="Click to remove yourself"
        >
          Drop Out
        </button>
      )}
    </div>
  )
}
