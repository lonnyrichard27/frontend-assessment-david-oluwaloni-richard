import { Suspense } from 'react'
import { OrderTable } from '@/components/OrderTable'

export default function Home() {
  return (
    <Suspense>
      <OrderTable />
    </Suspense>
  )
}
