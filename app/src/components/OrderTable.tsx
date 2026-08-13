'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ORDERS, type Order } from '@/src/data/orders'

const STATUSES: Order['status'][] = [
  'PENDING',
  'PICKING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
]

type Column = {
  key: 'orderNumber' | 'customer' | 'status' | 'total' | 'createdAt'
  label: string
}

function OrderRow({
  order,
  columns,
  onClick,
}: {
  order: Order
  columns: Column[]
  onClick: () => void
}) {
  return (
    <tr onClick={onClick}>
      {columns.map((column) => (
        <td key={column.key} className="border-b border-zinc-200 px-2 py-1">
          {column.key === 'total' ? order.total.toFixed(2) : order[column.key]}
        </td>
      ))}
    </tr>
  )
}

function readFilters(searchParams: { get: (key: string) => string | null }) {
  const q = searchParams.get('q') ?? ''
  const selected = (searchParams.get('status') ?? '').split(',')
  const statuses = STATUSES.filter((status) => selected.includes(status))
  return { q, statuses }
}

function href(
  pathname: string,
  searchParams: { toString: () => string },
  patch: { q?: string; statuses?: Order['status'][] },
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

function Filters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { q, statuses } = readFilters(searchParams)

  return (
    <div className="mb-4 flex flex-wrap items-center gap-4">
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
          router.replace(href(pathname, searchParams, { q: e.target.value }), {
            scroll: false,
          })
        }
      />
      {STATUSES.map((status) => (
        <label key={status} className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={statuses.includes(status)}
            onChange={() => {
              const next = statuses.includes(status)
                ? statuses.filter((s) => s !== status)
                : [...statuses, status]
              router.push(href(pathname, searchParams, { statuses: next }), {
                scroll: false,
              })
            }}
          />
          {status}
        </label>
      ))}
    </div>
  )
}

function Rows() {
  const searchParams = useSearchParams()
  const { q, statuses } = readFilters(searchParams)

  return (
    <table className="w-full border-collapse text-left text-sm">
      <thead>
        <tr>
          <th className="border-b border-zinc-300 px-2 py-1">Order #</th>
          <th className="border-b border-zinc-300 px-2 py-1">Customer</th>
          <th className="border-b border-zinc-300 px-2 py-1">Status</th>
          <th className="border-b border-zinc-300 px-2 py-1">Total</th>
          <th className="border-b border-zinc-300 px-2 py-1">Created</th>
        </tr>
      </thead>
      <tbody>
        {ORDERS.filter((order) => {
          if (q && !order.orderNumber.includes(q)) return false
          if (statuses.length > 0 && !statuses.includes(order.status))
            return false
          return true
        }).map((order) => (
          <OrderRow
            key={order.id}
            order={order}
            columns={[
              { key: 'orderNumber', label: 'Order #' },
              { key: 'customer', label: 'Customer' },
              { key: 'status', label: 'Status' },
              { key: 'total', label: 'Total' },
              { key: 'createdAt', label: 'Created' },
            ]}
            onClick={() => {
              void order.id
            }}
          />
        ))}
      </tbody>
    </table>
  )
}

export function OrderTable() {
  return (
    <div className="p-4">
      <Filters />
      <Rows />
    </div>
  )
}
