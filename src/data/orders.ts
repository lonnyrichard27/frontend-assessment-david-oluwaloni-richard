export type Order = {
  id: string
  orderNumber: string
  customer: string
  status: 'PENDING' | 'PICKING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'
  total: number
  createdAt: string
  items: { sku: string; name: string; qty: number; unitPrice: number }[]
}

const STATUSES = [
  'PENDING',
  'PICKING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
] as const

const CUSTOMERS = [
  'Aether Labs',
  'Northwind Trading',
  'Blue Harbor Co',
  'Summit Freight',
  'Cedar & Pine',
  'Helios Retail',
  'Ironclad Supply',
  'Lumen Goods',
  'Maple Street Market',
  'Orbit Outfitters',
  'Pinnacle Parts',
  'Quiet Harbor',
  'Redwood Depot',
  'Silverline Inc',
  'Tidewater Co',
  'Umber & Oak',
  'Vesper Goods',
  'Willow Creek',
  'Yellowfield Farms',
  'Zephyr Imports',
]

const PRODUCTS = [
  { sku: 'SKU-1001', name: 'Cotton Tee', unitPrice: 18.5 },
  { sku: 'SKU-1002', name: 'Wool Sweater', unitPrice: 64 },
  { sku: 'SKU-1003', name: 'Denim Jacket', unitPrice: 89.99 },
  { sku: 'SKU-1004', name: 'Canvas Tote', unitPrice: 22 },
  { sku: 'SKU-1005', name: 'Leather Belt', unitPrice: 34.5 },
  { sku: 'SKU-1006', name: 'Running Shoes', unitPrice: 112 },
  { sku: 'SKU-1007', name: 'Wool Socks', unitPrice: 12.99 },
  { sku: 'SKU-1008', name: 'Baseball Cap', unitPrice: 24 },
  { sku: 'SKU-1009', name: 'Linen Shirt', unitPrice: 48 },
  { sku: 'SKU-1010', name: 'Chino Pants', unitPrice: 56.5 },
  { sku: 'SKU-1011', name: 'Silk Scarf', unitPrice: 39 },
  { sku: 'SKU-1012', name: 'Down Vest', unitPrice: 128 },
  { sku: 'SKU-1013', name: 'Knit Beanie', unitPrice: 16 },
  { sku: 'SKU-1014', name: 'Trail Shorts', unitPrice: 42.5 },
  { sku: 'SKU-1015', name: 'Fleece Pullover', unitPrice: 72 },
]

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a += 0x6d2b79f5
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)] as T
}

function generateOrders(): Order[] {
  const rng = mulberry32(0xc0ffee)
  const origin = Date.UTC(2024, 0, 1)
  const spanMs = 400 * 24 * 60 * 60 * 1000
  const orders: Order[] = []

  for (let i = 0; i < 5000; i++) {
    const itemCount = 1 + Math.floor(rng() * 5)
    const items: Order['items'] = []
    for (let j = 0; j < itemCount; j++) {
      const product = pick(rng, PRODUCTS)
      items.push({
        sku: product.sku,
        name: product.name,
        qty: 1 + Math.floor(rng() * 8),
        unitPrice: product.unitPrice,
      })
    }

    const total =
      Math.round(
        items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0) * 100,
      ) / 100

    orders.push({
      id: `ord-${String(i + 1).padStart(5, '0')}`,
      orderNumber: `ORD-${10001 + i}`,
      customer: pick(rng, CUSTOMERS),
      status: pick(rng, STATUSES),
      total,
      createdAt: new Date(origin + Math.floor(rng() * spanMs)).toISOString(),
      items,
    })
  }

  return orders
}

export const ORDERS: Order[] = generateOrders()
