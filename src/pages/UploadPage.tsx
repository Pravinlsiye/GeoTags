import { Show } from 'solid-js'
import { state, setState } from '../store'
import { loadFile, triggerGeocode } from '../utils/file-loader'
import Dropzone from '../components/Dropzone'
import ImagePreview from '../components/ImagePreview'
import ExifPanel from '../components/ExifPanel'
import MapPicker from '../components/MapPicker'
import GpsPanel from '../components/GpsPanel'
import StampSection from '../components/StampSection'
import StampPreview from '../components/StampPreview'
import type { GpsCoords } from '../store'

export default function UploadPage() {
  let importRef!: HTMLInputElement

  function handleImportInput(e: Event) {
    const files = (e.target as HTMLInputElement).files
    if (files?.[0]) loadFile(files[0])
    ;(e.target as HTMLInputElement).value = ''
  }

  function handleMapPick(coords: GpsCoords) {
    setState('mapCoords', coords)
    setState('gps', coords)
    setState('placeName', null)
    triggerGeocode(coords.lat, coords.lng)
  }

  return (
    <div class="split-layout">
      <input
        ref={importRef}
        type="file"
        accept="image/*,.heic,.heif,.tif,.tiff"
        class="sr-only"
        onInput={handleImportInput}
      />

      {/* ── LEFT PANEL ─────────────────────────────────────── */}
      <div class="split-left">
        <Show when={!state.imageSrc}>
          <div class="panel-section panel-section--grow">
            <Dropzone onFile={(f) => loadFile(f)} />
          </div>
        </Show>

        <Show when={state.imageSrc}>
          <div class="panel-section panel-section--image">
            {/* Live stamp preview when ON, raw preview when OFF */}
            <Show when={state.overlayEnabled} fallback={<ImagePreview />}>
              <StampPreview />
            </Show>
            <button class="link-btn" onClick={() => importRef.click()}>
              Load different image
            </button>
          </div>
        </Show>

        <Show when={state.error}>
          <div class="error-banner">{state.error}</div>
        </Show>

        <div class="panel-section">
          <p class="section-label">Metadata</p>
          <ExifPanel />
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────── */}
      <div class="split-right">
        <div class="map-wrap">
          <MapPicker coords={state.gps} onPick={handleMapPick} />
        </div>

        <div class="panel-section">
          <GpsPanel />
        </div>

        {/* Stamp section — always visible, toggle inside */}
        <div class="panel-section">
          <StampSection />
        </div>

        <Show when={!state.file && !state.gps}>
          <p class="hint-text">
            Drop an image on the left, or click the map to pin a GPS location.
          </p>
        </Show>
      </div>
    </div>
  )
}
