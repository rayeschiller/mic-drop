import { beforeEach, describe, expect, it, vi } from 'vitest'

const maps = vi.hoisted(() => ({ moveCamera: vi.fn(), status: 'LOADED' }))
vi.mock('react', async (importOriginal) => ({
  ...await importOriginal<typeof import('react')>(),
  useState: () => [null, vi.fn()],
  useEffect: (effect: () => void) => effect(),
}))
vi.mock('@vis.gl/react-google-maps', () => ({
  Map: 'mock-map', AdvancedMarker: 'mock-marker', InfoWindow: 'mock-window',
  useMap: () => ({ moveCamera: maps.moveCamera }),
  useApiLoadingStatus: () => maps.status,
  APILoadingStatus: { FAILED: 'FAILED', AUTH_FAILURE: 'AUTH_FAILURE' },
}))
import MicMap from '@/components/mic-map'

describe('mic map', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'test-key')
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID', '')
    maps.status = 'LOADED'
    maps.moveCamera.mockClear()
  })

  const props = { mics: [], userLocation: null, center: { lat: 39.5, lng: -98.35 }, zoom: 4 }

  it('uses a valid demo map ID unless a configured ID is supplied', () => {
    expect(MicMap(props).props.mapId).toBe('DEMO_MAP_ID')
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID', ' custom-id ')
    expect(MicMap(props).props.mapId).toBe('custom-id')
  })

  it('moves the camera to the new location and zoom', () => {
    for (const camera of [props, { ...props, center: { lat: 34.05, lng: -118.24 }, zoom: 10 }]) {
      const element = MicMap(camera).props.children[0]
      element.type(element.props)
      expect(maps.moveCamera).toHaveBeenLastCalledWith({ center: camera.center, zoom: camera.zoom })
    }
  })

  it.each(['FAILED', 'AUTH_FAILURE'])('shows a fallback for %s', (status) => {
    maps.status = status
    expect(MicMap(props).props.role).toBe('status')
  })

  it('shows a fallback when no API key is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', '')
    expect(MicMap(props).props.role).toBe('status')
  })
})
