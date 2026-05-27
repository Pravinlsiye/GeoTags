import { TbOutlineRubberStamp, TbOutlineUser, TbOutlineMapPin, TbOutlineTag } from 'solid-icons/tb'
import { state, setState } from '../store'

export default function StampEditor() {
  return (
    <div class="stamp-editor">
      <div class="stamp-editor__header">
        <TbOutlineRubberStamp size={13} color="var(--color-warn)" />
        <span class="stamp-editor__title">Stamp content</span>
      </div>

      {/* Title field */}
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
        <p class="stamp-field__hint">Auto-filled from reverse geocode. Emoji flags supported.</p>
      </div>

      {/* Label field */}
      <div class="stamp-field">
        <label class="stamp-field__label" for="stamp-label">
          <TbOutlineUser size={11} />
          Name / label
        </label>
        <input
          id="stamp-label"
          class="stamp-field__input"
          type="text"
          placeholder="Your name, company, or device"
          value={state.stampLabel}
          onInput={(e) => setState('stampLabel', e.currentTarget.value)}
        />
      </div>

      {/* Address field */}
      <div class="stamp-field">
        <label class="stamp-field__label" for="stamp-address">
          <TbOutlineTag size={11} />
          Address
        </label>
        <textarea
          id="stamp-address"
          class="stamp-field__textarea"
          placeholder="Full address (auto-filled from GPS)"
          rows={2}
          value={state.stampAddress}
          onInput={(e) => setState('stampAddress', e.currentTarget.value)}
        />
        <p class="stamp-field__hint">Coordinates and date/time are always included.</p>
      </div>
    </div>
  )
}
