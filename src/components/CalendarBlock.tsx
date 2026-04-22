import { Check } from 'lucide-react'
import type { CalendarBlock } from '../types'

interface CalendarBlockProps {
  block: CalendarBlock
  top: number
  height: number
  color: string
  title: string
  subtitle: string
  onOpen: (block: CalendarBlock) => void
  onResizeStart: (block: CalendarBlock, event: React.MouseEvent<HTMLButtonElement>) => void
}

export function CalendarBlockItem({
  block,
  top,
  height,
  color,
  title,
  subtitle,
  onOpen,
  onResizeStart,
}: CalendarBlockProps) {
  const readOnly = block.source === 'gcal'

  return (
    <div
      className={`absolute left-1 right-1 overflow-hidden rounded-lg border border-white/70 px-2 py-1 text-xs text-white shadow ${
        block.is_done ? 'opacity-70' : ''
      }`}
      style={{ top, height, backgroundColor: color }}
      onClick={() => {
        if (readOnly) return
        onOpen(block)
      }}
      title={readOnly ? `${title} (${new Date(block.start_time).toLocaleTimeString()} - ${new Date(block.end_time).toLocaleTimeString()})` : title}
    >
      <p className="truncate font-medium">{title}</p>
      <p className="truncate text-[10px] opacity-90">{subtitle}</p>
      {block.is_done ? (
        <span className="absolute right-1 top-1 rounded-full bg-white/30 p-0.5">
          <Check size={11} />
        </span>
      ) : null}

      {!readOnly ? (
        <button
          type="button"
          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize bg-black/20"
          onMouseDown={(event) => onResizeStart(block, event)}
          aria-label="Resize block"
        />
      ) : null}
    </div>
  )
}
