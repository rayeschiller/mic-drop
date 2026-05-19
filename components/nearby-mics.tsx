'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { MapPin, Loader2, Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getUpcomingMicsWithLocation, type MicLocationData } from '@/app/actions'
import Link from 'next/link'

const MicMap = dynamic(() => import('@/components/mic-map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-secondary/30 rounded-xl">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  ),
})

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toMiles(km: number) {
  return km * 0.621371
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatTime(timeStr: string) {
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
}

type GeoState = 'idle' | 'loading' | 'granted' | 'denied' | 'unsupported'

export function NearbyMics() {
  const [geoState, setGeoState] = useState<GeoState>('idle')
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [allMics, setAllMics] = useState<MicLocationData[]>([])
  const [sortedMics, setSortedMics] = useState<(MicLocationData & { distanceMi: number })[]>([])
  const [micsLoaded, setMicsLoaded] = useState(false)

  // Fetch all mics with location once
  useEffect(() => {
    getUpcomingMicsWithLocation().then((mics) => {
      setAllMics(mics)
      setMicsLoaded(true)
    })
  }, [])

  // Sort by distance once we have user location and mics
  useEffect(() => {
    if (!userLocation || !allMics.length) return
    const [lat, lng] = userLocation
    const sorted = allMics
      .map((m) => ({
        ...m,
        distanceMi: toMiles(haversineKm(lat, lng, m.latitude, m.longitude)),
      }))
      .sort((a, b) => a.distanceMi - b.distanceMi)
    setSortedMics(sorted)
  }, [userLocation, allMics])

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGeoState('unsupported')
      return
    }
    setGeoState('loading')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude])
        setGeoState('granted')
      },
      () => setGeoState('denied'),
      { timeout: 10000 }
    )
  }

  const mapCenter: [number, number] = userLocation ?? [39.5, -98.35]
  const mapZoom = userLocation ? 10 : 4
  const displayMics = userLocation ? sortedMics : allMics.map((m) => ({ ...m, distanceMi: 0 }))

  if (!micsLoaded) {
    return (
      <section className="border-t border-border">
        <div className="mx-auto max-w-5xl px-6 py-24 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </section>
    )
  }

  if (allMics.length === 0) return null

  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <h2 className="text-3xl font-bold md:text-4xl">
              Mics near <span className="text-neon-green">you</span>
            </h2>
            <p className="mt-2 text-muted-foreground">
              Upcoming open mics with open slots.
            </p>
          </div>
          {geoState !== 'granted' && (
            <Button
              onClick={requestLocation}
              disabled={geoState === 'loading'}
              variant="outline"
              className="shrink-0 border-neon-green text-neon-green hover:bg-neon-green/10 font-semibold"
            >
              {geoState === 'loading' ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Locating…</>
              ) : (
                <><Navigation className="mr-2 h-4 w-4" />Find near me</>
              )}
            </Button>
          )}
        </div>

        {geoState === 'denied' && (
          <p className="mb-6 text-sm text-muted-foreground rounded-lg border border-border bg-secondary/30 px-4 py-3">
            Location access was denied. Enable it in your browser settings to sort by distance.
          </p>
        )}

        {/* Map */}
        <div className="w-full h-72 md:h-96 rounded-xl overflow-hidden border border-border mb-8">
          <MicMap mics={displayMics} userLocation={userLocation} center={mapCenter} zoom={mapZoom} />
        </div>

        {/* List */}
        <div className="space-y-3">
          {displayMics.slice(0, 20).map((mic) => {
            const open = mic.totalSlots - mic.takenSlots
            return (
              <Link
                key={mic.id}
                href={`/${mic.slug}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 hover:border-neon-green transition-colors group"
              >
                <div className="min-w-0">
                  <p className="font-bold text-foreground group-hover:text-neon-green transition-colors truncate">
                    {mic.name}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      {mic.venue}{mic.city ? ` · ${mic.city}${mic.state ? `, ${mic.state}` : ''}` : ''}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {formatDate(mic.date)} · {formatTime(mic.startTime)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {userLocation && (
                    <p className="text-xs text-muted-foreground mb-1">{mic.distanceMi.toFixed(1)} mi</p>
                  )}
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      open === 0
                        ? 'bg-destructive/10 text-destructive'
                        : open <= 3
                        ? 'bg-neon-amber/10 text-neon-amber'
                        : 'bg-neon-green/10 text-neon-green'
                    }`}
                  >
                    {open === 0 ? 'Full' : `${open} open`}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
