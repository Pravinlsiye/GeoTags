/**
 * GPS stamp overlay — matches reference layout:
 *   [map thumb]  Chennai, Tamil Nadu, India 🇮🇳       [📍 GPS Map Camera]
 *               Y2kSaaS
 *               No. 45, 2nd Floor, New Avadi Road,
 *               Kilpauk, Chennai, Tamil Nadu 600096, India
 *               Lat 13.0778°   Long 80.2327°
 *               27/09/2025 10:39 AM  GMT +05:30
 */

export interface OverlayOptions {
  coords: { lat: number; lng: number; alt?: number }
  stampTitle: string
  stampLabel: string
  stampAddress: string
  stampDateTime?: string | Date
  stampMapZoom?: number
}

// ─── Time helpers ────────────────────────────────────────────────────────────

function getTimezoneLabel(): string {
  const offset = -new Date().getTimezoneOffset()
  const h = Math.floor(Math.abs(offset) / 60)
  const m = Math.abs(offset) % 60
  const sign = offset >= 0 ? '+' : '-'
  return m
    ? `GMT ${sign}${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    : `GMT ${sign}${String(h).padStart(2, '0')}:00`
}

function formatDateTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const day = pad(d.getDate())
  const mon = pad(d.getMonth() + 1)
  const yr  = d.getFullYear()
  let   h   = d.getHours()
  const ap  = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${day}/${mon}/${yr} ${h}:${pad(d.getMinutes())} ${ap}`
}

// ─── Map thumbnail ───────────────────────────────────────────────────────────

async function fetchMapThumbnail(
  lat: number, lng: number,
  w: number, h: number,
  zoom = 15,
): Promise<HTMLImageElement | null> {
  const delta = 0.001 * Math.pow(2, 18 - Math.max(10, Math.min(18, zoom)))
  const bbox  = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`
  const url   =
    `https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/export` +
    `?bbox=${bbox}&bboxSR=4326&size=${w},${h}&format=png32&f=image`

  return new Promise((resolve) => {
    const img   = new Image()
    img.crossOrigin = 'anonymous'
    const timer = setTimeout(() => resolve(null), 5000)
    img.onload  = () => { clearTimeout(timer); resolve(img) }
    img.onerror = () => { clearTimeout(timer); resolve(null) }
    img.src = url
  })
}

// ─── Red map pin ─────────────────────────────────────────────────────────────

function drawPin(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  // Head
  ctx.beginPath()
  ctx.arc(x, y - r, r, 0, Math.PI * 2)
  ctx.fillStyle = '#E53935'
  ctx.fill()
  // Inner white dot
  ctx.beginPath()
  ctx.arc(x, y - r, r * 0.42, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.78)'
  ctx.fill()
  // Teardrop tail
  ctx.beginPath()
  ctx.moveTo(x - r * 0.52, y - r * 0.32)
  ctx.quadraticCurveTo(x - r * 0.08, y + r * 0.6, x, y + r * 0.9)
  ctx.quadraticCurveTo(x + r * 0.08, y + r * 0.6, x + r * 0.52, y - r * 0.32)
  ctx.fillStyle = '#E53935'
  ctx.fill()
}

// ─── Fallback placeholder map ─────────────────────────────────────────────────

function drawMapPlaceholder(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, s: number,
) {
  // Dark satellite-ish background
  ctx.fillStyle = 'rgb(28, 42, 56)'
  ctx.fillRect(x, y, w, h)
  // Subtle road-like lines
  ctx.strokeStyle = 'rgba(255,255,255,0.07)'
  ctx.lineWidth = Math.max(1, s)
  for (let i = 1; i < 4; i++) {
    const gx = x + (w / 4) * i
    ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke()
  }
  for (let i = 1; i < 3; i++) {
    const gy = y + (h / 3) * i
    ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke()
  }
}

// ─── Rounded rect ─────────────────────────────────────────────────────────────

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r)
  } else {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y);   ctx.arcTo(x + w, y,     x + w, y + r, r)
    ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
    ctx.lineTo(x + r, y + h);   ctx.arcTo(x,     y + h, x,     y + h - r, r)
    ctx.lineTo(x, y + r);       ctx.arcTo(x,     y,     x + r, y, r)
    ctx.closePath()
  }
}

// ─── Text wrapping ────────────────────────────────────────────────────────────

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w }
    else cur = test
  }
  if (cur) lines.push(cur)
  return lines
}

// ─── Small brand icon (GPS camera) ───────────────────────────────────────────

function drawBrandIcon(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
) {
  const r = Math.round(size * 0.18)
  // Rounded square background
  ctx.fillStyle = 'rgba(255,255,255,0.18)'
  rr(ctx, x, y - size + 2, size, size, r)
  ctx.fill()
  // Map pin inside
  const cx = x + size / 2
  const cy = y - size / 2 + 2
  const pr = size * 0.22
  ctx.beginPath()
  ctx.arc(cx, cy - pr * 0.6, pr, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.fill()
  // Tail
  ctx.beginPath()
  ctx.moveTo(cx - pr * 0.5, cy - pr * 0.3)
  ctx.quadraticCurveTo(cx, cy + pr * 0.7, cx, cy + pr * 0.85)
  ctx.quadraticCurveTo(cx, cy + pr * 0.7, cx + pr * 0.5, cy - pr * 0.3)
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.fill()
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function applyGpsOverlay(
  canvas: HTMLCanvasElement,
  opts: OverlayOptions,
): Promise<void> {
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const W = canvas.width
  const H = canvas.height

  // Scale proportionally to image width; base calibrated at 1080px
  const s = Math.min(W / 1080, 3.5)

  // ── Layout constants ─────────────────────────────────────────────────────
  const thumbW    = Math.round(178 * s)
  const thumbH    = Math.round(148 * s)
  const padV      = Math.round(16 * s)   // top / bottom inner padding
  const padH      = Math.round(20 * s)   // left / right outer padding
  const gapThumb  = Math.round(20 * s)   // gap between thumbnail right and text left
  const textX     = padH + thumbW + gapThumb
  const textMaxW  = W - textX - padH

  // ── Typography ───────────────────────────────────────────────────────────
  const fontUI   = `-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`
  const fontMono = `"Courier New", Courier, monospace`

  const f1  = Math.round(19 * s)   // title (largest)
  const f2  = Math.round(14 * s)   // company / label
  const f3  = Math.round(12 * s)   // address lines
  const f4  = Math.round(13 * s)   // coordinates + datetime
  const fBrand = Math.round(11 * s) // "GPS Map Camera"

  // Line gaps: generous spacing matching reference
  const lgTitle  = Math.round(9 * s)   // after title
  const lgLabel  = Math.round(7 * s)   // after label
  const lgAddr   = Math.round(6 * s)   // between address lines
  const lgCoords = Math.round(8 * s)   // extra gap before coords block

  // ── Measure address lines (needed to compute stamp height) ───────────────
  ctx.font = `400 ${f3}px ${fontUI}`
  const addrLines = opts.stampAddress
    ? wrapText(ctx, opts.stampAddress, textMaxW)
    : []

  // ── Calculate total stamp height from content ─────────────────────────────
  let textH = 0
  if (opts.stampTitle)  textH += f1 + lgTitle
  if (opts.stampLabel)  textH += f2 + lgLabel
  if (addrLines.length) textH += addrLines.length * (f3 + lgAddr) - lgAddr // no trailing gap on last
  textH += lgCoords               // extra breathing room before coords
  textH += f4 + Math.round(5 * s) // coords line
  textH += f4                     // datetime line

  const innerH      = Math.max(thumbH, textH)
  const totalStampH = innerH + padV * 2
  const stampY      = H - totalStampH

  // ── Background ────────────────────────────────────────────────────────────
  ctx.save()
  ctx.fillStyle = 'rgba(0, 0, 0, 0.72)'
  ctx.fillRect(0, stampY, W, totalStampH)

  // ── Map thumbnail ─────────────────────────────────────────────────────────
  const mapX = padH
  const mapY = stampY + padV
  const mapR = Math.round(7 * s)

  const thumbnail = await fetchMapThumbnail(
    opts.coords.lat, opts.coords.lng,
    thumbW, thumbH,
    opts.stampMapZoom ?? 15,
  )

  ctx.save()
  rr(ctx, mapX, mapY, thumbW, thumbH, mapR)
  ctx.clip()
  if (thumbnail) {
    ctx.drawImage(thumbnail, mapX, mapY, thumbW, thumbH)
  } else {
    drawMapPlaceholder(ctx, mapX, mapY, thumbW, thumbH, s)
  }
  ctx.restore()

  // Red pin at map center
  const pinR = Math.round(9 * s)
  drawPin(ctx, mapX + thumbW / 2, mapY + thumbH / 2 + pinR * 0.4, pinR)

  // ── "GPS Map Camera" brand — top-right ───────────────────────────────────
  const brandY    = stampY + padV + fBrand
  const iconSize  = Math.round(fBrand * 1.5)
  const brandText = '  GPS Map Camera'
  ctx.font = `500 ${fBrand}px ${fontUI}`
  const textW = ctx.measureText(brandText).width
  const brandX = W - padH - iconSize - textW
  drawBrandIcon(ctx, brandX, brandY, iconSize)
  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.textAlign = 'left'
  ctx.fillText(brandText, brandX + iconSize, brandY)

  // ── Text block ────────────────────────────────────────────────────────────
  ctx.textAlign = 'left'

  // Vertically center text block within innerH
  const textOffsetY = Math.max(0, Math.round((innerH - textH) / 2))
  let ty = mapY + textOffsetY

  // Title
  if (opts.stampTitle) {
    ctx.font = `600 ${f1}px ${fontUI}`
    ctx.fillStyle = 'rgba(255,255,255,0.97)'
    ctx.fillText(opts.stampTitle, textX, ty + f1)
    ty += f1 + lgTitle
  }

  // Label / company name
  if (opts.stampLabel) {
    ctx.font = `400 ${f2}px ${fontUI}`
    ctx.fillStyle = 'rgba(210,210,210,0.88)'
    ctx.fillText(opts.stampLabel, textX, ty + f2)
    ty += f2 + lgLabel
  }

  // Address lines
  if (addrLines.length > 0) {
    ctx.font = `400 ${f3}px ${fontUI}`
    ctx.fillStyle = 'rgba(185,185,185,0.82)'
    for (let i = 0; i < addrLines.length; i++) {
      ctx.fillText(addrLines[i], textX, ty + f3)
      ty += f3 + lgAddr
    }
    ty -= lgAddr // remove trailing gap on last address line
  }

  // Breathing gap before coords
  ty += lgCoords

  // Coordinates
  const latStr = `Lat ${opts.coords.lat.toFixed(4)}°`
  const lngStr = `Long ${opts.coords.lng.toFixed(4)}°`
  ctx.font = `500 ${f4}px ${fontMono}`
  ctx.fillStyle = 'rgba(255,255,255,0.96)'
  ctx.fillText(`${latStr}   ${lngStr}`, textX, ty + f4)
  ty += f4 + Math.round(5 * s)

  // Date / time
  const dt = opts.stampDateTime
    ? (opts.stampDateTime instanceof Date ? opts.stampDateTime : new Date(opts.stampDateTime))
    : new Date()
  ctx.font = `400 ${f4}px ${fontMono}`
  ctx.fillStyle = 'rgba(210,210,210,0.88)'
  ctx.fillText(`${formatDateTime(dt)}  ${getTimezoneLabel()}`, textX, ty + f4)

  ctx.restore()
}
