"use client"

import React from "react"

import { useState } from "react"
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
import { Mic2 } from "lucide-react"

interface SignupModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  slotNumber: number
  onSubmit: (name: string, instagram: string, email: string) => void | Promise<void>
}

export function SignupModal({
  open,
  onOpenChange,
  slotNumber,
  onSubmit,
}: SignupModalProps) {
  const [name, setName] = useState("")
  const [instagram, setInstagram] = useState("")
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setIsSubmitting(true)
    await onSubmit(name.trim(), instagram.trim(), email.trim())
    setName("")
    setInstagram("")
    setEmail("")
    setIsSubmitting(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-2 border-neon-pink">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neon-pink/20">
              <Mic2 className="h-6 w-6 text-neon-pink" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold">
                Slot #{slotNumber}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {"You're doing it. Respect."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground font-medium">
              Your Name <span className="text-neon-pink">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Stage name or whatever"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="border-border bg-secondary/50 focus:border-neon-pink focus:ring-neon-pink"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instagram" className="text-foreground font-medium">
              Instagram Handle
            </Label>
            <Input
              id="instagram"
              placeholder="@yourhandle"
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              className="border-border bg-secondary/50 focus:border-neon-pink focus:ring-neon-pink"
            />
            <p className="text-xs text-muted-foreground">
              Shown publicly on the lineup.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground font-medium">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-border bg-secondary/50 focus:border-neon-pink focus:ring-neon-pink"
            />
            <p className="text-xs text-muted-foreground">
              Private. Only visible to the host.
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
              disabled={!name.trim() || isSubmitting}
              className="bg-neon-pink text-primary-foreground hover:bg-neon-pink/90 font-bold"
            >
              {isSubmitting ? "Signing Up..." : "Lock It In"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
