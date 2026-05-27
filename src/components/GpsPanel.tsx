import { Show, createSignal, createEffect } from 'solid-js'
import { TbOutlineMapPin, TbOutlineRefresh, TbOutlineSearch } from 'solid-icons/tb'
import { state, setState } from '../store'
import { triggerGeocode } from '../utils/file-loader'
import { formatCoord } from '../utils/geocode'

export default function GpsPanel() {
  const [latInput, setLatInput] = createSignal('')
  const [lngInput, setLngInput] = createSignal('')
  const [altInput, setAltInput] = createSignal('')

  createEffect(() => {
    const g = state.gps
    if (g) {
      setLatInput(g.lat.toFixed(7))
      setLngInput(g.lng.toFixed(7))
      setAltInput(g.alt != null ? g.alt.toFixed(1) : '')
    } else {
      setLatInput('')
      setLngInput('')
      setAltInput('')
    }
  })

  function commitCoords() {
    const lat = parseFloat(latInput())
    const lng = parseFloat(lngInput())
    if (isNaN(lat) || isNaN(lng)) return
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return

    const altVal = parseFloat(altInput())
    const alt = isNaN(altVal) ? undefined : altVal

    setState('gps', { lat, lng, alt })
    setState('placeName', null)
    triggerGeocode(lat, lng)
  }

  function syncFromMap() {
    if (state.mapCoords) {
      setState('gps', { ...state.mapCoords })
    }
  }

  return (
    <div class="gps-panel">
      {/* Header */}
      <div class="gps-panel__header">
        <TbOutlineMapPin size={13} color="var(--color-accent)" />
        <span class="gps-panel__title">GPS Coordinates</span>
      </div>

      {/* Coordinate inputs */}
      <div class="gps-panel__inputs">
        <div class="gps-field">
          <label class="coord-label" for="gps-lat">Latitude</label>
          <input
            id="gps-lat"
            class="coord-input"
            type="number"
            step="0.0000001"
            min="-90"
            max="90"
            placeholder="0.0000000"
            value={latInput()}
            onInput={(e) => setLatInput(e.currentTarget.value)}
            onBlur={commitCoords}
            onKeyDown={(e) => e.key === 'Enter' && commitCoords()}
          />
        </div>

        <div class="gps-field">
          <label class="coord-label" for="gps-lng">Longitude</label>
          <input
            id="gps-lng"
            class="coord-input"
            type="number"
            step="0.0000001"
            min="-180"
            max="180"
            placeholder="0.0000000"
            value={lngInput()}
            onInput={(e) => setLngInput(e.currentTarget.value)}
            onBlur={commitCoords}
            onKeyDown={(e) => e.key === 'Enter' && commitCoords()}
          />
        </div>

        <div class="gps-field gps-field--alt">
          <label class="coord-label" for="gps-alt">Alt (m)</label>
          <input
            id="gps-alt"
            class="coord-input"
            type="number"
            step="0.1"
            placeholder="-"
            value={altInput()}
            onInput={(e) => setAltInput(e.currentTarget.value)}
            onBlur={commitCoords}
            onKeyDown={(e) => e.key === 'Enter' && commitCoords()}
          />
        </div>
      </div>

      {/* DMS notation */}
      <Show when={state.gps}>
        <p class="gps-panel__dms">
          {formatCoord(state.gps!.lat, true)}
          <span class="gps-panel__dms-sep" />
          {formatCoord(state.gps!.lng, false)}
        </p>
      </Show>

      {/* Action buttons */}
      <div class="gps-panel__actions">
        <Show when={state.mapCoords}>
          <button
            class="nav-btn"
            onClick={syncFromMap}
            title="Apply the last map click location"
          >
            <TbOutlineRefresh size={12} />
            Use map pin
          </button>
        </Show>

        <Show when={state.gps && !state.placeLoading && !state.placeName}>
          <button
            class="nav-btn"
            onClick={() => state.gps && triggerGeocode(state.gps.lat, state.gps.lng)}
          >
            <TbOutlineSearch size={12} />
            Look up place
          </button>
        </Show>
      </div>

      <Show when={state.placeLoading}>
        <p class="gps-panel__place">Looking up location...</p>
      </Show>

      <Show when={state.placeName}>
        <div class="gps-panel__place-name">
          <TbOutlineMapPin size={11} color="var(--color-accent)" />
          <span>{state.placeName}</span>
        </div>
      </Show>

      <Show when={!state.gps && !state.placeLoading}>
        <p class="gps-panel__empty">
          Click on the map to set a pin, or enter coordinates.
        </p>
      </Show>
    </div>
  )
}
