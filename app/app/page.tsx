import { Suspense } from 'react'
import { OrderTable } from '@/src/components/OrderTable'

export default function Home() {
  return (
    <Suspense>
      <OrderTable />
    </Suspense>
  )
}
