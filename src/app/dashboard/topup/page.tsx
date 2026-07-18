import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { TopUpClient } from './topup-client'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

export default async function TopUpPage() {
  const session = await auth()
  if (!session?.user?.email) return null

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) return null

  return (
    <Suspense fallback={
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: '14px', fontWeight: 600 }}>
        Loading Top-Up portal...
      </div>
    }>
      <TopUpClient userBalance={Number(user.credits)} />
    </Suspense>
  )
}
