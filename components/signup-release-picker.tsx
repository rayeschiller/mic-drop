"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Clock } from "lucide-react"

const TIMEZONES = [
  { label: "Eastern (ET)", value: "America/New_York" },
  { label: "Central (CT)", value: "America/Chicago" },
  { label: "Mountain (MT)", value: "America/Denver" },
  { label: "Pacific (PT)", value: "America/Los_Angeles" },
  { label: "Alaska (AKT)", value: "America/Anchorage" },
  { label: "Hawaii (HT)", value: "Pacific/Honolulu" },
  { label: "London (GMT/BST)", value: "Europe/London" },
  { label: "Paris/Berlin (CET)", value: "Europe/Paris" },
  { label: "Moscow (MSK)", value: "Europe/Moscow" },
  { label: "Dubai (GST)", value: "Asia/Dubai" },
  { label: "India (IST)", value: "Asia/Kolkata" },
  { label: "Bangkok (ICT)", value: "Asia/Bangkok" },
  { label: "China (CST)", value: "Asia/Shanghai" },
  { label: "Japan/Korea (JST)", value: "Asia/Tokyo" },
  { label: "Sydney (AET)", value: "Australia/Sydney" },
  { label: "Auckland (NZST)", value: "Pacific/Auckland" },
  { label: "Buenos Aires (ART)", value: "America/Argentina/Buenos_Aires" },
  { label: "São Paulo (BRT)", value: "America/Sao_Paulo" },
]

function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return "America/New_York"
  }
}

function getTimezoneOffsetMs(approxUTC: Date, tz: string): number {
  const utcStr = approxUTC.toLocaleString("en-US", { timeZone: "UTC" })
  const tzStr = approxUTC.toLocaleString("en-US", { timeZone: tz })
  return new Date(tzStr).getTime() - new Date(utcStr).getTime()
}

export function localDateTimeToUTC(dateStr: string, timeStr: string, tz: string): string {
  const localAsUTC = new Date(`${dateStr}T${timeStr}:00Z`)
  const offsetMs = getTimezoneOffsetMs(localAsUTC, tz)
  return new Date(localAsUTC.getTime() - offsetMs).toISOString()
}

export function utcToLocalDateTime(utcISO: string, tz: string): { date: string; time: string } {
  const d = new Date(utcISO)
  const datePart = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
  const timePart = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d)
  return { date: datePart, time: timePart }
}

interface SignupReleasePickerProps {
  value: string | null // UTC ISO string
  onChange: (utcISO: string | null) => void
}

export function SignupReleasePicker({ value, onChange }: SignupReleasePickerProps) {
  const [enabled, setEnabled] = useState(!!value)
  const [tz, setTz] = useState<string>(getBrowserTimezone)
  const [date, setDate] = useState("")
  const [time, setTime] = useState("19:00")
  const [initialized, setInitialized] = useState(false)
  const [pastError, setPastError] = useState(false)

  useEffect(() => {
    if (initialized) return
    setInitialized(true)
    const browserTz = getBrowserTimezone()
    setTz(browserTz)
    if (value) {
      setEnabled(true)
      const local = utcToLocalDateTime(value, browserTz)
      setDate(local.date)
      setTime(local.time)
    }
  }, [value, initialized])

  const emit = (d: string, t: string, z: string) => {
    if (!d || !t) return
    const utc = localDateTimeToUTC(d, t, z)
    if (new Date(utc) <= new Date()) {
      setPastError(true)
      onChange(null)
    } else {
      setPastError(false)
      onChange(utc)
    }
  }

  const handleToggle = (checked: boolean) => {
    setEnabled(checked)
    if (!checked) {
      onChange(null)
    } else if (date && time) {
      emit(date, time, tz)
    }
  }

  const tzOptions = TIMEZONES.some((t) => t.value === tz)
    ? TIMEZONES
    : [{ label: tz, value: tz }, ...TIMEZONES]

  return (
    <div className="space-y-3 rounded-xl border border-border/50 bg-secondary/10 p-4">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => handleToggle(e.target.checked)}
          className="h-4 w-4 accent-neon-pink"
        />
        <div>
          <span className="font-bold text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-neon-pink" />
            Schedule signup release
          </span>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visitors can see the page but can{"'"}t sign up until the scheduled time.
          </p>
        </div>
      </label>

      {enabled && (
        <div className="space-y-2 pt-1">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => { setDate(e.target.value); emit(e.target.value, time, tz) }}
              className="h-10 border-border bg-secondary/50 focus:border-neon-pink"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Time</Label>
            <Input
              type="time"
              value={time}
              onChange={(e) => { setTime(e.target.value); emit(date, e.target.value, tz) }}
              className="h-10 border-border bg-secondary/50 focus:border-neon-pink"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Timezone</Label>
            <select
              value={tz}
              onChange={(e) => { setTz(e.target.value); emit(date, time, e.target.value) }}
              className="w-full h-10 rounded-md border border-border bg-secondary/50 px-3 text-sm focus:border-neon-pink focus:outline-none"
            >
              {tzOptions.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
        {pastError && (
          <p className="text-sm text-destructive">Release time must be in the future.</p>
        )}
        </div>
      )}
    </div>
  )
}
