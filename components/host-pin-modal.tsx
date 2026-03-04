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
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { AlertCircle, Lock } from "lucide-react"

interface HostPinModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (pin: string) => boolean | Promise<boolean>
}

export function HostPinModal({ open, onOpenChange, onSubmit }: HostPinModalProps) {
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pin.length < 6) {
      setError("Enter the full 6-digit PIN")
      return
    }

    const success = await onSubmit(pin)
    if (!success) {
      setError("Wrong PIN. Are you sure you're the host?")
      setPin("")
      return
    }

    setPin("")
    setError("")
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setPin("")
      setError("")
    }
    onOpenChange(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-card border-border sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Host Access
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter your 6-digit host PIN to manage this mic.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={pin}
              onChange={(value) => {
                setPin(value)
                setError("")
              }}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} className="border-border bg-secondary/50" />
                <InputOTPSlot index={1} className="border-border bg-secondary/50" />
                <InputOTPSlot index={2} className="border-border bg-secondary/50" />
                <InputOTPSlot index={3} className="border-border bg-secondary/50" />
                <InputOTPSlot index={4} className="border-border bg-secondary/50" />
                <InputOTPSlot index={5} className="border-border bg-secondary/50" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {error && (
            <div className="flex items-center justify-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
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
              disabled={pin.length < 6}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Unlock
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
