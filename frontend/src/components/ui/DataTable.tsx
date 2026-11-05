import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import type { BadgeTone } from './Badge'
import { Skeleton, SkeletonCircle, SkeletonText } from './Skeleton'

export type DataTableSortDir = 'asc' | 'desc'

export interface DataTableColumn<T> {
  id: string
  header: string
  sortable?: boolean
  sortValue?: (row: T) => string | number | null | undefined
  className?: string
  headerClassName?: string
  align?: 'left' | 'right' | 'center'
  cell: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  getRowId: (row: T) => string | number
  selectable?: boolean
  selectedIds?: Array<string | number>
  defaultSelectedIds?: Array<string | number>
  onSelectionChange?: (ids: Array<string | number>) => void
  defaultSortId?: string
  defaultSortDir?: DataTableSortDir
  sortId?: string
  sortDir?: DataTableSortDir
  onSortChange?: (id: string, dir: DataTableSortDir) => void
  loading?: boolean
  skeletonRows?: number
  emptyMessage?: string
  className?: string
}

const checkboxClass =
  'size-4 cursor-pointer rounded border-[#c9ced6] accent-[var(--color-accent)] disabled:cursor-not-allowed'

function compareValues(a: string | number | null | undefined, b: string | number | null | undefined) {
  if (a == null && b == null) return 0
  if (a == null) return 1
  if (b == null) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base' })
}

export function DataTable<T>({
  columns,
  data,
  getRowId,
  selectable = false,
  selectedIds,
  defaultSelectedIds = [],
  onSelectionChange,
  defaultSortId,
  defaultSortDir = 'asc',
  sortId: controlledSortId,
  sortDir: controlledSortDir,
  onSortChange,
  loading = false,
  skeletonRows = 6,
  emptyMessage = 'No results.',
  className,
}: DataTableProps<T>) {
  const [internalSelected, setInternalSelected] = useState<Array<string | number>>(defaultSelectedIds)
  const [internalSortId, setInternalSortId] = useState(defaultSortId ?? columns.find((c) => c.sortable)?.id)
  const [internalSortDir, setInternalSortDir] = useState<DataTableSortDir>(defaultSortDir)

  const selected = selectedIds ?? internalSelected
  const activeSortId = controlledSortId ?? internalSortId
  const activeSortDir = controlledSortDir ?? internalSortDir
  const selectedSet = useMemo(() => new Set(selected.map(String)), [selected])

  const sortedData = useMemo(() => {
    if (!activeSortId) return data
    const column = columns.find((c) => c.id === activeSortId)
    if (!column?.sortable) return data
    const getValue = column.sortValue ?? (() => '')
    const list = [...data]
    list.sort((a, b) => {
      const cmp = compareValues(getValue(a), getValue(b))
      return activeSortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [data, columns, activeSortId, activeSortDir])

  const allSelected = sortedData.length > 0 && sortedData.every((row) => selectedSet.has(String(getRowId(row))))
  const colSpan = columns.length + (selectable ? 1 : 0)

  function setSelected(next: Array<string | number>) {
    if (selectedIds === undefined) setInternalSelected(next)
    onSelectionChange?.(next)
  }

  function toggleSort(id: string) {
    const nextDir: DataTableSortDir =
      activeSortId === id ? (activeSortDir === 'asc' ? 'desc' : 'asc') : 'asc'
    if (controlledSortId === undefined) {
      setInternalSortId(id)
      setInternalSortDir(nextDir)
    }
    onSortChange?.(id, nextDir)
  }

  function toggleAll() {
    if (allSelected) {
      setSelected([])
      return
    }
    setSelected(sortedData.map((row) => getRowId(row)))
  }

  function toggleOne(id: string | number) {
    const key = String(id)
    if (selectedSet.has(key)) {
      setSelected(selected.filter((item) => String(item) !== key))
      return
    }
    setSelected([...selected, id])
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-[#eceef2] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0 text-left text-[0.875rem]">
          <thead>
            <tr>
              {selectable ? (
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    disabled={loading || sortedData.length === 0}
                    className={checkboxClass}
                    aria-label="Select all rows"
                  />
                </th>
              ) : null}
              {columns.map((column) => {
                const align =
                  column.align === 'right'
                    ? 'text-right'
                    : column.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                return (
                  <th
                    key={column.id}
                    className={cn(
                      'px-2 py-3 text-[0.78rem] font-semibold text-[#6b7280]',
                      align,
                      column.headerClassName,
                    )}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.id)}
                        className={cn(
                          'cursor-pointer bg-transparent p-0 font-semibold text-[#6b7280] transition hover:text-ink',
                          activeSortId === column.id && 'text-ink',
                        )}
                      >
                        {column.header}
                      </button>
                    ) : column.header ? (
                      column.header
                    ) : (
                      <span className="sr-only">{column.id}</span>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: skeletonRows }, (_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`} aria-hidden="true">
                  {selectable ? (
                    <td className="border-t border-[#eceef2] px-4 py-4 align-middle">
                      <Skeleton className="size-4 rounded" />
                    </td>
                  ) : null}
                  {columns.map((column, colIndex) => {
                    const align =
                      column.align === 'right'
                        ? 'justify-end'
                        : column.align === 'center'
                          ? 'justify-center'
                          : 'justify-start'
                    const isAvatarCol = column.id === 'owner' || column.id === 'avatar'
                    const isActionsCol = column.id === 'actions'
                    return (
                      <td
                        key={column.id}
                        className={cn(
                          'border-t border-[#eceef2] px-2 py-4 align-middle',
                          column.className,
                        )}
                      >
                        <div className={cn('flex', align)}>
                          {isAvatarCol ? (
                            <SkeletonCircle />
                          ) : isActionsCol ? (
                            <Skeleton className="size-9 rounded-full" />
                          ) : colIndex === 0 ? (
                            <div className="flex items-center gap-2.5">
                              <SkeletonCircle className="size-2" />
                              <SkeletonText className="h-4 w-16" />
                            </div>
                          ) : colIndex === 1 ? (
                            <Skeleton className="h-6 w-16 rounded-md" />
                          ) : (
                            <SkeletonText
                              className={cn(
                                'h-4',
                                colIndex % 3 === 0 ? 'w-28' : colIndex % 3 === 1 ? 'w-36' : 'w-24',
                              )}
                            />
                          )}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-14 text-center text-muted">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row) => {
                const id = getRowId(row)
                const checked = selectedSet.has(String(id))
                return (
                  <tr key={String(id)} className="hover:bg-[#fafbfc]">
                    {selectable ? (
                      <td className="border-t border-[#eceef2] px-4 py-4 align-middle">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOne(id)}
                          className={checkboxClass}
                          aria-label={`Select row ${id}`}
                        />
                      </td>
                    ) : null}
                    {columns.map((column) => {
                      const align =
                        column.align === 'right'
                          ? 'text-right'
                          : column.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                      return (
                        <td
                          key={column.id}
                          className={cn(
                            'border-t border-[#eceef2] px-2 py-4 align-middle',
                            align,
                            column.className,
                          )}
                        >
                          {column.cell(row)}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const dotTones: Record<BadgeTone, string> = {
  blue: 'bg-[#2f6fed]',
  green: 'bg-[#1f9d55]',
  orange: 'bg-[#e67a2e]',
  red: 'bg-[#e5484d]',
  purple: 'bg-[#7c6cf0]',
  gray: 'bg-[#9ca3af]',
}

interface TableIdProps {
  value: string
  tone?: BadgeTone
  className?: string
}

export function TableId({ value, tone = 'blue', className }: TableIdProps) {
  return (
    <div className={cn('flex items-center gap-2.5 font-medium text-ink', className)}>
      <span className={cn('size-2 shrink-0 rounded-full', dotTones[tone])} />
      {value}
    </div>
  )
}

export function formatTableDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
