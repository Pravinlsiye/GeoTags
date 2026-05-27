import { createSignal, createEffect, onCleanup, Show } from 'solid-js'
import { TbOutlineLoader2, TbOutlineRefresh } from 'solid-icons/tb'
import { state } from '../store'
import { applyGpsOverlay } from '../utils/image-overlay'

const MAX_PREVIEW_W = 640

export default function StampPreview() {
  const [previewSrc, setPreviewSrc] = createSignal<string | null>(null)
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal(false)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  let renderVersion = 0

  function scheduleRender(immediate = false) {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => render(), immediate ? 0 : 600)
  }

  onCleanup(() => {
    if (debounceTimer) clearTimeout(debounceTimer)
  })

  async function render() {
    const src = state.imageSrc
    const gps = state.gps
    if (!src || !gps) { setPreviewSrc(null); return }

    const version = ++renderVersion
    setLoading(true)
    setError(false)

    try {
      const img = await loadImage(src)
      if (version !== renderVersion) return // stale render

      // Scale down to preview size
      const ratio = Math.min(1, MAX_PREVIEW_W / img.naturalWidth)
      const W = Math.round(img.naturalWidth * ratio)
      const H = Math.round(img.naturalHeight * ratio)

      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, W, H)

      await applyGpsOverlay(canvas, {
        coords: gps,
        stampTitle: state.stampTitle,
        stampLabel: state.stampLabel,
        stampAddress: state.stampAddress,
        stampDateTime: state.stampDateTime || undefined,
        stampMapZoom: state.stampMapZoom,
      })

      if (version !== renderVersion) return
      setPreviewSrc(canvas.toDataURL('image/jpeg', 0.85))
    } catch {
      setError(true)
    } finally {
      if (version === renderVersion) setLoading(false)
    }
  }

  // Re-render whenever any relevant state changes
  createEffect(() => {
    // Access reactive state to track dependencies
    const _ = [
      state.imageSrc,
      state.gps?.lat,
      state.gps?.lng,
      state.stampTitle,
      state.stampLabel,
      state.stampAddress,
      state.stampDateTime,
      state.stampMapZoom,
      state.overlayEnabled,
    ]
    void _  // prevent TS unused warning
    if (state.overlayEnabled && state.imageSrc && state.gps) {
      scheduleRender()
    } else {
      setPreviewSrc(null)
    }
  })

  return (
    <div class="stamp-preview">
      <div class="stamp-preview__header">
        <span class="stamp-preview__label">Preview</span>
        <Show when={!loading()}>
          <button
            class="stamp-preview__refresh"
            onClick={() => scheduleRender(true)}
            title="Refresh preview"
          >
            <TbOutlineRefresh size={12} />
          </button>
        </Show>
        <Show when={loading()}>
          <TbOutlineLoader2 size={12} class="spin stamp-preview__spin" />
        </Show>
      </div>

      <div class="stamp-preview__canvas-wrap">
        <Show when={previewSrc()} fallback={
          <div class="stamp-preview__placeholder">
            <Show when={loading()}>
              <TbOutlineLoader2 size={20} class="spin" color="var(--color-text-3)" />
              <span>Rendering stamp...</span>
            </Show>
            <Show when={!loading() && error()}>
              <span>Preview failed</span>
            </Show>
            <Show when={!loading() && !error() && !previewSrc()}>
              <span>Set a GPS location to preview stamp</span>
            </Show>
          </div>
        }>
          <img
            src={previewSrc()!}
            class="stamp-preview__img"
            alt="Stamp preview"
          />
        </Show>
      </div>
    </div>
  )
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
