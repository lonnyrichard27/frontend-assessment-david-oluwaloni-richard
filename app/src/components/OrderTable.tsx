'use client'

import { memo, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ORDERS, type Order } from '@/data/orders'

const STATUSES: Order['status'][] = [
  'PENDING',
  'PICKING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]

const COLUMNS = [
  { key: 'orderNumber', label: 'Order #' },
  { key: 'customer', label: 'Customer' },
  { key: 'status', label: 'Status' },
  { key: 'total', label: 'Total' },
  { key: 'createdAt', label: 'Created' },
] as const

type ColumnKey = (typeof COLUMNS)[number]['key']

const money = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const day = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  timeZone: 'UTC',
})

const ORDER_BY_ID = new Map(ORDERS.map((order) => [order.id, order]))

function cell(order: Order, key: ColumnKey) {
  if (key === 'total') return money.format(order.total)
  if (key === 'createdAt') return day.format(new Date(order.createdAt))
  return order[key]
}

const OrderRow = memo(function OrderRow({
  order,
  selected,
}: {
  order: Order
  selected: boolean
}) {
  return (
    <tr
      id={`row-${order.id}`}
      data-order-id={order.id}
      tabIndex={-1}
      aria-selected={selected}
      className={`order-row ${selected ? 'bg-zinc-100' : ''}`}
    >
      {COLUMNS.map((column) => (
        <td key={column.key} className="px-3 py-2">
          {cell(order, column.key)}
        </td>
      ))}
    </tr>
  )
})

function href(
  pathname: string,
  searchParams: URLSearchParams,
  patch: { q?: string; statuses?: string[] },
) {
  const params = new URLSearchParams(searchParams.toString())
  if (patch.q !== undefined) {
    if (patch.q) params.set('q', patch.q)
    else params.delete('q')
  }
  if (patch.statuses !== undefined) {
    if (patch.statuses.length) params.set('status', patch.statuses.join(','))
    else params.delete('status')
  }
  const qs = params.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

function Filters({ q, active }: { q: string; active: string[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const params = new URLSearchParams(searchParams.toString())

  return (
    <div className="order-filters mb-4 flex flex-wrap items-center gap-4">
      <input
        defaultValue={q}
        placeholder="Search order number"
        className="border border-zinc-300 px-2 py-1"
        ref={(node) => {
          if (node && document.activeElement !== node && node.value !== q) {
            node.value = q
          }
        }}
        onChange={(e) =>
          router.replace(href(pathname, params, { q: e.target.value }), {
            scroll: false,
          })
        }
      />
      {STATUSES.map((status) => (
        <label key={status} className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={active.includes(status)}
            onChange={() =>
              router.push(
                href(pathname, params, {
                  statuses: active.includes(status)
                    ? active.filter((s) => s !== status)
                    : [...active, status],
                }),
                { scroll: false },
              )
            }
          />
          {status}
        </label>
      ))}
    </div>
  )
}

function SidePanel({
  order,
  onClose,
  autoFocus,
}: {
  order: Order
  onClose: () => void
  autoFocus: boolean
}) {
  return (
    <aside
      tabIndex={-1}
      aria-label={`Order ${order.orderNumber}`}
      ref={(node) => {
        if (node && autoFocus) node.focus()
      }}
    className="order-side-panel fixed top-0 right-0 h-full w-80 overflow-auto border-l border-zinc-300 p-4 text-sm shadow-lg"
      // className="order-side-panel fixed top-0 right-0 h-full w-80 overflow-auto border-l border-zinc-300 bg-white p-4 text-sm shadow-lg"
    >
      <div className="mb-3 flex items-start justify-between">
        <h2 className="font-semibold">{order.orderNumber}</h2>
        <button onClick={onClose} aria-label="Close panel">
          ✕
        </button>
      </div>
      <dl className="mb-4 grid grid-cols-2 gap-1">
        <dt className="text-zinc-500">Customer</dt>
        <dd>{order.customer}</dd>
        <dt className="text-zinc-500">Status</dt>
        <dd>{order.status}</dd>
        <dt className="text-zinc-500">Total</dt>
        <dd>{money.format(order.total)}</dd>
        <dt className="text-zinc-500">Created</dt>
        <dd>{day.format(new Date(order.createdAt))}</dd>
      </dl>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            <th className="border-b px-1 py-1">SKU</th>
            <th className="border-b px-1 py-1">Item</th>
            <th className="border-b px-1 py-1">Qty</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, i) => (
            <tr key={`${item.sku}-${i}`}>
              <td className="border-b px-1 py-1">{item.sku}</td>
              <td className="border-b px-1 py-1">{item.name}</td>
              <td className="border-b px-1 py-1">{item.qty}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-zinc-500">Press Escape to close.</p>
    </aside>
  )
}

export function OrderTable() {
  const searchParams = useSearchParams()
  const q = searchParams.get('q') ?? ''
  const statusKey = searchParams.get('status') ?? ''

  const filtered = useMemo(() => {
    const needle = q.toUpperCase()
    const active = statusKey ? statusKey.split(',') : []
    return ORDERS.filter((order) => {
      if (needle && !order.orderNumber.toUpperCase().includes(needle)) {
        return false
      }
      if (active.length && !active.includes(order.status)) return false
      return true
    })
  }, [q, statusKey])

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [panelId, setPanelId] = useState<string | null>(null)
  const focusedPanel = useRef<string | null>(null)

  const focusRow = (id: string) => {
    const el = document.getElementById(`row-${id}`)
    el?.focus()
    el?.scrollIntoView({ block: 'nearest' })
  }

  const move = (delta: number) => {
    if (!filtered.length) return
    const i = filtered.findIndex((order) => order.id === selectedId)
    const target = i < 0 ? 0 : Math.min(filtered.length - 1, Math.max(0, i + delta))
    const next = filtered[target]
    setSelectedId(next.id)
    focusRow(next.id)
  }

  const closePanel = () => {
    if (!panelId) return
    const returnTo = panelId
    setPanelId(null)
    focusedPanel.current = null
    focusRow(returnTo)
  }

  const openPanel = (id: string) => {
    focusedPanel.current = null
    setSelectedId(id)
    setPanelId(id)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.target instanceof HTMLInputElement && event.key !== 'Escape') {
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      move(1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      move(-1)
    } else if (event.key === 'Enter' && selectedId) {
      event.preventDefault()
      openPanel(selectedId)
    } else if (event.key === 'Escape') {
      closePanel()
    }
  }

  const onClick = (event: React.MouseEvent) => {
    if (!(event.target instanceof Element)) return
    const id = event.target.closest('tr')?.getAttribute('data-order-id')
    if (id) openPanel(id)
  }

  const panelOrder = panelId ? ORDER_BY_ID.get(panelId) : undefined
  const shouldFocusPanel = panelId !== null && focusedPanel.current !== panelId
  if (shouldFocusPanel) focusedPanel.current = panelId

  return (
    <div className="order-row" onKeyDown={onKeyDown}>
      <Filters q={q} active={statusKey ? statusKey.split(',') : []} />

      <p className="order-filters mb-2 text-sm text-zinc-500">
        {filtered.length} of {ORDERS.length} orders
      </p>

      <div className="order-scroll">
        <table className="order-table border-collapse text-left text-sm">
          <thead>
            <tr>
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className="border-b border-zinc-300 px-2 py-1"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody onClick={onClick}>
            {filtered.map((order) => (
              <OrderRow
                key={order.id}
                order={order}
                selected={order.id === selectedId}
              />
            ))}
          </tbody>
        </table>
      </div>

      {panelOrder && (
        <SidePanel
          order={panelOrder}
          onClose={closePanel}
          autoFocus={shouldFocusPanel}
        />
      )}
    </div>
  )
}