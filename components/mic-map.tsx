'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { MicLocationData } from '@/app/actions'

// Fix Leaflet's broken default icon paths in webpack/Next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const userIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;background:#ec4899;border:3px solid white;border-radius:50%;box-shadow:0 0 0 2px #ec4899;"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

function FitBounds({ mics, userLocation }: { mics: MicLocationData[]; userLocation: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    const points: [number, number][] = mics.map((m) => [m.latitude, m.longitude])
    if (userLocation) points.push(userLocation)
    if (points.length === 0) return
    if (points.length === 1) {
      map.setView(points[0], 13)
      return
    }
    const bounds = L.latLngBounds(points)
    map.fitBounds(bounds, { padding: [40, 40] })
  }, [map, mics, userLocation])
  return null
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

interface MicMapProps {
  mics: MicLocationData[]
  userLocation: [number, number] | null
  center: [number, number]
  zoom: number
}

export default function MicMap({ mics, userLocation, center, zoom }: MicMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds mics={mics} userLocation={userLocation} />

      {userLocation && (
        <Marker position={userLocation} icon={userIcon}>
          <Popup>You are here</Popup>
        </Marker>
      )}

      {mics.map((mic) => (
        <Marker key={mic.id} position={[mic.latitude, mic.longitude]} icon={defaultIcon}>
          <Popup>
            <div style={{ minWidth: '160px' }}>
              <strong style={{ display: 'block', marginBottom: '4px' }}>{mic.name}</strong>
              <span style={{ color: '#6b7280', fontSize: '13px', display: 'block' }}>{mic.venue}</span>
              <span style={{ color: '#6b7280', fontSize: '13px', display: 'block' }}>
                {formatDate(mic.date)} · {formatTime(mic.startTime)}
              </span>
              <span style={{ color: '#6b7280', fontSize: '13px', display: 'block', marginBottom: '8px' }}>
                {mic.totalSlots - mic.takenSlots} slots open
              </span>
              <a
                href={`/${mic.slug}`}
                style={{ color: '#ec4899', fontWeight: 600, fontSize: '13px', textDecoration: 'none' }}
              >
                View & Sign Up →
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
