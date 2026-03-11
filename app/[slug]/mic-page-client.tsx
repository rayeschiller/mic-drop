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
  CalendarPlus,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SignupModal } from "@/components/signup-modal"
import { RemoveModal } from "@/components/remove-modal"
import { HostPinModal } from "@/components/host-pin-modal"
import { EditMicModal } from "@/components/edit-mic-modal"
import {
  getMic,
  getMicWithEmails,
  getMicsBySeries,
  signupForSlot,
  removeFromSlot,
  verifyHostPin,
  hostRemoveSlot,
  hostUpdateMic,
  type MicData,
  type SlotData,
  type SectionData,
  type SectionInput,
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

function formatDateShort(dateString: string): string {
  const date = new Date(dateString + "T00:00:00")
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function toICSDate(date: string, time: string): string {
  const [year, month, day] = date.split("-")
  const [hour, minute] = time.split(":")
  return `${year}${month}${day}T${hour}${minute}00`
}

function downloadICS(mic: { name: string; venue: string; date: string; startTime: string; endTime: string | null; notes: string | null; slug: string }) {
  const start = toICSDate(mic.date, mic.startTime)
  const end = mic.endTime ? toICSDate(mic.date, mic.endTime) : toICSDate(mic.date, mic.startTime)
  const url = `${window.location.origin}/${mic.slug}`
  const description = mic.notes ? mic.notes.replace(/\n/g, "\\n") : ""

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mic Drop//EN",
    "BEGIN:VEVENT",
    `SUMMARY:${mic.name}`,
    `LOCATION:${mic.venue}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `DESCRIPTION:${description}\\n\\nSign up: ${url}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")

  const blob = new Blob([ics], { type: "text/calendar" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = `${mic.name.toLowerCase().replace(/\s+/g, "-")}.ics`
  link.click()
  URL.revokeObjectURL(link.href)
}

function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(":")
  const hour = Number.parseInt(hours)
  const ampm = hour >= 12 ? "PM" : "AM"
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

function SlotRow({
  slot,
  displayNumber,
  isHost,
  onTake,
  onRemove,
  onHostRemove,
}: {
  slot: SlotData
  displayNumber: number
  isHost: boolean
  onTake: () => void
  onRemove: () => void
  onHostRemove: () => void
}) {
  return (
    <div>
      <div
        className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-all duration-200 ${
          slot.taken
            ? "border-border bg-card"
            : "border-dashed border-border/50 bg-card/50 hover:border-primary/50 hover:bg-card"
        } ${isHost && slot.taken ? "rounded-b-none" : ""}`}
      >
        <div className="flex items-center gap-4">
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-sm font-bold flex-shrink-0 ${
              slot.taken
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {displayNumber}
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
              onClick={onTake}
              className="text-muted-foreground hover:text-accent font-medium transition-colors cursor-pointer"
            >
              Sign up for this slot
            </button>
          )}
        </div>

        {slot.taken && !isHost && (
          <button
            onClick={onRemove}
            className="text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
            title="Click to remove yourself"
          >
            Drop Out
          </button>
        )}
      </div>

      {isHost && slot.taken && (
        <div className="flex items-center justify-between rounded-b-xl border border-t-0 border-border bg-secondary/30 px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            <span className="font-mono text-xs">
              {slot.performerEmail || "No email provided"}
            </span>
          </div>
          <button
            onClick={onHostRemove}
            className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 cursor-pointer transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      )}
    </div>
  )
}

export function MicPageClient({ slug }: { slug: string }) {
  const router = useRouter()
  const [mic, setMic] = useState<MicData | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ number: number; displayNumber: number } | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [removeModalOpen, setRemoveModalOpen] = useState(false)
  const [slotToRemove, setSlotToRemove] = useState<{ slot: SlotData; displayNumber: number } | null>(null)
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Host mode state
  const [isHost, setIsHost] = useState(false)
  const [hostPin, setHostPin] = useState<string | null>(null)
  const [hostPinModalOpen, setHostPinModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)

  // Series / other dates
  const [otherDates, setOtherDates] = useState<{ id: string; slug: string; name: string; date: string; startTime: string }[]>([])

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

  // Fetch other dates in series when mic loads
  useEffect(() => {
    if (mic?.seriesSlug) {
      getMicsBySeries(mic.seriesSlug, mic.id).then(setOtherDates)
    } else {
      setOtherDates([])
    }
  }, [mic?.seriesSlug, mic?.id])

  const handleTakeSlot = (slotNumber: number, displayNumber: number) => {
    setSelectedSlot({ number: slotNumber, displayNumber })
    setModalOpen(true)
  }

  const handleSignup = async (name: string, instagram: string, email: string) => {
    const result = await signupForSlot(slug, selectedSlot!.number, name, instagram, email)
    if (result.success) {
      await loadMic()
      setModalOpen(false)
      setSelectedSlot(null)
    } else {
      alert(result.error || "Failed to sign up. The slot may already be taken.")
    }
  }

  const handleRemoveSlot = (slot: SlotData, displayNumber: number) => {
    if (slot.taken) {
      setSlotToRemove({ slot, displayNumber })
      setRemoveModalOpen(true)
    }
  }

  const handleRemoveConfirm = async (email: string): Promise<boolean> => {
    if (!slotToRemove) return false
    const result = await removeFromSlot(slug, slotToRemove.slot.number, email)
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
    seriesSlug?: string | null
    seriesName?: string | null
    sections?: SectionInput[]
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

  const hasSections = mic.sections.length > 0

  // Totals across all sections (or legacy flat slots)
  const totalSlots = hasSections
    ? mic.sections.reduce((sum, s) => sum + s.totalSlots, 0)
    : mic.totalSlots
  const filledSlots = hasSections
    ? mic.sections.reduce((sum, s) => sum + s.slots.filter((sl) => sl.taken).length, 0)
    : mic.slots.filter((s) => s.taken).length
  const availableSlotsCount = totalSlots - filledSlots
  const isFull = availableSlotsCount === 0

  // Header time: first section start – last section end (or legacy)
  const displayStartTime = hasSections ? mic.sections[0].startTime : mic.startTime
  const displayEndTime = hasSections
    ? mic.sections[mic.sections.length - 1].endTime
    : mic.endTime

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

      <div className={`mx-auto px-6 py-12 ${mic.imageUrl ? "max-w-5xl" : "max-w-3xl"}`}>
        <div className={mic.imageUrl ? "flex flex-col md:grid md:grid-cols-[1fr_300px] gap-8 items-start" : ""}>

          {/* Mobile image — above content */}
          {mic.imageUrl && (
            <img
              src={mic.imageUrl}
              alt={mic.name}
              className="md:hidden w-full rounded-2xl object-cover"
            />
          )}

          {/* Main content column */}
          <div>
            {/* Mic Header */}
            <div className="relative overflow-hidden rounded-2xl border-2 border-primary bg-card mb-8">
              <div className="relative p-8 md:p-12">
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
                        {formatTime(displayStartTime)}{displayEndTime ? ` - ${formatTime(displayEndTime)}` : ""}
                        {hasSections && mic.sections.length > 1 && (
                          <span className="ml-2 text-sm text-white/70">({mic.sections.length} sets)</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-white flex-shrink-0" />
                      <span className={`text-lg font-bold ${isFull ? "text-destructive" : "text-accent"}`}>
                        {isFull
                          ? "Congrats, this mic is emotionally unavailable."
                          : `${availableSlotsCount} of ${totalSlots} slots left`}
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

                  <div className="mt-8">
                    <button
                      onClick={() => downloadICS(mic)}
                      className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:border-neon-green hover:text-neon-green transition-colors"
                    >
                      <CalendarPlus className="h-4 w-4" />
                      Add to calendar
                    </button>
                  </div>
                </div>
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

              {hasSections ? (
                /* Multi-section display */
                <div className="space-y-6">
                  {mic.sections.map((section) => (
                    <SectionSlotGroup
                      key={section.id}
                      section={section}
                      isHost={isHost}
                      onTakeSlot={handleTakeSlot}
                      onRemoveSlot={handleRemoveSlot}
                      onHostRemove={handleHostRemove}
                    />
                  ))}
                </div>
              ) : (
                /* Legacy flat slot display */
                <div className="space-y-3">
                  {mic.slots.map((slot) => (
                    <SlotRow
                      key={slot.number}
                      slot={slot}
                      displayNumber={slot.number}
                      isHost={isHost}
                      onTake={() => handleTakeSlot(slot.number, slot.number)}
                      onRemove={() => handleRemoveSlot(slot, slot.number)}
                      onHostRemove={() => handleHostRemove(slot.number)}
                    />
                  ))}
                </div>
              )}

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

            {/* Other dates in series */}
            {otherDates.length > 0 && (
              <div className="mt-10 space-y-3">
                <h2 className="text-xl font-bold text-foreground">
                  {mic.seriesName ? `Other ${mic.seriesName} Dates` : "Other Dates"}
                </h2>
                <div className="rounded-xl border border-border overflow-hidden">
                  {otherDates.map((d, idx) => (
                    <Link
                      key={d.id}
                      href={`/${d.slug}`}
                      className={`flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors ${
                        idx < otherDates.length - 1 ? "border-b border-border" : ""
                      }`}
                    >
                      <div>
                        <p className="font-medium text-foreground text-sm">{formatDateShort(d.date)}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(d.startTime)}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

          </div>{/* end main content column */}

          {/* Desktop sticky image */}
          {mic.imageUrl && (
            <div className="hidden md:block sticky top-6">
              <img
                src={mic.imageUrl}
                alt={mic.name}
                className="w-full rounded-2xl object-cover shadow-2xl"
              />
            </div>
          )}

        </div>{/* end grid */}
      </div>

      {/* Signup Modal */}
      <SignupModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        slotNumber={selectedSlot?.displayNumber || 0}
        onSubmit={handleSignup}
      />

      {/* Remove Modal (for performers) */}
      <RemoveModal
        open={removeModalOpen}
        onOpenChange={setRemoveModalOpen}
        slotNumber={slotToRemove?.displayNumber || 0}
        performerName={slotToRemove?.slot.performerName || ""}
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
            endTime: mic.endTime ?? "",
            notes: mic.notes || undefined,
            totalSlots: mic.totalSlots,
            imageUrl: mic.imageUrl,
            sections: mic.sections.length > 0 ? mic.sections : undefined,
            seriesSlug: mic.seriesSlug,
            seriesName: mic.seriesName,
          }}
          currentFilledSlots={filledSlots}
          onSave={handleEditSave}
        />
      )}
    </main>
  )
}

function SectionSlotGroup({
  section,
  isHost,
  onTakeSlot,
  onRemoveSlot,
  onHostRemove,
}: {
  section: SectionData
  isHost: boolean
  onTakeSlot: (slotNumber: number, displayNumber: number) => void
  onRemoveSlot: (slot: SlotData, displayNumber: number) => void
  onHostRemove: (slotNumber: number) => void
}) {
  const filled = section.slots.filter((s) => s.taken).length
  const available = section.totalSlots - filled

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-semibold text-foreground">
            {formatTime(section.startTime)}
            {section.endTime ? ` – ${formatTime(section.endTime)}` : ""}
          </span>
          {section.name && (
            <span className="text-sm text-muted-foreground">· {section.name}</span>
          )}
        </div>
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {available} / {section.totalSlots} open
        </span>
      </div>

      {/* Slots */}
      <div className="space-y-3 pl-0">
        {section.slots.map((slot, idx) => (
          <SlotRow
            key={slot.number}
            slot={slot}
            displayNumber={idx + 1}
            isHost={isHost}
            onTake={() => onTakeSlot(slot.number, idx + 1)}
            onRemove={() => onRemoveSlot(slot, idx + 1)}
            onHostRemove={() => onHostRemove(slot.number)}
          />
        ))}
      </div>
    </div>
  )
}
