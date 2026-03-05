"use client"

import { useState, useEffect, useCallback } from "react"
import Markdown from "react-markdown"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Mic2,
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Share2,
  Check,
  Lock,
  Pencil,
  Mail,
  Trash2,
  ShieldCheck,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SignupModal } from "@/components/signup-modal"
import { RemoveModal } from "@/components/remove-modal"
import { HostPinModal } from "@/components/host-pin-modal"
import { EditMicModal } from "@/components/edit-mic-modal"
import {
  getMic,
  getMicWithEmails,
  signupForSlot,
  removeFromSlot,
  verifyHostPin,
  hostRemoveSlot,
  hostUpdateMic,
  type MicData,
  type SlotData,
} from "@/app/actions"

function formatDate(dateString: string): string {
  const date = new Date(dateString + "T00:00:00")
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(":")
  const hour = Number.parseInt(hours)
  const ampm = hour >= 12 ? "PM" : "AM"
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

export function MicPageClient({ slug }: { slug: string }) {
  const router = useRouter()
  const [mic, setMic] = useState<MicData | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [removeModalOpen, setRemoveModalOpen] = useState(false)
  const [slotToRemove, setSlotToRemove] = useState<SlotData | null>(null)
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Host mode state
  const [isHost, setIsHost] = useState(false)
  const [hostPin, setHostPin] = useState<string | null>(null)
  const [hostPinModalOpen, setHostPinModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)

  const loadMic = useCallback(async () => {
    if (isHost && hostPin) {
      const result = await getMicWithEmails(slug, hostPin)
      if (result.mic) setMic(result.mic)
    } else {
      const result = await getMic(slug)
      if (result.mic) setMic(result.mic)
    }
  }, [slug, isHost, hostPin])

  useEffect(() => {
    loadMic().then(() => setIsLoading(false))
  }, [loadMic])

  const handleTakeSlot = (slotNumber: number) => {
    setSelectedSlot(slotNumber)
    setModalOpen(true)
  }

  const handleSignup = async (name: string, instagram: string, email: string) => {
    const result = await signupForSlot(slug, selectedSlot!, name, instagram, email)
    if (result.success) {
      await loadMic()
      setModalOpen(false)
      setSelectedSlot(null)
    } else {
      alert(result.error || "Failed to sign up. The slot may already be taken.")
    }
  }

  const handleRemoveSlot = (slotNumber: number) => {
    if (!mic) return
    const slot = mic.slots.find((s) => s.number === slotNumber)
    if (slot && slot.taken) {
      setSlotToRemove(slot)
      setRemoveModalOpen(true)
    }
  }

  const handleRemoveConfirm = async (email: string): Promise<boolean> => {
    if (!slotToRemove) return false
    const result = await removeFromSlot(slug, slotToRemove.number, email)
    if (result.success) {
      await loadMic()
      setRemoveModalOpen(false)
      setSlotToRemove(null)
      return true
    }
    return false
  }

  const handleHostRemove = async (slotNumber: number) => {
    if (!hostPin) return
    const result = await hostRemoveSlot(slug, hostPin, slotNumber)
    if (result.success) {
      await loadMic()
    }
  }

  const handleHostPinSubmit = async (pin: string): Promise<boolean> => {
    const result = await verifyHostPin(slug, pin)
    if (result.success) {
      setHostPin(pin)
      setIsHost(true)
      setHostPinModalOpen(false)
      return true
    }
    return false
  }

  const handleEditSave = async (data: {
    name: string
    venue: string
    date: string
    startTime: string
    endTime: string
    notes?: string
    totalSlots: number
    slug: string
  }) => {
    if (!hostPin) return
    const result = await hostUpdateMic(slug, hostPin, data)
    if (result.success) {
      if (result.newSlug) {
        router.push(`/${result.newSlug}`)
      } else {
        await loadMic()
      }
    }
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Mic2 className="h-12 w-12 text-primary animate-pulse mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </main>
    )
  }

  if (!mic) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-background">
        <div className="text-center max-w-md">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/20 mx-auto">
            <Mic2 className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Mic Not Found</h1>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            {"This mic doesn't exist. Either the link is wrong, or someone's playing a very unfunny joke on you."}
          </p>
          <Link href="/">
            <Button className="mt-8 bg-primary text-primary-foreground hover:bg-primary/90">
              Back to Home
            </Button>
          </Link>
        </div>
      </main>
    )
  }

  const filledSlots = mic.slots.filter((s) => s.taken).length
  const availableSlotsCount = mic.totalSlots - filledSlots
  const isFull = availableSlotsCount === 0

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 group">
            <Mic2 className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold tracking-tight text-foreground">
              Mic<span className="text-primary">Drop</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {isHost ? (
              <Button
                variant="outline"
                onClick={() => setEditModalOpen(true)}
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent"
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Mic
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setHostPinModalOpen(true)}
                className="border-border hover:border-primary hover:text-primary bg-transparent"
                title="Host login"
              >
                <Lock className="h-4 w-4" />
                <span className="sr-only">Host login</span>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="border-border hover:border-accent hover:text-accent bg-transparent"
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Host mode banner */}
      {isHost && (
        <div className="border-b border-primary/30 bg-primary/10">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-2">
            <div className="flex items-center gap-2 text-sm text-primary">
              <ShieldCheck className="h-4 w-4" />
              <span className="font-medium">Host mode active</span>
              <span className="text-primary/60">&mdash; you can edit details, view emails, and remove performers</span>
            </div>
            <button
              onClick={() => {
                setIsHost(false)
                setHostPin(null)
                loadMic()
              }}
              className="text-xs text-primary/60 hover:text-primary underline cursor-pointer"
            >
              Exit
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-6 py-12">
        {/* Mic Header - Show Flyer Style */}
        <div className="relative overflow-hidden rounded-2xl border-2 border-primary bg-card p-8 md:p-12 mb-8">
          <div className="absolute -right-12 -top-12 h-24 w-24 rotate-45 bg-primary opacity-80" />
          <div className="absolute -left-8 -bottom-8 h-16 w-16 rounded-full bg-accent/30 blur-2xl" />

          <div className="relative">
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl text-balance text-foreground">
              {mic.name}
            </h1>

            <div className="mt-8 flex flex-col gap-3 text-foreground">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-white flex-shrink-0" />
                <span className="text-lg">{mic.venue}</span>
              </div>

              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-white flex-shrink-0" />
                <span className="text-lg">{formatDate(mic.date)}</span>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-white flex-shrink-0" />
                <span className="text-lg">
                  {formatTime(mic.startTime)}{mic.endTime ? ` - ${formatTime(mic.endTime)}` : ""}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-white flex-shrink-0" />
                <span
                  className={`text-lg font-bold ${isFull ? "text-destructive" : "text-accent"}`}
                >
                  {isFull
                    ? "Congrats, this mic is emotionally unavailable."
                    : `${availableSlotsCount} of ${mic.totalSlots} slots left`}
                </span>
              </div>
            </div>

            {mic.notes && (
              <div className="mt-8 prose prose-invert prose-sm max-w-none">
                <Markdown
                  components={{
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
                        {children}
                      </a>
                    ),
                    p: ({ children }) => (
                      <p className="text-foreground whitespace-pre-wrap mb-2 last:mb-0">{children}</p>
                    ),
                  }}
                >
                  {mic.notes}
                </Markdown>
              </div>
            )}
          </div>
        </div>

        {/* Slot List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Lineup</h2>
            {!isFull && (
              <p className="text-sm text-muted-foreground">
                The list is open. Do something brave.
              </p>
            )}
          </div>

          <div className="space-y-3">
            {mic.slots.map((slot) => (
              <div key={slot.number}>
                {/* Slot row */}
                <div
                  className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all duration-200 ${
                    slot.taken
                      ? "border-border bg-card"
                      : "border-dashed border-border/50 bg-card/50 hover:border-primary/50 hover:bg-card"
                  } ${isHost && slot.taken ? "rounded-b-none" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-sm font-bold ${
                        slot.taken
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {slot.number}
                    </span>

                    {slot.taken ? (
                      <div>
                        <p className="font-medium text-foreground">{slot.performerName}</p>
                        {slot.performerInstagram && (
                          <p className="text-xs text-muted-foreground font-mono">
                            @{slot.performerInstagram.replace(/^@/, "")}
                          </p>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => handleTakeSlot(slot.number)}
                        className="text-muted-foreground hover:text-accent font-medium transition-colors cursor-pointer"
                      >
                        Sign up for this slot
                      </button>
                    )}
                  </div>

                  {slot.taken && !isHost && (
                    <button
                      onClick={() => handleRemoveSlot(slot.number)}
                      className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      title="Click to remove yourself"
                    >
                      Drop Out
                    </button>
                  )}
                </div>

                {/* Host-only: show email + remove button */}
                {isHost && slot.taken && (
                  <div className="ml-0 flex items-center justify-between rounded-b-xl border border-t-0 border-border bg-secondary/30 px-4 py-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span className="font-mono text-xs">
                        {slot.performerEmail || "No email provided"}
                      </span>
                    </div>
                    <button
                      onClick={() => handleHostRemove(slot.number)}
                      className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 cursor-pointer transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {isFull && (
            <div className="mt-8 rounded-xl border-2 border-dashed border-border p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Mic2 className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Waitlist</h3>
              <p className="mt-2 text-muted-foreground">
                {"You might get bumped up. You probably won't."}
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                {"(Waitlist feature coming soon. For now, just show up and hope.)"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Signup Modal */}
      <SignupModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        slotNumber={selectedSlot || 0}
        onSubmit={handleSignup}
      />

      {/* Remove Modal (for performers) */}
      <RemoveModal
        open={removeModalOpen}
        onOpenChange={setRemoveModalOpen}
        slotNumber={slotToRemove?.number || 0}
        performerName={slotToRemove?.performerName || ""}
        onSubmit={handleRemoveConfirm}
      />

      {/* Host PIN Modal */}
      <HostPinModal
        open={hostPinModalOpen}
        onOpenChange={setHostPinModalOpen}
        onSubmit={handleHostPinSubmit}
      />

      {/* Edit Mic Modal (host only) */}
      {mic && (
        <EditMicModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          micData={{
            slug: mic.slug,
            name: mic.name,
            venue: mic.venue,
            date: mic.date,
            startTime: mic.startTime,
            endTime: mic.endTime,
            notes: mic.notes || undefined,
            totalSlots: mic.totalSlots,
          }}
          currentFilledSlots={filledSlots}
          onSave={handleEditSave}
        />
      )}
    </main>
  )
}
