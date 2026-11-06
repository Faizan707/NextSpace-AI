import { Avatar } from '../Avatar'
import { Button } from '../ui'
import type { SpaceCreator } from '../../types'
import { PlusIcon } from './icons'

interface MemberStackProps {
  people: SpaceCreator[]
  onAdd?: () => void
  addLabel?: string
  ringClassName?: string
}

export function MemberStack({
  people,
  onAdd,
  addLabel,
  ringClassName = 'ring-surface',
}: MemberStackProps) {
  const preview = people.slice(0, 3)
  const extraCount = Math.max(people.length - preview.length, 0)

  return (
    <div className="flex items-center">
      {preview.map((person, index) => (
        <Avatar
          key={person.id}
          name={person.full_name}
          email={person.email}
          imageUrl={person.avatar_url}
          title={person.full_name || person.email}
          className={index === 0 ? undefined : 'ml-[-6px]'}
        />
      ))}
      {extraCount > 0 ? (
        <span
          className={`ml-[-6px] grid size-9 place-items-center rounded-full bg-bg-elevated text-[0.7rem] font-bold text-muted ring-2 ${ringClassName}`}
        >
          +{extraCount}
        </span>
      ) : null}
      {onAdd ? (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          className="ml-[-6px] border-dashed"
          aria-label={addLabel || 'Add'}
          title={addLabel || 'Add'}
          onClick={(event) => {
            event.stopPropagation()
            onAdd()
          }}
        >
          <PlusIcon />
        </Button>
      ) : null}
    </div>
  )
}
