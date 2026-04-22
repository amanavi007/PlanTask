interface SuggestionBannerProps {
  count: number
  onDismiss: () => void
}

export function SuggestionBanner({ count, onDismiss }: SuggestionBannerProps) {
  if (!count) return null

  return (
    <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      <p>{count} new study sessions suggested</p>
      <button type="button" className="rounded bg-amber-100 px-2 py-1 text-xs" onClick={onDismiss}>
        Dismiss
      </button>
    </div>
  )
}
