'use client'

import { useState } from 'react'
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

export function OrderTable() {
  const [search, setSearch] = useState('')
  const [statuses, setStatuses] = useState<Order['status'][]>([])

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order number"
          className="border border-zinc-300 px-2 py-1"
        />
        {STATUSES.map((status) => (
          <label key={status} className="flex items-center gap-1 text-sm">
            <input
              type="checkbox"
              checked={statuses.includes(status)}
              onChange={() =>
                setStatuses(
                  statuses.includes(status)
                    ? statuses.filter((s) => s !== status)
                    : [...statuses, status],
                )
              }
            />
            {status}
          </label>
        ))}
      </div>
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
            if (search && !order.orderNumber.includes(search)) return false
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
    </div>
  )
}
