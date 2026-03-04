"use client"

import React from "react"

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
import { AlertCircle, Trash2 } from "lucide-react"

interface RemoveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slotNumber: number
  performerName: string
  onSubmit: (email: string) => boolean | Promise<boolean>
}

export function RemoveModal({
  open,
  onOpenChange,
  slotNumber,
  performerName,
  onSubmit,
}: RemoveModalProps) {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      setError("Enter your email to verify it's you")
      return
    }

    setIsSubmitting(true)
    setError("")
    
    const success = await onSubmit(email.trim().toLowerCase())
    
    if (!success) {
      setError("Email doesn't match. Nice try though.")
      setIsSubmitting(false)
      return
    }
    
    setEmail("")
    setError("")
    setIsSubmitting(false)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEmail("")
      setError("")
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Remove from Slot #{slotNumber}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Removing <span className="font-medium text-foreground">{performerName}</span> from the lineup. Enter your email to confirm.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="remove-email" className="text-foreground font-medium">
              Your Email
            </Label>
            <Input
              id="remove-email"
              type="email"
              placeholder="The email you signed up with"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setError("")
              }}
              className="border-border bg-secondary/50 focus:border-destructive focus:ring-destructive"
              autoComplete="email"
            />
            <p className="text-xs text-muted-foreground">
              Must match the email you used to sign up.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

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
              disabled={isSubmitting}
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Removing..." : "Remove Me"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
