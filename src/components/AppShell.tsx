import { Show, createSignal, createEffect, onCleanup } from 'solid-js'
import type { ParentProps } from 'solid-js'
import { Portal } from 'solid-js/web'
import { A, useLocation } from '@solidjs/router'
import {
  TbOutlineMapPin,
  TbOutlineFolderOpen,
  TbOutlineCamera,
  TbOutlineDownload,
  TbOutlineLoader2,
  TbOutlineChevronDown,
  TbOutlineCheck,
  TbOutlineRubberStamp,
  TbOutlinePencil,
} from 'solid-icons/tb'
import { state, setState } from '../store'
import { embedGps, deriveExportFilename, FORMAT_META } from '../utils/gps-embed'
import type { ExportFormat } from '../utils/gps-embed'
import { downloadBlob } from '../utils/image-utils'

const FORMATS: ExportFormat[] = ['jpeg', 'png', 'webp']

export default function AppShell(props: ParentProps) {
  const location = useLocation()
  const isCamera = () => location.pathname === '/camera'

  const [menuOpen, setMenuOpen] = createSignal(false)
  const [menuPos, setMenuPos] = createSignal({ top: 0, right: 0 })

  // Inline filename editing
  const [editingName, setEditingName] = createSignal(false)
  const [nameInput, setNameInput] = createSignal('')
  let nameInputRef!: HTMLInputElement

  // Sync input when file changes
  createEffect(() => {
    setNameInput(state.exportFilename)
  })

  function startEditName() {
    setNameInput(state.exportFilename)
    setEditingName(true)
    // Focus the input after render
    requestAnimationFrame(() => {
      nameInputRef?.focus()
      nameInputRef?.select()
    })
  }

  function commitName() {
    const trimmed = nameInput().trim().replace(/[/\\?%*:|"<>]/g, '-') // sanitize
    setState('exportFilename', trimmed || state.exportFilename)
    setEditingName(false)
  }

  let chevronRef!: HTMLButtonElement
  let removeClickListener: (() => void) | null = null

  function openMenu() {
    const rect = chevronRef.getBoundingClientRect()
    setMenuPos({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    })
    setMenuOpen(true)

    const fn = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!t.closest('[data-fmt-menu]') && !t.closest('[data-fmt-trigger]')) {
        closeMenu()
      }
    }
    // Defer so this click doesn't immediately close
    requestAnimationFrame(() =>
      document.addEventListener('click', fn, { capture: true }),
    )
    removeClickListener = () =>
      document.removeEventListener('click', fn, { capture: true })
  }

  function closeMenu() {
    setMenuOpen(false)
    removeClickListener?.()
    removeClickListener = null
  }

  onCleanup(() => removeClickListener?.())

  const canExport = () => !!state.file && !!state.gps

  async function handleExport() {
    if (!state.file || !state.gps) return
    setState('exportLoading', true)
    setState('error', null)
    try {
      const blob = await embedGps(state.file, state.gps, state.exportFormat, {
        overlay: state.overlayEnabled,
        stampTitle: state.stampTitle,
        stampLabel: state.stampLabel,
        stampAddress: state.stampAddress,
        stampDateTime: state.stampDateTime || undefined,
        stampMapZoom: state.stampMapZoom,
      })
      const baseName = state.exportFilename || deriveExportFilename(state.file.name, state.exportFormat).replace(/\.[^/.]+$/, '')
      const filename = `${baseName}${fmt().ext}`
      downloadBlob(blob, filename)
    } catch (err) {
      setState('error', err instanceof Error ? err.message : 'Export failed')
    } finally {
      setState('exportLoading', false)
    }
  }

  const fmt = () => FORMAT_META[state.exportFormat]

  return (
    <div class="app-root">
      {/* ── Navbar ────────────────────────────────────────────── */}
      <header class="app-nav">
        {/* Brand */}
        <div class="app-nav__brand">
          <TbOutlineMapPin size={16} color="var(--color-accent)" />
          <span>GeoTag</span>
        </div>

        {/* Page tabs */}
        <nav class="app-nav__tabs" role="navigation" aria-label="App pages">
          <A href="/" class="app-tab" classList={{ 'app-tab--active': !isCamera() }} end>
            <TbOutlineFolderOpen size={14} />
            <span>Upload</span>
          </A>
          <A href="/camera" class="app-tab" classList={{ 'app-tab--active': isCamera() }}>
            <TbOutlineCamera size={14} />
            <span>Camera</span>
          </A>
        </nav>

        {/* Right actions */}
        <div class="app-nav__actions">
          {/* Editable export filename */}
          <Show when={state.file}>
            <div class="filename-area" title="Click to rename export file">
              {/* Status dots */}
              <span class="file-pill__dot" classList={{ 'file-pill__dot--gps': !!state.gps }} />
              <Show when={state.overlayEnabled}>
                <TbOutlineRubberStamp size={10} color="var(--color-warn)" />
              </Show>

              {/* Filename: static or editing */}
              <Show when={!editingName()} fallback={
                <span class="filename-edit-wrap">
                  <input
                    ref={nameInputRef}
                    class="filename-input"
                    type="text"
                    value={nameInput()}
                    onInput={(e) => setNameInput(e.currentTarget.value)}
                    onBlur={commitName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitName()
                      if (e.key === 'Escape') setEditingName(false)
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span class="filename-ext">{fmt().ext}</span>
                </span>
              }>
                <button
                  class="filename-static"
                  onClick={startEditName}
                  title="Click to rename"
                >
                  <span class="filename-base">{state.exportFilename || state.file?.name}</span>
                  <span class="filename-ext">{fmt().ext}</span>
                  <TbOutlinePencil size={10} class="filename-edit-icon" />
                </button>
              </Show>
            </div>
          </Show>

          {/* Export split button */}
          <div class="export-group">
            <button
              class="btn-export"
              classList={{ 'btn-export--disabled': !canExport() }}
              disabled={!canExport() || state.exportLoading}
              onClick={handleExport}
              title={canExport() ? `Export as ${fmt().label}` : 'Set image and GPS location first'}
            >
              <Show when={state.exportLoading} fallback={<TbOutlineDownload size={13} />}>
                <TbOutlineLoader2 size={13} class="spin" />
              </Show>
              <span>Export {fmt().label}</span>
            </button>

            {/* Chevron — Portal anchor */}
            <button
              ref={chevronRef}
              data-fmt-trigger
              class="btn-export-fmt"
              onClick={(e) => { e.stopPropagation(); menuOpen() ? closeMenu() : openMenu() }}
              title="Choose format"
              aria-haspopup="listbox"
              aria-expanded={menuOpen()}
            >
              <TbOutlineChevronDown
                size={11}
                style={{
                  transition: 'transform 140ms var(--ease-out)',
                  transform: menuOpen() ? 'rotate(180deg)' : 'rotate(0deg)',
                }}
              />
            </button>
          </div>
        </div>
      </header>

      {/* ── Format dropdown — portaled to <body> to escape all stacking contexts */}
      <Portal mount={document.body}>
        <Show when={menuOpen()}>
          <div
            data-fmt-menu
            class="fmt-menu-portal"
            style={{
              position: 'fixed',
              top: `${menuPos().top}px`,
              right: `${menuPos().right}px`,
            }}
            role="listbox"
            aria-label="Export format"
          >
            <p class="fmt-menu__label">Export format</p>
            {FORMATS.map((f) => {
              const m = FORMAT_META[f]
              const active = () => state.exportFormat === f
              return (
                <button
                  class="fmt-option"
                  classList={{ 'fmt-option--active': active() }}
                  role="option"
                  aria-selected={active()}
                  onClick={() => { setState('exportFormat', f); closeMenu() }}
                >
                  <span class="fmt-option__check">
                    <Show when={active()}>
                      <TbOutlineCheck size={11} color="var(--color-accent)" />
                    </Show>
                  </span>
                  <span class="fmt-option__body">
                    <span class="fmt-option__label">{m.label}</span>
                    <span class="fmt-option__desc">{m.gpsMethod}</span>
                  </span>
                  <span class="fmt-option__ext">{m.ext}</span>
                </button>
              )
            })}
          </div>
        </Show>
      </Portal>

      {/* ── Page content ──────────────────────────────────────── */}
      <main class="app-main">{props.children}</main>
    </div>
  )
}
