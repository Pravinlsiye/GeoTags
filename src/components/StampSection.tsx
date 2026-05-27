import { Show } from 'solid-js'
import {
  TbOutlineRubberStamp,
  TbOutlineCalendar,
  TbOutlineMapPin,
  TbOutlineUser,
  TbOutlineHome,
  TbOutlineRefresh,
  TbOutlineZoomIn,
} from 'solid-icons/tb'
import { state, setState } from '../store'

/** Convert Date to datetime-local string format: "YYYY-MM-DDTHH:mm" */
function toDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function StampSection() {
  function toggleStamp() {
    const next = !state.overlayEnabled
    setState('overlayEnabled', next)
    // Auto-fill datetime when enabling for the first time
    if (next && !state.stampDateTime) {
      setState('stampDateTime', toDatetimeLocal(new Date()))
    }
  }

  function useCurrentTime() {
    setState('stampDateTime', toDatetimeLocal(new Date()))
  }

  return (
    <div class="stamp-section">
      {/* ── Header / toggle ─────────────────────────────────── */}
      <button
        class="stamp-section__header"
        onClick={toggleStamp}
        aria-pressed={state.overlayEnabled}
      >
        <div class="stamp-section__title-row">
          <TbOutlineRubberStamp
            size={14}
            color={state.overlayEnabled ? 'var(--color-warn)' : 'var(--color-text-3)'}
          />
          <span
            class="stamp-section__title"
            classList={{ 'stamp-section__title--on': state.overlayEnabled }}
          >
            Stamp on exported image
          </span>
        </div>

        {/* Pill toggle switch */}
        <span
          class="stamp-switch"
          classList={{ 'stamp-switch--on': state.overlayEnabled }}
          aria-hidden="true"
        />
      </button>

      {/* ── Fields (only when ON) ────────────────────────────── */}
      <Show when={state.overlayEnabled}>
        <div class="stamp-fields">
          {/* Date & time */}
          <div class="stamp-field">
            <div class="stamp-field__label-row">
              <label class="stamp-field__label" for="stamp-dt">
                <TbOutlineCalendar size={11} />
                Date & time
              </label>
              <button
                class="stamp-reset-btn"
                onClick={useCurrentTime}
                title="Reset to current time"
              >
                <TbOutlineRefresh size={11} />
                Now
              </button>
            </div>
            <input
              id="stamp-dt"
              class="stamp-field__input"
              type="datetime-local"
              value={state.stampDateTime}
              onInput={(e) => setState('stampDateTime', e.currentTarget.value)}
            />
            <p class="stamp-field__hint">
              Burned into the stamp. Defaults to current time if left as-is.
            </p>
          </div>

          {/* Location title */}
          <div class="stamp-field">
            <label class="stamp-field__label" for="stamp-title">
              <TbOutlineMapPin size={11} />
              Location title
            </label>
            <input
              id="stamp-title"
              class="stamp-field__input"
              type="text"
              placeholder="Chennai, Tamil Nadu, India 🇮🇳"
              value={state.stampTitle}
              onInput={(e) => setState('stampTitle', e.currentTarget.value)}
            />
          </div>

          {/* Name / label */}
          <div class="stamp-field">
            <label class="stamp-field__label" for="stamp-label">
              <TbOutlineUser size={11} />
              Name / label
            </label>
            <input
              id="stamp-label"
              class="stamp-field__input"
              type="text"
              placeholder="Your name or company"
              value={state.stampLabel}
              onInput={(e) => setState('stampLabel', e.currentTarget.value)}
            />
          </div>

          {/* Address */}
          <div class="stamp-field">
            <label class="stamp-field__label" for="stamp-addr">
              <TbOutlineHome size={11} />
              Address
            </label>
            <textarea
              id="stamp-addr"
              class="stamp-field__textarea"
              placeholder="Auto-filled from GPS location"
              rows={2}
              value={state.stampAddress}
              onInput={(e) => setState('stampAddress', e.currentTarget.value)}
            />
            <p class="stamp-field__hint">
              Coordinates and timezone are always included automatically.
            </p>
          </div>

          {/* Map zoom */}
          <div class="stamp-field">
            <div class="stamp-field__label-row">
              <label class="stamp-field__label" for="stamp-zoom">
                <TbOutlineZoomIn size={11} />
                Map thumbnail zoom
              </label>
              <span class="stamp-zoom-value">{state.stampMapZoom}</span>
            </div>
            <input
              id="stamp-zoom"
              class="stamp-zoom-slider"
              type="range"
              min="10"
              max="18"
              step="1"
              value={state.stampMapZoom}
              onInput={(e) => setState('stampMapZoom', Number(e.currentTarget.value))}
            />
            <div class="stamp-zoom-labels">
              <span>City</span>
              <span>Block</span>
              <span>Street</span>
            </div>
          </div>
        </div>
      </Show>
    </div>
  )
}
