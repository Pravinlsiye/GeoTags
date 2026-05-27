import { createStore } from 'solid-js/store'
import type { ExportFormat } from './utils/gps-embed'

export type { ExportFormat }
export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'tiff' | 'heic' | 'other'

export interface GpsCoords {
  lat: number
  lng: number
  alt?: number
}

export interface ExifMetadata {
  // Camera
  make?: string
  model?: string
  lensModel?: string
  // Exposure
  fNumber?: number
  exposureTime?: number
  iso?: number
  focalLength?: number
  focalLengthIn35mm?: number
  // DateTime
  dateTimeOriginal?: Date | string
  dateTime?: Date | string
  // GPS
  latitude?: number
  longitude?: number
  altitude?: number
  gpsDateStamp?: string
  // Image
  imageWidth?: number
  imageHeight?: number
  orientation?: number
  colorSpace?: number | string
  software?: string
  // Flash
  flash?: number | string
  // White balance
  whiteBalance?: number | string
  // Extra raw data
  [key: string]: unknown
}

export interface AppState {
  // Source file
  file: File | null
  imageSrc: string | null
  imageFormat: ImageFormat | null
  // Parsed EXIF
  exifData: ExifMetadata | null
  // GPS coordinates being edited (may differ from original exif)
  gps: GpsCoords | null
  // Location picked on map (latest map click)
  mapCoords: GpsCoords | null
  // Reverse-geocoded place name (short label for UI)
  placeName: string | null
  placeLoading: boolean
  // Stamp fields (all editable by user)
  stampTitle: string       // "Chennai, Tamil Nadu, India 🇮🇳"
  stampLabel: string       // user-defined label, e.g. company name
  stampAddress: string     // full address, auto-filled but editable
  stampDateTime: string    // ISO datetime-local string; empty = use current time at export
  stampMapZoom: number     // 10 (city) → 18 (street-level) for the stamp map thumbnail
  exportFilename: string   // base name without extension, editable before download
  // UI state
  exportFormat: ExportFormat
  overlayEnabled: boolean
  exportLoading: boolean
  error: string | null
}

const initialState: AppState = {
  file: null,
  imageSrc: null,
  imageFormat: null,
  exifData: null,
  gps: null,
  mapCoords: null,
  placeName: null,
  placeLoading: false,
  stampTitle: '',
  stampLabel: '',
  stampAddress: '',
  stampDateTime: '',
  stampMapZoom: 15,
  exportFilename: '',
  exportFormat: 'jpeg',
  overlayEnabled: false,
  exportLoading: false,
  error: null,
}

export const [state, setState] = createStore<AppState>(initialState)

export function resetState() {
  setState({
    file: null,
    imageSrc: null,
    imageFormat: null,
    exifData: null,
    gps: null,
    mapCoords: null,
    placeName: null,
    placeLoading: false,
    stampTitle: '',
    stampLabel: '',
    stampAddress: '',
    stampDateTime: '',
    stampMapZoom: 15,
    exportFilename: '',
    exportFormat: 'jpeg',
    overlayEnabled: false,
    exportLoading: false,
    error: null,
  })
}
