import piexifLib from 'piexifjs'
import type { GpsCoords } from '../store'

// piexifjs is a CJS module with no official types; cast to the shape we use
const piexif = piexifLib as unknown as {
  load: (data: string) => Record<string, Record<number, unknown>>
  dump: (exif: Record<string, Record<number, unknown>>) => string
  insert: (exifStr: string, jpegData: string) => string
  GPSIFD: Record<string, number>
}
import { toJpeg, fileToDataUrl } from './image-utils'

/**
 * Convert decimal degrees to DMS (degrees, minutes, seconds) rational array
 * as required by piexifjs
 */
function decimalToDmsRational(decimal: number): [[number, number], [number, number], [number, number]] {
  const abs = Math.abs(decimal)
  const deg = Math.floor(abs)
  const minFloat = (abs - deg) * 60
  const min = Math.floor(minFloat)
  const sec = Math.round((minFloat - min) * 60 * 100)

  return [
    [deg, 1],
    [min, 1],
    [sec, 100],
  ]
}

/**
 * Inject GPS coordinates into a JPEG data URL and return a Blob.
 * Accepts any image File; non-JPEG files are first converted to JPEG via canvas.
 */
export async function writeGpsToImage(file: File, coords: GpsCoords, isJpeg: boolean): Promise<Blob> {
  let sourceBlob: Blob = file

  // Convert non-JPEG to JPEG first
  if (!isJpeg) {
    sourceBlob = await toJpeg(file)
  }

  const dataUrl = await fileToDataUrl(sourceBlob)

  type ExifObj = Record<string, Record<number, unknown>>

  // Load existing EXIF (or create empty structure)
  let exifObj: ExifObj
  try {
    exifObj = piexif.load(dataUrl)
  } catch {
    exifObj = { '0th': {}, Exif: {}, GPS: {}, '1st': {}, Interop: {} }
  }

  const IFD = piexif.GPSIFD

  exifObj['GPS'] = exifObj['GPS'] ?? {}
  exifObj['GPS'][IFD.GPSLatitudeRef] = coords.lat >= 0 ? 'N' : 'S'
  exifObj['GPS'][IFD.GPSLatitude] = decimalToDmsRational(coords.lat)
  exifObj['GPS'][IFD.GPSLongitudeRef] = coords.lng >= 0 ? 'E' : 'W'
  exifObj['GPS'][IFD.GPSLongitude] = decimalToDmsRational(coords.lng)

  if (coords.alt != null) {
    exifObj['GPS'][IFD.GPSAltitudeRef] = coords.alt >= 0 ? 0 : 1
    exifObj['GPS'][IFD.GPSAltitude] = [Math.round(Math.abs(coords.alt) * 100), 100]
  }

  const exifBytes = piexif.dump(exifObj)
  const newDataUrl = piexif.insert(exifBytes, dataUrl)

  // Convert data URL back to Blob
  const base64 = newDataUrl.split(',')[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: 'image/jpeg' })
}
