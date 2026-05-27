import { Show, createSignal, For } from 'solid-js'
import type { JSX } from 'solid-js'
import { TbOutlineChevronDown, TbOutlineChevronRight, TbOutlineCamera, TbOutlineCalendar, TbOutlineMapPin, TbOutlineSettings } from 'solid-icons/tb'
import { state } from '../store'

interface Section {
  id: string
  label: string
  icon: JSX.Element
  rows: () => Row[]
}

interface Row {
  key: string
  value: string
}

function formatDate(v: unknown): string {
  if (!v) return ''
  if (v instanceof Date) return v.toLocaleString()
  return String(v)
}

function formatExposure(val: number): string {
  if (val >= 1) return `${val}s`
  const denom = Math.round(1 / val)
  return `1/${denom}s`
}

function SectionBlock(p: { section: Section }) {
  const [open, setOpen] = createSignal(true)

  return (
    <div class="border border-[var(--color-border-subtle)] rounded-[var(--radius-md)] overflow-hidden">
      <button
        class="w-full flex items-center gap-2 px-3 py-2 bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] transition-colors duration-100 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span class="text-[var(--color-text-3)] shrink-0">{p.section.icon}</span>
        <span class="text-xs font-semibold text-[var(--color-text-2)] flex-1">
          {p.section.label}
        </span>
        <span class="text-[var(--color-text-3)]">
          <Show when={open()} fallback={<TbOutlineChevronRight size={11} />}>
            <TbOutlineChevronDown size={11} />
          </Show>
        </span>
      </button>

      <Show when={open()}>
        <div class="divide-y divide-[var(--color-border-subtle)]">
          <For each={p.section.rows()}>
            {(row) => (
              <div class="flex items-baseline gap-2 px-3 py-1.5 hover:bg-[var(--color-surface-2)] transition-colors duration-75">
                <span class="text-[11px] text-[var(--color-text-3)] shrink-0 w-[108px] truncate">
                  {row.key}
                </span>
                <span class="text-[11px] font-mono text-[var(--color-text-2)] truncate flex-1 text-right">
                  {row.value}
                </span>
              </div>
            )}
          </For>
          <Show when={p.section.rows().length === 0}>
            <p class="px-3 py-2 text-[11px] text-[var(--color-text-3)] italic">No data</p>
          </Show>
        </div>
      </Show>
    </div>
  )
}

export default function ExifPanel() {
  const sections = (): Section[] => {
    const d = state.exifData
    if (!d) return []

    return [
      {
        id: 'camera',
        label: 'Camera',
        icon: <TbOutlineCamera size={13} />,
        rows: () => {
          const rows: Row[] = []
          if (d.make) rows.push({ key: 'Make', value: d.make })
          if (d.model) rows.push({ key: 'Model', value: d.model })
          if (d.lensModel) rows.push({ key: 'Lens', value: d.lensModel })
          if (d.fNumber != null) rows.push({ key: 'f-stop', value: `f/${d.fNumber}` })
          if (d.exposureTime != null) rows.push({ key: 'Exposure', value: formatExposure(d.exposureTime) })
          if (d.iso != null) rows.push({ key: 'ISO', value: String(d.iso) })
          if (d.focalLength != null) rows.push({ key: 'Focal length', value: `${d.focalLength}mm` })
          if (d.focalLengthIn35mm != null) rows.push({ key: '35mm equiv.', value: `${d.focalLengthIn35mm}mm` })
          if (d.flash != null) rows.push({ key: 'Flash', value: String(d.flash) })
          if (d.whiteBalance != null) rows.push({ key: 'White balance', value: String(d.whiteBalance) })
          return rows
        },
      },
      {
        id: 'datetime',
        label: 'Date & Time',
        icon: <TbOutlineCalendar size={13} />,
        rows: () => {
          const rows: Row[] = []
          if (d.dateTimeOriginal) rows.push({ key: 'Captured', value: formatDate(d.dateTimeOriginal) })
          if (d.dateTime) rows.push({ key: 'Modified', value: formatDate(d.dateTime) })
          return rows
        },
      },
      {
        id: 'gps',
        label: 'GPS',
        icon: <TbOutlineMapPin size={13} />,
        rows: () => {
          const rows: Row[] = []
          if (d.latitude != null) rows.push({ key: 'Latitude', value: d.latitude.toFixed(7) })
          if (d.longitude != null) rows.push({ key: 'Longitude', value: d.longitude.toFixed(7) })
          if (d.altitude != null) rows.push({ key: 'Altitude', value: `${d.altitude.toFixed(1)} m` })
          if (d.gpsDateStamp) rows.push({ key: 'GPS Date', value: d.gpsDateStamp })
          return rows
        },
      },
      {
        id: 'technical',
        label: 'Technical',
        icon: <TbOutlineSettings size={13} />,
        rows: () => {
          const rows: Row[] = []
          if (d.imageWidth && d.imageHeight)
            rows.push({ key: 'Dimensions', value: `${d.imageWidth} × ${d.imageHeight}` })
          if (d.orientation != null) rows.push({ key: 'Orientation', value: String(d.orientation) })
          if (d.colorSpace != null) rows.push({ key: 'Color space', value: String(d.colorSpace) })
          if (d.software) rows.push({ key: 'Software', value: d.software })
          return rows
        },
      },
    ]
  }

  return (
    <div class="flex flex-col gap-2">
      <Show when={state.exifData} fallback={
        <div class="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] px-3 py-3">
          <p class="text-xs text-[var(--color-text-3)] italic">
            Load an image to see its EXIF metadata.
          </p>
        </div>
      }>
        <For each={sections()}>
          {(section) => <SectionBlock section={section} />}
        </For>
      </Show>
    </div>
  )
}
