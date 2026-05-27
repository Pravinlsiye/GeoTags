import { Show } from 'solid-js'
import { TbOutlineAlertTriangle, TbOutlinePhoto } from 'solid-icons/tb'
import { state } from '../store'
import type { ImageFormat } from '../store'

const FORMAT_LABELS: Record<ImageFormat, string> = {
  jpeg: 'JPEG',
  png: 'PNG',
  webp: 'WebP',
  tiff: 'TIFF',
  heic: 'HEIC',
  other: 'IMG',
}

const FORMAT_COLORS: Record<ImageFormat, string> = {
  jpeg: 'var(--color-ok)',
  png: 'var(--color-accent)',
  webp: 'oklch(75% 0.18 280)',
  tiff: 'var(--color-warn)',
  heic: 'var(--color-warn)',
  other: 'var(--color-text-3)',
}

export default function ImagePreview() {
  const needsConversion = () =>
    state.imageFormat != null && state.imageFormat !== 'jpeg'

  return (
    <div class="flex flex-col gap-2">
      {/* Image display */}
      <div
        class="relative rounded-[var(--radius-lg)] overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)]"
        style={{ 'min-height': '200px' }}
      >
        <Show when={state.imageSrc} fallback={
          <div class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[var(--color-text-3)]">
            <TbOutlinePhoto size={32} />
            <span class="text-xs">No image loaded</span>
          </div>
        }>
          <img
            src={state.imageSrc!}
            alt={state.file?.name ?? 'Image'}
            class="w-full h-full object-contain"
            style={{ 'max-height': '320px' }}
          />

          {/* Format badge */}
          <Show when={state.imageFormat}>
            <span
              class="absolute top-2 left-2 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{
                color: FORMAT_COLORS[state.imageFormat!],
                background: 'oklch(10% 0.005 200 / 0.85)',
                border: `1px solid ${FORMAT_COLORS[state.imageFormat!]}`,
              }}
            >
              {FORMAT_LABELS[state.imageFormat!]}
            </span>
          </Show>
        </Show>
      </div>

      {/* Filename */}
      <Show when={state.file}>
        <p
          class="text-xs font-mono text-[var(--color-text-3)] truncate px-0.5"
          title={state.file?.name}
        >
          {state.file?.name}
          <Show when={state.file?.size}>
            {' '}
            <span class="text-[var(--color-text-3)]">
              ({(state.file!.size / 1024).toFixed(0)} KB)
            </span>
          </Show>
        </p>
      </Show>

      {/* Format conversion warning */}
      <Show when={needsConversion()}>
        <div
          class="flex items-start gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-xs"
          style={{
            background: 'oklch(78% 0.19 75 / 0.08)',
            border: '1px solid oklch(78% 0.19 75 / 0.25)',
            color: 'var(--color-warn)',
          }}
        >
          <TbOutlineAlertTriangle size={13} class="shrink-0 mt-0.5" />
          <span>
            {FORMAT_LABELS[state.imageFormat!]} images will be converted to JPEG when exported —
            original color data is preserved.
          </span>
        </div>
      </Show>
    </div>
  )
}
