/**
 * GPS stamp overlay matching the reference style:
 *   [map thumb]  Chennai, Tamil Nadu, India 🇮🇳    [GPS Map Camera]
 *               Y2kSaaS
 *               No. 45, 2nd Floor, New Avadi Road,
 *               Kilpauk, Chennai, Tamil Nadu 600096, India
 *               Lat 13.0778° Long 80.2327°
 *               27/09/2025 10:39 AM GMT +05:30
 */

export interface OverlayOptions {
  coords: { lat: number; lng: number; alt?: number }
  /** "City, State, Country 🇮🇳" – editable stamp title */
  stampTitle: string
  /** User-defined label / company name */
  stampLabel: string
  /** Full address text (may contain commas / multiple lines) */
  stampAddress: string
  /**
   * ISO datetime-local string (e.g. "2026-05-27T14:59") or Date.
   * Defaults to current time if empty/undefined.
   */
  stampDateTime?: string | Date
  /**
   * Map zoom for the thumbnail (10 = city overview → 18 = street level).
   * Default: 15.
   */
  stampMapZoom?: number
}

// ─── Timezone helpers ────────────────────────────────────────────────────────

function getTimezoneLabel(): string {
  const offset = -new Date().getTimezoneOffset()
  const h = Math.floor(Math.abs(offset) / 60)
  const m = Math.abs(offset) % 60
  const sign = offset >= 0 ? '+' : '-'
  return m
    ? `GMT ${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    : `GMT ${sign}${h > 9 ? h : '0' + h}:00`
}

function formatDateTime(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0')
  const mon = String(d.getMonth() + 1).padStart(2, '0')
  const yr = d.getFullYear()
  let h = d.getHours()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${mon}/${yr} ${h}:${mi} ${ampm}`
}

// ─── Map thumbnail fetch ─────────────────────────────────────────────────────

async function fetchMapThumbnail(
  lat: number, lng: number,
  w: number, h: number,
  zoom = 15,
): Promise<HTMLImageElement | null> {
  // delta in degrees: zoom 18 → ~0.001° (street), zoom 15 → ~0.008° (block), zoom 10 → ~0.256° (city)
  const delta = 0.001 * Math.pow(2, 18 - Math.max(10, Math.min(18, zoom)))
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`
  const url =
    `https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export` +
    `?bbox=${bbox}&bboxSR=4326&size=${w},${h}&format=png32&f=image`

  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const timer = setTimeout(() => resolve(null), 5000)
    img.onload = () => { clearTimeout(timer); resolve(img) }
    img.onerror = () => { clearTimeout(timer); resolve(null) }
    img.src = url
  })
}

/** Draw a Google Maps-style red pin at (x, y) */
function drawPin(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  // Circle head
  ctx.beginPath()
  ctx.arc(x, y - r, r, 0, Math.PI * 2)
  ctx.fillStyle = '#E53935'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(x, y - r, r * 0.45, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.75)'
  ctx.fill()
  // Teardrop tail
  ctx.beginPath()
  ctx.moveTo(x - r * 0.55, y - r * 0.35)
  ctx.quadraticCurveTo(x - r * 0.1, y + r * 0.5, x, y + r * 0.85)
  ctx.quadraticCurveTo(x + r * 0.1, y + r * 0.5, x + r * 0.55, y - r * 0.35)
  ctx.fillStyle = '#E53935'
  ctx.fill()
}

/** Draw fallback placeholder map (when Esri fetch fails) */
function drawMapPlaceholder(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
) {
  ctx.fillStyle = 'oklch(20% 0.03 240)'
  ctx.fillRect(x, y, w, h)
  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  for (let gx = x; gx <= x + w; gx += w / 4) {
    ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke()
  }
  for (let gy = y; gy <= y + h; gy += h / 3) {
    ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke()
  }
}

// ─── Rounded rect helper ─────────────────────────────────────────────────────

function rr(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r)
  } else {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y + h - r, r)
    ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + r, y, r)
    ctx.closePath()
  }
}

// ─── Wrap text to fixed pixel width ─────────────────────────────────────────

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur)
      cur = w
    } else {
      cur = test
    }
  }
  if (cur) lines.push(cur)
  return lines
}

// ─── Main entry ─────────────────────────────────────────────────────────────

export async function applyGpsOverlay(
  canvas: HTMLCanvasElement,
  opts: OverlayOptions,
): Promise<void> {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const W = canvas.width
  const H = canvas.height

  // Scale all sizes proportionally to image width (base: 1080px)
  const s = Math.min(W / 1080, 3.5)

  const thumbW    = Math.round(165 * s)
  const thumbH    = Math.round(130 * s)
  const stampH    = thumbH + Math.round(20 * s)  // vertical padding
  const stampPadV = Math.round(10 * s)
  const stampPadH = Math.round(14 * s)

  const textX     = thumbW + Math.round(14 * s)
  const textMaxW  = W - textX - stampPadH * 2

  // Font names (canvas always has these system fonts)
  const fontUI   = `-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`
  const fontMono = `"Courier New", Courier, monospace`

  // Sizes
  const f1 = Math.round(16 * s)  // title
  const f2 = Math.round(13 * s)  // label / company
  const f3 = Math.round(11.5 * s)  // address
  const f4 = Math.round(12.5 * s) // lat/long + datetime (mono)
  const fs = Math.round(9 * s)    // brand text
  const lg = Math.round(5 * s)    // line gap

  // Measure address lines to determine total stamp height
  ctx.font = `400 ${f3}px ${fontUI}`
  const addrLines = opts.stampAddress
    ? wrapText(ctx, opts.stampAddress, textMaxW)
    : []

  // Total height: top pad + title + [label] + [addr lines] + latlong + datetime + bot pad
  const lineHeights = [
    f1 + lg,
    opts.stampLabel ? f2 + lg : 0,
    ...addrLines.map(() => f3 + lg),
    f4 + lg,
    f4,
  ]
  const textBlockH = lineHeights.reduce((a, b) => a + b, 0)
  const innerH = Math.max(thumbH, textBlockH + Math.round(8 * s))
  const totalStampH = innerH + stampPadV * 2

  const stampY = H - totalStampH

  // ── Background ──────────────────────────────────────────────────────────
  ctx.save()
  ctx.fillStyle = 'rgba(0, 0, 0, 0.70)'
  ctx.fillRect(0, stampY, W, totalStampH)

  // ── Map thumbnail ────────────────────────────────────────────────────────
  const mapX = stampPadH
  const mapY = stampY + stampPadV
  const mapR = Math.round(6 * s)

  const thumbnail = await fetchMapThumbnail(opts.coords.lat, opts.coords.lng, thumbW, thumbH, opts.stampMapZoom ?? 15)

  ctx.save()
  rr(ctx, mapX, mapY, thumbW, thumbH, mapR)
  ctx.clip()
  if (thumbnail) {
    ctx.drawImage(thumbnail, mapX, mapY, thumbW, thumbH)
  } else {
    drawMapPlaceholder(ctx, mapX, mapY, thumbW, thumbH)
  }
  ctx.restore()

  // Pin on map center
  const pinR = Math.round(8 * s)
  drawPin(ctx, mapX + thumbW / 2, mapY + thumbH / 2 + pinR, pinR)

  // ── GPS Map Camera brand (top-right) ─────────────────────────────────────
  ctx.font = `500 ${fs}px ${fontUI}`
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.textAlign = 'right'
  ctx.fillText('GPS Map Camera', W - stampPadH, stampY + stampPadV + fs)

  // ── Text block (right of thumbnail) ─────────────────────────────────────
  ctx.textAlign = 'left'
  let ty = mapY + Math.round(4 * s)

  // Line 1: title with flag
  if (opts.stampTitle) {
    ctx.font = `600 ${f1}px ${fontUI}`
    ctx.fillStyle = 'rgba(255,255,255,0.96)'
    ctx.fillText(opts.stampTitle, textX, ty + f1)
    ty += f1 + lg
  }

  // Line 2: user label
  if (opts.stampLabel) {
    ctx.font = `400 ${f2}px ${fontUI}`
    ctx.fillStyle = 'rgba(200,200,200,0.85)'
    ctx.fillText(opts.stampLabel, textX, ty + f2)
    ty += f2 + lg
  }

  // Lines 3–N: address
  if (addrLines.length > 0) {
    ctx.font = `400 ${f3}px ${fontUI}`
    ctx.fillStyle = 'rgba(180,180,180,0.80)'
    for (const line of addrLines) {
      ctx.fillText(line, textX, ty + f3)
      ty += f3 + lg
    }
  }

  ty += Math.round(2 * s) // small extra gap before coords

  // Lat / Long
  const latStr = `Lat ${opts.coords.lat.toFixed(4)}°`
  const lngStr = `Long ${opts.coords.lng.toFixed(4)}°`
  ctx.font = `500 ${f4}px ${fontMono}`
  ctx.fillStyle = 'rgba(255,255,255,0.95)'
  ctx.fillText(`${latStr}   ${lngStr}`, textX, ty + f4)
  ty += f4 + lg

  // Date / time / timezone
  const dt = opts.stampDateTime
    ? (opts.stampDateTime instanceof Date ? opts.stampDateTime : new Date(opts.stampDateTime))
    : new Date()
  ctx.font = `400 ${f4}px ${fontMono}`
  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillText(`${formatDateTime(dt)} ${getTimezoneLabel()}`, textX, ty + f4)

  ctx.restore()
}
