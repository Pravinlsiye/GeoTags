/**
 * GPS embedding for JPEG, PNG, and WebP.
 *
 * JPEG → piexifjs (EXIF, no re-encode)
 * PNG  → canvas + XMP in iTXt chunk (GPS via Adobe XMP schema)
 * WebP → canvas + EXIF in RIFF EXIF chunk (VP8X extended format)
 */

import piexifLib from 'piexifjs'
import type { GpsCoords } from '../store'
import { applyGpsOverlay } from './image-overlay'

const piexif = piexifLib as unknown as {
  load: (data: string) => Record<string, Record<number, unknown>>
  dump: (exif: Record<string, Record<number, unknown>>) => string
  insert: (exifStr: string, jpegData: string) => string
  GPSIFD: Record<string, number>
}

export type ExportFormat = 'jpeg' | 'png' | 'webp'

export const FORMAT_META: Record<
  ExportFormat,
  { ext: string; mime: string; label: string; gpsMethod: string }
> = {
  jpeg: { ext: '.jpg', mime: 'image/jpeg', label: 'JPEG', gpsMethod: 'EXIF (standard)' },
  png:  { ext: '.png', mime: 'image/png',  label: 'PNG',  gpsMethod: 'XMP (lossless)' },
  webp: { ext: '.webp', mime: 'image/webp', label: 'WebP', gpsMethod: 'EXIF (RIFF)' },
}

// ─── CRC-32 for PNG ────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    t[i] = c
  }
  return t
})()

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (const b of data) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ b) & 0xff]
  return (crc ^ 0xffffffff) >>> 0
}

// ─── Canvas render helpers ──────────────────────────────────────────────────

function renderToCanvas(file: File): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const c = document.createElement('canvas')
      c.width = img.naturalWidth
      c.height = img.naturalHeight
      c.getContext('2d')!.drawImage(img, 0, 0)
      resolve(c)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')) }
    img.src = url
  })
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality = 0.93): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => b ? resolve(b) : reject(new Error(`${mime} canvas export failed`)),
      mime,
      quality,
    )
  })
}

async function fileToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(new Error('FileReader failed'))
    r.readAsDataURL(blob)
  })
}

// ─── GPS helpers ────────────────────────────────────────────────────────────

function decimalToDmsRational(d: number): [[number, number], [number, number], [number, number]] {
  const a = Math.abs(d)
  const deg = Math.floor(a)
  const mf = (a - deg) * 60
  const min = Math.floor(mf)
  const sec = Math.round((mf - min) * 60 * 100)
  return [[deg, 1], [min, 1], [sec, 100]]
}

/** Decimal degrees → "DD,MM.mmmmmmN" format used by XMP GPS */
function decimalToXmpCoord(decimal: number, isLat: boolean): string {
  const abs = Math.abs(decimal)
  const deg = Math.floor(abs)
  const min = (abs - deg) * 60
  const dir = isLat ? (decimal >= 0 ? 'N' : 'S') : (decimal >= 0 ? 'E' : 'W')
  return `${deg},${min.toFixed(6)}${dir}`
}

function buildExifObject(coords: GpsCoords): Record<string, Record<number, unknown>> {
  const IFD = piexif.GPSIFD
  const gps: Record<number, unknown> = {}
  gps[IFD.GPSLatitudeRef]  = coords.lat >= 0 ? 'N' : 'S'
  gps[IFD.GPSLatitude]     = decimalToDmsRational(coords.lat)
  gps[IFD.GPSLongitudeRef] = coords.lng >= 0 ? 'E' : 'W'
  gps[IFD.GPSLongitude]    = decimalToDmsRational(coords.lng)
  if (coords.alt != null) {
    gps[IFD.GPSAltitudeRef] = coords.alt >= 0 ? 0 : 1
    gps[IFD.GPSAltitude]    = [Math.round(Math.abs(coords.alt) * 100), 100]
  }
  return { '0th': {}, Exif: {}, GPS: gps, '1st': {}, Interop: {} }
}

// ─── JPEG ──────────────────────────────────────────────────────────────────

async function embedGpsJpeg(file: File, coords: GpsCoords, isAlreadyJpeg: boolean): Promise<Blob> {
  let sourceBlob: Blob = file
  if (!isAlreadyJpeg) {
    const canvas = await renderToCanvas(file)
    sourceBlob = await canvasToBlob(canvas, 'image/jpeg')
  }

  const dataUrl = await fileToDataUrl(sourceBlob)
  type ExifObj = Record<string, Record<number, unknown>>

  let exifObj: ExifObj
  try { exifObj = piexif.load(dataUrl) }
  catch { exifObj = buildExifObject(coords) }

  exifObj['GPS'] = buildExifObject(coords)['GPS']
  const newDataUrl = piexif.insert(piexif.dump(exifObj), dataUrl)

  const base64 = newDataUrl.split(',')[1]
  return new Blob(
    [Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))],
    { type: 'image/jpeg' },
  )
}

// ─── PNG + XMP GPS ─────────────────────────────────────────────────────────

function buildXmpGps(coords: GpsCoords): string {
  const lat = decimalToXmpCoord(coords.lat, true)
  const lng = decimalToXmpCoord(coords.lng, false)

  let altXml = ''
  if (coords.alt != null) {
    const altRef = coords.alt >= 0 ? '0' : '1'
    const altVal = `${Math.round(Math.abs(coords.alt) * 100)}/100`
    altXml = `\n      <exif:GPSAltitude>${altVal}</exif:GPSAltitude>\n      <exif:GPSAltitudeRef>${altRef}</exif:GPSAltitudeRef>`
  }

  return (
    `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>` +
    `<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="GeoTag">` +
    `<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">` +
    `<rdf:Description rdf:about="" xmlns:exif="http://ns.adobe.com/exif/1.0/">` +
    `<exif:GPSLatitude>${lat}</exif:GPSLatitude>` +
    `<exif:GPSLongitude>${lng}</exif:GPSLongitude>${altXml}` +
    `</rdf:Description></rdf:RDF></x:xmpmeta><?xpacket end="w"?>`
  )
}

function makePngChunk(typeStr: string, data: Uint8Array): Uint8Array {
  const type = new TextEncoder().encode(typeStr)
  const out = new Uint8Array(4 + 4 + data.length + 4)
  const v = new DataView(out.buffer)
  v.setUint32(0, data.length, false)
  out.set(type, 4)
  out.set(data, 8)
  const crcInput = new Uint8Array(4 + data.length)
  crcInput.set(type)
  crcInput.set(data, 4)
  v.setUint32(8 + data.length, crc32(crcInput), false)
  return out
}

async function embedGpsPng(file: File, coords: GpsCoords): Promise<Blob> {
  const canvas = await renderToCanvas(file)
  const pngBlob = await canvasToBlob(canvas, 'image/png')
  const buf = await pngBlob.arrayBuffer()
  const bytes = new Uint8Array(buf)

  // PNG signature = 8 bytes, IHDR = 4+4+13+4 = 25 bytes → insert after byte 33
  const IHDR_END = 8 + 25

  const xmp = buildXmpGps(coords)
  const enc = new TextEncoder()

  // iTXt chunk data: keyword + \0 + comprFlags(2) + langTag + \0 + transKw + \0 + text
  const keyword = enc.encode('XML:com.adobe.xmp')
  const text = enc.encode(xmp)
  const chunkData = new Uint8Array(keyword.length + 5 + text.length)
  // keyword
  chunkData.set(keyword, 0)
  // null + compression flag 0 + compression method 0 + empty lang tag null + empty translated kw null
  // offsets: keyword.length+0=null, +1=comp flag, +2=comp method, +3=lang\0, +4=transKw\0
  chunkData[keyword.length + 0] = 0 // null terminator after keyword
  chunkData[keyword.length + 1] = 0 // compression flag: not compressed
  chunkData[keyword.length + 2] = 0 // compression method
  chunkData[keyword.length + 3] = 0 // empty language tag + null
  chunkData[keyword.length + 4] = 0 // empty translated keyword + null
  chunkData.set(text, keyword.length + 5)

  const xmpChunk = makePngChunk('iTXt', chunkData)

  // Stitch: [0..IHDR_END] + xmpChunk + [IHDR_END..]
  const out = new Uint8Array(bytes.length + xmpChunk.length)
  out.set(bytes.slice(0, IHDR_END), 0)
  out.set(xmpChunk, IHDR_END)
  out.set(bytes.slice(IHDR_END), IHDR_END + xmpChunk.length)

  return new Blob([out], { type: 'image/png' })
}

// ─── WebP + EXIF RIFF ──────────────────────────────────────────────────────

function u32le(n: number): Uint8Array {
  const b = new Uint8Array(4)
  new DataView(b.buffer).setUint32(0, n, true)
  return b
}

function u24le(n: number): Uint8Array {
  const b = new Uint8Array(3)
  b[0] = n & 0xff
  b[1] = (n >> 8) & 0xff
  b[2] = (n >> 16) & 0xff
  return b
}

/** Build raw EXIF bytes (TIFF payload, as returned by piexifjs dump) */
function buildExifBytes(coords: GpsCoords): Uint8Array {
  const exifBinaryStr = piexif.dump(buildExifObject(coords))
  return Uint8Array.from(exifBinaryStr, (c) => c.charCodeAt(0))
}

/**
 * Pad to even length (WebP chunk sizes must be even).
 * If odd, appends a 0x00 byte but chunk size stays the original value.
 */
function padEven(data: Uint8Array): Uint8Array {
  if (data.length % 2 === 0) return data
  const out = new Uint8Array(data.length + 1)
  out.set(data)
  return out
}

function buildWebpChunk(fourcc: string, data: Uint8Array): Uint8Array {
  const padded = padEven(data)
  const enc = new TextEncoder()
  const out = new Uint8Array(8 + padded.length)
  out.set(enc.encode(fourcc), 0)
  new DataView(out.buffer).setUint32(4, data.length, true) // original size (unpadded)
  out.set(padded, 8)
  return out
}

async function embedGpsWebp(file: File, coords: GpsCoords): Promise<Blob> {
  const canvas = await renderToCanvas(file)
  const webpBlob = await canvasToBlob(canvas, 'image/webp', 0.92)
  const buf = await webpBlob.arrayBuffer()
  const src = new Uint8Array(buf)

  const enc = new TextEncoder()
  const dec = new TextDecoder('ascii')

  // Validate RIFF/WEBP header
  if (dec.decode(src.slice(0, 4)) !== 'RIFF' || dec.decode(src.slice(8, 12)) !== 'WEBP') {
    throw new Error('Invalid WebP file')
  }

  // Read first image chunk
  const firstChunkType = dec.decode(src.slice(12, 16))
  const firstChunkSize = new DataView(buf).getUint32(16, true)
  const firstChunkData = src.slice(20, 20 + firstChunkSize)

  const w = canvas.width
  const h = canvas.height

  const exifData = buildExifBytes(coords)
  const exifChunk = buildWebpChunk('EXIF', exifData)

  let imageChunks: Uint8Array

  if (firstChunkType === 'VP8X') {
    // Already extended format — set EXIF flag (bit 3) and append EXIF chunk
    const flags = src[20] | 0x08 // bit 3 = EXIF present
    const vp8xData = firstChunkData.slice()
    vp8xData[0] = flags

    const vp8xChunk = buildWebpChunk('VP8X', vp8xData)

    // Remaining chunks after VP8X (may already have EXIF — remove it)
    const afterVP8X = 20 + padEven(firstChunkData).length
    const remaining = src.slice(afterVP8X)
    const filteredChunks = filterWebpChunks(remaining, ['EXIF'])

    imageChunks = concat(vp8xChunk, filteredChunks, exifChunk)
  } else {
    // Simple format (VP8 or VP8L) → create VP8X wrapper
    // VP8X data: flags(4) + canvas_w-1(3LE) + canvas_h-1(3LE) = 10 bytes
    const vp8xData = new Uint8Array(10)
    vp8xData[0] = 0x08 // EXIF flag only
    const wData = u24le(w - 1)
    const hData = u24le(h - 1)
    vp8xData.set(wData, 4)
    vp8xData.set(hData, 7)

    const vp8xChunk = buildWebpChunk('VP8X', vp8xData)
    const imageChunk = buildWebpChunk(firstChunkType, firstChunkData)

    imageChunks = concat(vp8xChunk, imageChunk, exifChunk)
  }

  // Build final RIFF
  const riffPayload = concat(enc.encode('WEBP'), imageChunks)
  const riffHeader = new Uint8Array(8)
  riffHeader.set(enc.encode('RIFF'))
  new DataView(riffHeader.buffer).setUint32(4, riffPayload.length, true)

  return new Blob([riffHeader, riffPayload], { type: 'image/webp' })
}

/** Remove chunks with the given 4CC from a raw WebP chunk stream */
function filterWebpChunks(data: Uint8Array, exclude: string[]): Uint8Array {
  const dec = new TextDecoder('ascii')
  const parts: Uint8Array[] = []
  let i = 0
  while (i + 8 <= data.length) {
    const type = dec.decode(data.slice(i, i + 4))
    const size = new DataView(data.buffer, data.byteOffset + i + 4, 4).getUint32(0, true)
    const paddedSize = size + (size % 2)
    if (!exclude.includes(type)) {
      parts.push(data.slice(i, i + 8 + paddedSize))
    }
    i += 8 + paddedSize
  }
  return concat(...parts)
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) { out.set(a, offset); offset += a.length }
  return out
}

// ─── Unified entry point ───────────────────────────────────────────────────

export interface EmbedOptions {
  overlay?: boolean
  stampTitle?: string
  stampLabel?: string
  stampAddress?: string
  stampDateTime?: string
  stampMapZoom?: number
}

/**
 * Render the source file to canvas, optionally apply GPS overlay stamp,
 * then return it as the requested MIME type (before GPS metadata injection).
 */
async function renderWithOverlay(
  file: File,
  coords: GpsCoords,
  mime: string,
  opts: EmbedOptions,
): Promise<{ canvas: HTMLCanvasElement; blob: Blob }> {
  const canvas = await renderToCanvas(file)

  if (opts.overlay) {
    await applyGpsOverlay(canvas, {
      coords,
      stampTitle: opts.stampTitle ?? '',
      stampLabel: opts.stampLabel ?? '',
      stampAddress: opts.stampAddress ?? '',
      stampDateTime: opts.stampDateTime || undefined,
      stampMapZoom: opts.stampMapZoom ?? 15,
    })
  }

  const quality = mime === 'image/jpeg' ? 0.93 : mime === 'image/webp' ? 0.92 : undefined
  const blob = await canvasToBlob(canvas, mime, quality)
  return { canvas, blob }
}

export async function embedGps(
  file: File,
  coords: GpsCoords,
  format: ExportFormat,
  opts: EmbedOptions = {},
): Promise<Blob> {
  const isOriginalJpeg = file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name)

  if (format === 'jpeg') {
    if (!opts.overlay && isOriginalJpeg) {
      // Fast path: piexifjs injects GPS without re-encoding
      return embedGpsJpeg(file, coords, true)
    }
    // Need canvas for overlay or format conversion
    const { blob } = await renderWithOverlay(file, coords, 'image/jpeg', opts)
    const jpeg = new File([blob], file.name, { type: 'image/jpeg' })
    return embedGpsJpeg(jpeg, coords, true)
  }

  if (format === 'png') {
    const canvas = await renderToCanvas(file)
    if (opts.overlay) applyGpsOverlay(canvas, { coords, placeName: opts.placeName ?? null })
    const pngBlob = await canvasToBlob(canvas, 'image/png')
    const tmp = new File([pngBlob], file.name, { type: 'image/png' })
    return embedGpsPng(tmp, coords)
  }

  if (format === 'webp') {
    const { blob } = await renderWithOverlay(file, coords, 'image/webp', opts)
    const tmp = new File([blob], file.name, { type: 'image/webp' })
    return embedGpsWebp(tmp, coords)
  }

  throw new Error(`Unsupported format: ${format}`)
}

/** Derive output filename with the correct extension */
export function deriveExportFilename(originalName: string, format: ExportFormat): string {
  const base = originalName.replace(/\.[^/.]+$/, '')
  return `${base}_geotagged${FORMAT_META[format].ext}`
}
