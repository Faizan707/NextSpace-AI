import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export type BadgeTone = 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'gray'

const tones: Record<BadgeTone, string> = {
  blue: 'bg-[#e8f1ff] text-[#2f6fed]',
  green: 'bg-[#eaf8ef] text-[#1f9d55]',
  orange: 'bg-[#fff1e8] text-[#e67a2e]',
  red: 'bg-[#fdecec] text-[#e5484d]',
  purple: 'bg-[#efeafc] text-[#7c6cf0]',
  gray: 'bg-[#f3f4f6] text-[#4b5563]',
}

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
}

export function Badge({ tone = 'blue', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2.5 py-1 text-[0.75rem] font-semibold',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}
