"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Clock } from "lucide-react"

interface WaitlistModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string, instagram: string, email: string) => void | Promise<void>
}

export function WaitlistModal({ open, onOpenChange, onSubmit }: WaitlistModalProps) {
  const [name, setName] = useState("")
  const [instagram, setInstagram] = useState("")
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return

    setIsSubmitting(true)
    await onSubmit(name.trim(), instagram.trim(), email.trim())
    setName("")
    setInstagram("")
    setEmail("")
    setIsSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-2 border-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">Join the Waitlist</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {"You might get lucky. We'll email you if a slot opens."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="wl-name" className="text-foreground font-medium">
              Your Name <span className="text-primary">*</span>
            </Label>
            <Input
              id="wl-name"
              placeholder="Stage name or whatever"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="border-border bg-secondary/50 focus:border-primary focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wl-instagram" className="text-foreground font-medium">
              Instagram Handle
            </Label>
            <Input
              id="wl-instagram"
              placeholder="@yourhandle"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="border-border bg-secondary/50 focus:border-primary focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wl-email" className="text-foreground font-medium">
              Email <span className="text-primary">*</span>
            </Label>
            <Input
              id="wl-email"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-border bg-secondary/50 focus:border-primary focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">
              {"We'll email you if a slot opens. Private — only visible to the host."}
            </p>
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              Nevermind
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || !email.trim() || isSubmitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
            >
              {isSubmitting ? "Joining..." : "Join Waitlist"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
