"use client"

import { useState } from "react"
import Link from "next/link"
import { MapPin, Loader2, Navigation, CalendarDays, Clock } from "lucide-react"
import { getMicsNearLocation } from "@/app/actions"

type NearbyMic = Awaited<ReturnType<typeof getMicsNearLocation>>[number]

function formatDate(dateString: string): string {
  return new Date(dateString + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(":")
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? "PM" : "AM"
  return `${hour % 12 || 12}:${minutes} ${ampm}`
}

function formatDistance(miles: number): string {
  if (miles < 1) return "< 1 mile away"
  return `${Math.round(miles)} mile${Math.round(miles) !== 1 ? "s" : ""} away`
}

export function NearbyMics() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "denied" | "error">("idle")
  const [mics, setMics] = useState<NearbyMic[]>([])

  const findNearby = () => {
    if (!navigator.geolocation) {
      setState("error")
      return
    }
    setState("loading")
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const results = await getMicsNearLocation(pos.coords.latitude, pos.coords.longitude)
        setMics(results)
        setState("done")
      },
      (err) => {
        setState(err.code === err.PERMISSION_DENIED ? "denied" : "error")
      }
    )
  }

  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <div className="flex flex-col items-center text-center mb-12">
          <h2 className="text-3xl font-bold md:text-4xl mb-3">
            Mics <span className="text-neon-green">near you</span>
          </h2>
          <p className="text-muted-foreground max-w-md">
            Find upcoming open mics in your area and grab a slot before they fill up.
          </p>
        </div>

        {state === "idle" && (
          <div className="flex justify-center">
            <button
              onClick={findNearby}
              className="flex items-center gap-2 rounded-xl border-2 border-neon-green/50 bg-neon-green/10 px-6 py-3 font-bold text-neon-green hover:bg-neon-green/20 transition-all"
            >
              <Navigation className="h-5 w-5" />
              Find mics near me
            </button>
          </div>
        )}

        {state === "loading" && (
          <div className="flex justify-center items-center gap-3 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Finding mics near you...
          </div>
        )}

        {state === "denied" && (
          <p className="text-center text-muted-foreground text-sm">
            Location access was denied. Enable it in your browser settings and try again.
          </p>
        )}

        {state === "error" && (
          <p className="text-center text-muted-foreground text-sm">
            Couldn't get your location. Try again.
          </p>
        )}

        {state === "done" && mics.length === 0 && (
          <div className="text-center space-y-3">
            <p className="text-muted-foreground">No upcoming mics found within 25 miles.</p>
            <p className="text-sm text-muted-foreground">
              Be the first —{" "}
              <Link href="/create" className="text-neon-pink hover:underline font-medium">
                host one
              </Link>
              .
            </p>
          </div>
        )}

        {state === "done" && mics.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mics.map((mic) => (
              <Link
                key={mic.slug}
                href={`/${mic.slug}`}
                className="group rounded-xl border border-border bg-card p-5 hover:border-neon-green transition-colors space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-bold text-base leading-snug group-hover:text-neon-green transition-colors">
                    {mic.name}
                  </h3>
                  <span className="text-xs text-neon-green font-medium whitespace-nowrap">
                    {formatDistance(mic.distanceMiles)}
                  </span>
                </div>
                <div className="space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    {mic.venue}
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
                    {formatDate(mic.date)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                    {formatTime(mic.startTime)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
