import { cn } from '../../lib/cn'

export function getInitials(...parts: Array<string | null | undefined>) {
  const source = parts.find((part) => part && part.trim())?.trim() || 'U'
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

interface AvatarProps {
  src?: string | null
  name?: string | null
  email?: string | null
  alt?: string
  size?: 'sm' | 'md'
  className?: string
}

const sizes = {
  sm: 'size-8 text-[0.7rem]',
  md: 'size-10 text-xs',
}

export function Avatar({
  src,
  name,
  email,
  alt,
  size = 'sm',
  className,
}: AvatarProps) {
  const label = alt || name || email || 'User'
  const sizeClass = sizes[size]

  if (src) {
    return (
      <img
        src={src}
        alt={label}
        className={cn(
          'rounded-full object-cover ring-1 ring-[#eceef2]',
          sizeClass,
          className,
        )}
      />
    )
  }

  return (
    <span
      aria-label={label}
      className={cn(
        'grid place-items-center rounded-full bg-[#efeafc] font-bold text-[#7c6cf0] ring-1 ring-[#eceef2]',
        sizeClass,
        className,
      )}
    >
      {getInitials(name, email)}
    </span>
  )
}
