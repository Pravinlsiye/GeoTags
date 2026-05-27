import * as exifr from 'exifr'
import type { ExifMetadata, GpsCoords, ImageFormat } from '../store'

/** Detect image format from MIME type or filename */
export function detectFormat(file: File): ImageFormat {
  const mime = file.type.toLowerCase()
  const name = file.name.toLowerCase()

  if (mime === 'image/jpeg' || name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'jpeg'
  if (mime === 'image/png' || name.endsWith('.png')) return 'png'
  if (mime === 'image/webp' || name.endsWith('.webp')) return 'webp'
  if (mime === 'image/tiff' || name.endsWith('.tif') || name.endsWith('.tiff')) return 'tiff'
  if (
    mime === 'image/heic' ||
    mime === 'image/heif' ||
    name.endsWith('.heic') ||
    name.endsWith('.heif')
  )
    return 'heic'
  return 'other'
}

export interface ParsedExif {
  metadata: ExifMetadata
  gps: GpsCoords | null
}

/** Parse all EXIF from an image File */
export async function parseExif(file: File): Promise<ParsedExif> {
  let raw: Record<string, unknown> = {}

  try {
    raw = (await exifr.parse(file, {
      tiff: true,
      xmp: true,
      icc: false,
      iptc: false,
      jfif: false,
      ihdr: false,
      gps: true,
      exif: true,
      translateKeys: true,
      translateValues: false,
      reviveValues: true,
    })) ?? {}
  } catch {
    // File may have no EXIF - return empty
  }

  const metadata: ExifMetadata = {}

  // Camera
  if (raw.Make) metadata.make = String(raw.Make)
  if (raw.Model) metadata.model = String(raw.Model)
  if (raw.LensModel) metadata.lensModel = String(raw.LensModel)

  // Exposure
  if (raw.FNumber != null) metadata.fNumber = Number(raw.FNumber)
  if (raw.ExposureTime != null) metadata.exposureTime = Number(raw.ExposureTime)
  if (raw.ISO != null) metadata.iso = Number(raw.ISO)
  if (raw.FocalLength != null) metadata.focalLength = Number(raw.FocalLength)
  if (raw.FocalLengthIn35mmFormat != null)
    metadata.focalLengthIn35mm = Number(raw.FocalLengthIn35mmFormat)

  // DateTime
  if (raw.DateTimeOriginal) metadata.dateTimeOriginal = raw.DateTimeOriginal as string | Date
  if (raw.DateTime) metadata.dateTime = raw.DateTime as string | Date

  // GPS
  if (raw.latitude != null) metadata.latitude = Number(raw.latitude)
  if (raw.longitude != null) metadata.longitude = Number(raw.longitude)
  if (raw.GPSAltitude != null) metadata.altitude = Number(raw.GPSAltitude)
  if (raw.GPSDateStamp) metadata.gpsDateStamp = String(raw.GPSDateStamp)

  // Image dims
  if (raw.ImageWidth) metadata.imageWidth = Number(raw.ImageWidth)
  if (raw.ImageHeight) metadata.imageHeight = Number(raw.ImageHeight)
  if (raw.ExifImageWidth && !metadata.imageWidth)
    metadata.imageWidth = Number(raw.ExifImageWidth)
  if (raw.ExifImageHeight && !metadata.imageHeight)
    metadata.imageHeight = Number(raw.ExifImageHeight)

  // Technical
  if (raw.Orientation != null) metadata.orientation = Number(raw.Orientation)
  if (raw.ColorSpace != null) metadata.colorSpace = raw.ColorSpace as string | number
  if (raw.Software) metadata.software = String(raw.Software)
  if (raw.Flash != null) metadata.flash = raw.Flash as string | number
  if (raw.WhiteBalance != null) metadata.whiteBalance = raw.WhiteBalance as string | number

  let gps: GpsCoords | null = null
  if (metadata.latitude != null && metadata.longitude != null) {
    gps = {
      lat: metadata.latitude,
      lng: metadata.longitude,
      alt: metadata.altitude,
    }
  }

  return { metadata, gps }
}
