import { createSignal, onCleanup, Show } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import {
  TbOutlineCamera,
  TbOutlineCameraRotate,
  TbOutlineArrowRight,
  TbOutlineRefresh,
  TbOutlineAlertCircle,
} from 'solid-icons/tb'
import { state, setState } from '../store'
import { loadFile, triggerGeocode } from '../utils/file-loader'
import MapPicker from '../components/MapPicker'
import GpsPanel from '../components/GpsPanel'
import StampSection from '../components/StampSection'
import type { GpsCoords } from '../store'

export default function CameraPage() {
  const navigate = useNavigate()

  let videoRef!: HTMLVideoElement
  let canvasRef!: HTMLCanvasElement

  const [stream, setStream] = createSignal<MediaStream | null>(null)
  const [facingMode, setFacingMode] = createSignal<'user' | 'environment'>('environment')
  const [captured, setCaptured] = createSignal<string | null>(null)
  const [capturedFile, setCapturedFile] = createSignal<File | null>(null)
  const [camError, setCamError] = createSignal<string | null>(null)
  const [pressing, setPressing] = createSignal(false)

  async function startCamera(mode: 'user' | 'environment' = facingMode()) {
    stopStream()
    setCamError(null)
    setCaptured(null)
    setCapturedFile(null)
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      setStream(s)
      videoRef.srcObject = s
      await videoRef.play()
    } catch {
      setCamError('Camera access denied or unavailable. Grant permission and retry.')
    }
  }

  function stopStream() {
    stream()?.getTracks().forEach((t) => t.stop())
    setStream(null)
  }

  onCleanup(stopStream)

  void startCamera()

  function capture() {
    if (!stream()) return
    const video = videoRef
    canvasRef.width = video.videoWidth
    canvasRef.height = video.videoHeight
    const ctx = canvasRef.getContext('2d')!
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvasRef.toDataURL('image/jpeg', 0.93)
    setCaptured(dataUrl)
    stopStream()

    // Build File object from data URL
    const base64 = dataUrl.split(',')[1]
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
    const blob = new Blob([bytes], { type: 'image/jpeg' })
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const file = new File([blob], `capture-${ts}.jpg`, { type: 'image/jpeg' })
    setCapturedFile(file)
  }

  function retake() {
    setCaptured(null)
    setCapturedFile(null)
    void startCamera()
  }

  async function saveAndEdit() {
    const file = capturedFile()
    if (!file) return
    // Load file preserving any GPS coords the user set on the map
    await loadFile(file, true)
    navigate('/')
  }

  function handleMapPick(coords: GpsCoords) {
    setState('mapCoords', coords)
    setState('gps', coords)
    setState('placeName', null)
    triggerGeocode(coords.lat, coords.lng)
  }

  function flipCamera() {
    const next = facingMode() === 'environment' ? 'user' : 'environment'
    setFacingMode(next)
    void startCamera(next)
  }

  return (
    <div class="split-layout">
      {/* ── LEFT PANEL: Camera ─────────────────────────────── */}
      <div class="split-left camera-left">
        {/* Viewfinder area */}
        <div class="viewfinder">
          <Show when={!captured()}>
            <video
              ref={videoRef}
              class="viewfinder__video"
              autoplay
              muted
              playsinline
            />
            {/* Crosshair guide overlay */}
            <Show when={stream()}>
              <div class="viewfinder__guide" aria-hidden="true">
                <div class="viewfinder__corner viewfinder__corner--tl" />
                <div class="viewfinder__corner viewfinder__corner--tr" />
                <div class="viewfinder__corner viewfinder__corner--bl" />
                <div class="viewfinder__corner viewfinder__corner--br" />
              </div>
            </Show>
          </Show>

          <Show when={captured()}>
            <img
              src={captured()!}
              class="viewfinder__preview"
              alt="Captured photo"
            />
            <div class="viewfinder__captured-badge">
              <span>Photo captured</span>
            </div>
          </Show>

          <Show when={camError()}>
            <div class="viewfinder__error">
              <TbOutlineAlertCircle size={28} color="var(--color-danger)" />
              <p>{camError()}</p>
              <button
                class="btn-retry"
                onClick={() => startCamera()}
              >
                Retry
              </button>
            </div>
          </Show>
        </div>

        <canvas ref={canvasRef} class="sr-only" />

        {/* Controls bar */}
        <div class="camera-controls">
          <Show when={!captured()}>
            {/* Flip button */}
            <button
              class="camera-icon-btn"
              onClick={flipCamera}
              disabled={!stream()}
              title="Flip camera"
            >
              <TbOutlineCameraRotate size={20} />
            </button>

            {/* Shutter */}
            <button
              class="shutter-btn"
              classList={{ 'shutter-btn--pressing': pressing() }}
              disabled={!stream()}
              onPointerDown={() => setPressing(true)}
              onPointerUp={() => { setPressing(false); capture() }}
              onPointerLeave={() => setPressing(false)}
              title="Capture"
              aria-label="Take photo"
            />

            <div style={{ width: '44px' }} /> {/* balance spacer */}
          </Show>

          <Show when={captured()}>
            <button
              class="btn-ghost"
              onClick={retake}
            >
              <TbOutlineRefresh size={15} />
              Retake
            </button>

            <button
              class="btn-primary"
              onClick={saveAndEdit}
            >
              Save and edit
              <TbOutlineArrowRight size={15} />
            </button>
          </Show>
        </div>

        {/* Location status under controls */}
        <Show when={state.gps}>
          <p class="camera-loc-hint">
            Location set — will be embedded on save.
          </p>
        </Show>
        <Show when={!state.gps}>
          <p class="camera-loc-hint camera-loc-hint--empty">
            Pick a location on the map before capturing.
          </p>
        </Show>
      </div>

      {/* ── RIGHT PANEL: Map ───────────────────────────────── */}
      <div class="split-right">
        <div class="map-wrap">
          <MapPicker coords={state.gps} onPick={handleMapPick} />
        </div>
        <div class="panel-section">
          <GpsPanel />
        </div>

        <div class="panel-section">
          <StampSection />
        </div>
      </div>
    </div>
  )
}
