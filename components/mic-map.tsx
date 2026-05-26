'use client'

import { useState } from 'react'
import { Map, AdvancedMarker, InfoWindow } from '@vis.gl/react-google-maps'
import type { MicLocationData } from '@/app/actions'

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

interface MicMapProps {
  mics: (MicLocationData & { distanceMi?: number })[]
  userLocation: [number, number] | null
  center: { lat: number; lng: number }
  zoom: number
}

export default function MicMap({ mics, userLocation, center, zoom }: MicMapProps) {
  const [openMicId, setOpenMicId] = useState<string | null>(null)

  return (
    <Map
      defaultCenter={center}
      defaultZoom={zoom}
      mapId="mic-drop-map"
      gestureHandling="cooperative"
      disableDefaultUI={false}
      style={{ width: '100%', height: '100%' }}
    >
      {/* User location dot */}
      {userLocation && (
        <AdvancedMarker position={{ lat: userLocation[0], lng: userLocation[1] }}>
          <div className="w-4 h-4 rounded-full bg-neon-pink border-2 border-white shadow-lg shadow-neon-pink/50" />
        </AdvancedMarker>
      )}

      {mics.map((mic) => {
        const open = mic.totalSlots - mic.takenSlots
        return (
          <div key={mic.id}>
            <AdvancedMarker
              position={{ lat: mic.latitude, lng: mic.longitude }}
              onClick={() => setOpenMicId(mic.id === openMicId ? null : mic.id)}
            >
              <div className="flex flex-col items-center cursor-pointer group">
                <div className="bg-background border-2 border-neon-pink rounded-lg px-2 py-1 shadow-md text-xs font-bold text-foreground group-hover:bg-neon-pink group-hover:text-white transition-colors whitespace-nowrap">
                  {open === 0 ? 'Full' : `${open} open`}
                </div>
                <div className="w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-neon-pink -mt-px" />
              </div>
            </AdvancedMarker>

            {openMicId === mic.id && (
              <InfoWindow
                position={{ lat: mic.latitude, lng: mic.longitude }}
                onCloseClick={() => setOpenMicId(null)}
                pixelOffset={[0, -44]}
              >
                <div className="min-w-[180px] p-1">
                  <p className="font-bold text-sm mb-1">{mic.name}</p>
                  <p className="text-xs text-gray-500 mb-0.5">{mic.venue}</p>
                  {mic.formattedAddress && (
                    <p className="text-xs text-gray-400 mb-0.5">{mic.formattedAddress}</p>
                  )}
                  <p className="text-xs text-gray-500 mb-2">
                    {formatDate(mic.date)} · {formatTime(mic.startTime)}
                  </p>
                  <a
                    href={`/${mic.slug}`}
                    className="text-xs font-semibold text-pink-500 hover:underline"
                  >
                    View &amp; Sign Up →
                  </a>
                </div>
              </InfoWindow>
            )}
          </div>
        )
      })}
    </Map>
  )
}
