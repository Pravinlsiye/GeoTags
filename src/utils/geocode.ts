/** Nominatim reverse geocode - free, no API key required */

export interface PlaceResult {
  displayName: string
  // Short label: "City, State" or "City, Country"
  shortLabel: string
  // Stamp-ready fields
  city?: string
  state?: string
  country?: string
  countryCode?: string     // ISO-3166 alpha-2, e.g. "IN"
  postcode?: string
  road?: string
  suburb?: string
  fullAddress: string      // full formatted address for stamp
  // Country flag emoji from ISO code
  flag: string
}

function isoToFlag(code: string): string {
  if (!code || code.length !== 2) return ''
  return code.toUpperCase().split('').map((c) =>
    String.fromCodePoint(c.charCodeAt(0) + 127397),
  ).join('')
}

let lastRequestTime = 0
const MIN_INTERVAL_MS = 1000

export async function reverseGeocode(lat: number, lng: number): Promise<PlaceResult | null> {
  const now = Date.now()
  const wait = MIN_INTERVAL_MS - (now - lastRequestTime)
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastRequestTime = Date.now()

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`
    const resp = await fetch(url, { headers: { 'Accept-Language': 'en' } })
    if (!resp.ok) return null

    const data = await resp.json()
    const a = data.address ?? {}

    const city = a.city || a.town || a.village || a.municipality || a.county || ''
    const state = a.state || a.state_district || ''
    const country = a.country || ''
    const countryCode = (a.country_code as string | undefined)?.toUpperCase() ?? ''
    const road = a.road || a.street || ''
    const houseNumber = a.house_number || ''
    const suburb = a.suburb || a.neighbourhood || a.quarter || ''
    const postcode = a.postcode || ''

    // Full address: road + suburb + city + state + postcode + country
    const addrParts = [
      houseNumber ? `${houseNumber} ${road}` : road,
      suburb,
      city,
      state,
      postcode,
      country,
    ].filter(Boolean)
    const fullAddress = addrParts.join(', ')

    // Short label
    const shortParts = [city, state, country].filter(Boolean)
    const shortLabel = shortParts.slice(0, 3).join(', ')

    const flag = isoToFlag(countryCode)

    return {
      displayName: data.display_name ?? '',
      shortLabel,
      city: city || undefined,
      state: state || undefined,
      country: country || undefined,
      countryCode: countryCode || undefined,
      postcode: postcode || undefined,
      road: road || undefined,
      suburb: suburb || undefined,
      fullAddress,
      flag,
    }
  } catch {
    return null
  }
}

/** Format coords for display (DMS) */
export function formatCoord(value: number, isLat: boolean): string {
  const abs = Math.abs(value)
  const deg = Math.floor(abs)
  const min = Math.floor((abs - deg) * 60)
  const sec = ((abs - deg - min / 60) * 3600).toFixed(1)
  const dir = isLat ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W'
  return `${deg}° ${min}' ${sec}" ${dir}`
}
