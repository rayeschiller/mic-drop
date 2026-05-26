'use client'

import { useEffect, useRef, useState } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { MapPin, X } from 'lucide-react'

export interface PlaceResult {
  placeId: string
  name: string | null
  formattedAddress: string
  latitude: number
  longitude: number
}

interface PlaceAutocompleteProps {
  value: PlaceResult | null
  onChange: (place: PlaceResult | null) => void
  size?: "default" | "sm"
}

export function PlaceAutocomplete({ value, onChange, size = "default" }: PlaceAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [inputValue, setInputValue] = useState(value?.formattedAddress ?? '')
  const placesLib = useMapsLibrary('places')
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)

  useEffect(() => {
    if (!placesLib || !inputRef.current) return

    const ac = new placesLib.Autocomplete(inputRef.current, {
      fields: ['place_id', 'name', 'formatted_address', 'geometry'],
    })
    autocompleteRef.current = ac

    const listener = ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      if (!place.place_id || !place.geometry?.location) return
      const result: PlaceResult = {
        placeId: place.place_id,
        name: place.name ?? null,
        formattedAddress: place.formatted_address ?? inputRef.current?.value ?? '',
        latitude: place.geometry.location.lat(),
        longitude: place.geometry.location.lng(),
      }
      setInputValue(result.formattedAddress)
      onChange(result)
    })

    return () => {
      google.maps.event.removeListener(listener)
      google.maps.event.clearInstanceListeners(ac)
    }
  }, [placesLib, onChange])

  const handleClear = () => {
    setInputValue('')
    onChange(null)
    inputRef.current?.focus()
  }

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value)
          if (!e.target.value) onChange(null)
        }}
        placeholder='e.g. "The Laugh Factory, Los Angeles, CA"'
        className={`w-full pl-10 pr-10 rounded-md border border-border bg-secondary/50 focus:border-neon-pink focus:outline-none placeholder:text-muted-foreground/50 ${
          size === "sm"
            ? "h-10 text-sm"
            : "h-12 text-lg"
        }`}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Clear location"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
