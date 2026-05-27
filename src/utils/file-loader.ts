import { state, setState } from '../store'
import { parseExif, detectFormat } from './exif-read'
import { reverseGeocode } from './geocode'
import type { GpsCoords } from '../store'

export async function triggerGeocode(lat: number, lng: number) {
  setState('placeLoading', true)
  setState('placeName', null)
  try {
    const result = await reverseGeocode(lat, lng)
    if (result) {
      setState('placeName', result.shortLabel || result.displayName.split(',').slice(0, 3).join(','))
      // Auto-fill stamp fields (only if user hasn't edited them)
      const titleWithFlag = result.flag
        ? `${result.shortLabel} ${result.flag}`
        : result.shortLabel
      setState('stampTitle', titleWithFlag.trim())
      setState('stampAddress', result.fullAddress)
    }
  } finally {
    setState('placeLoading', false)
  }
}

export async function loadFile(file: File, preserveGps = false) {
  const priorGps: GpsCoords | null = preserveGps ? (state.gps ?? null) : null

  if (state.imageSrc?.startsWith('blob:')) URL.revokeObjectURL(state.imageSrc)

  const format = detectFormat(file)
  const imageSrc = URL.createObjectURL(file)

  // Auto-derive export filename from the source file (base name, no extension)
  const baseName = file.name.replace(/\.[^/.]+$/, '')
  const exportFilename = baseName.endsWith('_geotagged') ? baseName : `${baseName}_geotagged`

  setState({
    file,
    imageSrc,
    imageFormat: format,
    exifData: null,
    gps: priorGps,
    mapCoords: priorGps,
    placeName: null,
    stampTitle: '',
    stampAddress: '',
    exportFilename,
    error: null,
  })

  try {
    const { metadata, gps } = await parseExif(file)
    setState('exifData', metadata)

    if (gps) {
      setState('gps', gps)
      setState('mapCoords', gps)
      triggerGeocode(gps.lat, gps.lng)
    } else if (priorGps) {
      triggerGeocode(priorGps.lat, priorGps.lng)
    }
  } catch (err) {
    setState('error', err instanceof Error ? err.message : 'Failed to parse EXIF')
  }
}
