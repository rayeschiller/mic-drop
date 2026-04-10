"use client"

import React, { useState } from "react"
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
import { AlertCircle } from "lucide-react"

interface LeaveWaitlistModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (email: string) => boolean | Promise<boolean>
}

export function LeaveWaitlistModal({ open, onOpenChange, onSubmit }: LeaveWaitlistModalProps) {
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
      setError("Email doesn't match. Are you sure that's the one you used?")
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
          <DialogTitle className="text-foreground">Leave the Waitlist</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter the email you used to join the waitlist to confirm.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="leave-wl-email" className="text-foreground font-medium">
              Your Email
            </Label>
            <Input
              id="leave-wl-email"
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
              {isSubmitting ? "Leaving..." : "Leave Waitlist"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
