import { createSignal } from 'solid-js'
import { TbOutlineCloudUpload } from 'solid-icons/tb'

interface DropzoneProps {
  onFile: (file: File) => void
}

export default function Dropzone(props: DropzoneProps) {
  const [dragging, setDragging] = createSignal(false)
  let inputRef!: HTMLInputElement

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file.type.startsWith('image/') && !isImageByExtension(file.name)) return
    props.onFile(file)
  }

  function isImageByExtension(name: string): boolean {
    return /\.(jpe?g|png|webp|tiff?|heic|heif|bmp|gif|avif|svg)$/i.test(name)
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function onDragLeave(e: DragEvent) {
    // Only set to false when leaving the element itself, not children
    const target = e.relatedTarget as Node | null
    if (!(e.currentTarget as HTMLElement).contains(target)) {
      setDragging(false)
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer?.files ?? null)
  }

  function onInput(e: Event) {
    handleFiles((e.target as HTMLInputElement).files)
  }

  return (
    <div
      class="relative flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border-2 border-dashed transition-colors duration-150 cursor-pointer select-none"
      classList={{
        'border-[var(--color-accent)] bg-[var(--color-accent-glow)]': dragging(),
        'border-[var(--color-border)] hover:border-[var(--color-border-subtle)] hover:bg-[var(--color-surface)]':
          !dragging(),
      }}
      style={{ 'min-height': '220px', padding: '2rem' }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif,.tif,.tiff"
        class="sr-only"
        onInput={onInput}
        onClick={(e) => e.stopPropagation()}
      />

      <TbOutlineCloudUpload
        size={40}
        class="transition-colors duration-150"
        color={dragging() ? 'var(--color-accent)' : 'var(--color-text-3)'}
      />

      <div class="text-center">
        <p class="text-sm font-medium text-[var(--color-text-2)]">
          Drop an image here
        </p>
        <p class="text-xs text-[var(--color-text-3)] mt-1">
          JPEG, PNG, WebP, TIFF, HEIC — or click to browse
        </p>
      </div>
    </div>
  )
}
