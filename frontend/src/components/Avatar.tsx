import { cn } from '../lib/cn'

interface AvatarProps {
  name?: string | null
  email?: string | null
  imageUrl?: string | null
  className?: string
  title?: string
}

function initialFrom(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || '?'
  return source.charAt(0).toUpperCase()
}

export function Avatar({ name, email, imageUrl, className, title }: AvatarProps) {
  const label = name || email || 'User'

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={label}
        title={title || label}
        className={cn('size-9 rounded-full object-cover ring-2 ring-surface', className)}
      />
    )
  }

  return (
    <span
      title={title || label}
      className={cn(
        'grid size-9 place-items-center rounded-full bg-teal-soft text-sm font-bold text-teal ring-2 ring-surface',
        className,
      )}
    >
      {initialFrom(name, email)}
    </span>
  )
}
