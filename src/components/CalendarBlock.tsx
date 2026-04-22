import { Check } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
  onToggleSkip: (block: CalendarBlock) => void
  onSkipAllByTitle: (title: string) => void
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
  onToggleSkip,
  onSkipAllByTitle,
}: CalendarBlockProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const isGcal = block.source === 'gcal'
  const isSkipped = isGcal && block.is_done

  useEffect(() => {
    if (!contextMenu) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [contextMenu])

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!isGcal) return
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  return (
    <>
      <div
        className={`absolute left-1 right-1 overflow-hidden rounded-lg border px-2 py-1 text-xs shadow transition-opacity ${
          isSkipped
            ? 'border-slate-300 bg-slate-200 text-slate-400'
            : 'border-white/70 text-white'
        } ${block.is_done && !isGcal ? 'opacity-70' : ''}`}
        style={{ top, height, backgroundColor: isSkipped ? undefined : color }}
        onClick={() => {
          if (isGcal) return
          onOpen(block)
        }}
        onContextMenu={handleContextMenu}
        title={
          isGcal
            ? `${title} · ${new Date(block.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}–${new Date(block.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${isSkipped ? ' (skipped)' : ''}`
            : title
        }
      >
        <p className={`truncate font-medium ${isSkipped ? 'line-through' : ''}`}>{title}</p>
        <p className={`truncate text-[10px] ${isSkipped ? 'opacity-60' : 'opacity-90'}`}>{subtitle}</p>

        {isSkipped ? (
          <span className="absolute right-1 top-1 rounded bg-slate-300 px-1 py-0.5 text-[9px] font-medium text-slate-500">
            skipped
          </span>
        ) : null}

        {block.is_done && !isGcal ? (
          <span className="absolute right-1 top-1 rounded-full bg-white/30 p-0.5">
            <Check size={11} />
          </span>
        ) : null}

        {!isGcal ? (
          <button
            type="button"
            className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize bg-black/20"
            onMouseDown={(event) => onResizeStart(block, event)}
            aria-label="Resize block"
          />
        ) : null}
      </div>

      {contextMenu ? (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[160px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            type="button"
            className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
            onClick={() => {
              onToggleSkip(block)
              setContextMenu(null)
            }}
          >
            {isSkipped ? '✅ Mark as attending' : '🚫 Skip this class'}
          </button>
          {!isSkipped ? (
            <>
              <div className="mx-2 my-1 border-t border-slate-100 dark:border-slate-700" />
              <button
                type="button"
                className="flex w-full items-center px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700"
                onClick={() => {
                  onSkipAllByTitle(title)
                  setContextMenu(null)
                }}
              >
                🚫 Skip all <span className="ml-1 font-medium">{title}</span>
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
