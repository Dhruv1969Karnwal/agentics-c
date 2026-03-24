import { editorLabel } from '../lib/constants'
import EditorIcon from './EditorIcon'

export default function EditorDot({ source, showLabel = false, size = 8 }) {
  const label = editorLabel(source)
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={showLabel ? undefined : label}>
      <EditorIcon source={source} size={size} aria-hidden="true" />
      {showLabel && <span className="text-xs" style={{ color: 'var(--c-text2)' }}>{label}</span>}
    </span>
  )
}
