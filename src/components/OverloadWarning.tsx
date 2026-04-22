import { AlertTriangle } from 'lucide-react'

interface OverloadWarningProps {
  hours: number
  threshold: number
}

export function OverloadWarning({ hours, threshold }: OverloadWarningProps) {
  if (hours <= threshold) return null

  return (
    <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
      <AlertTriangle size={12} />
      {hours.toFixed(1)}h scheduled
    </div>
  )
}
