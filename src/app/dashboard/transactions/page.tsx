import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { TransactionsClient } from './transactions-client'

export const dynamic = 'force-dynamic'

export default async function TransactionsPage() {
  const session = await auth()
  if (!session?.user?.email) return null

  // Fetch current user details
  const user = await db.user.findUnique({
    where: { email: session.user.email }
  })
  if (!user) return null

  const isAdminOrStaff = user.role === 'ADMIN' || user.role === 'STAFF'

  // Fetch transactions based on role
  let transactions = []
  if (isAdminOrStaff) {
    transactions = await db.transaction.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } }
      }
    })
  } else {
    transactions = await db.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })
  }

  // Calculate income stats (from cash TOPUPs) for admin dashboard
  let stats = { day: 0, week: 0, month: 0, year: 0 }
  if (isAdminOrStaff) {
    const allTopups = await db.transaction.findMany({
      where: { type: 'TOPUP' }
    })

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const startOfWeek = now.getTime() - 7 * 24 * 60 * 60 * 1000
    const startOfMonth = now.getTime() - 30 * 24 * 60 * 60 * 1000
    const startOfYear = now.getTime() - 365 * 24 * 60 * 60 * 1000

    let dSum = 0
    let wSum = 0
    let mSum = 0
    let ySum = 0

    for (const t of allTopups) {
      const tTime = t.createdAt.getTime()
      const amt = Number(t.amount)
      if (tTime >= startOfToday) dSum += amt
      if (tTime >= startOfWeek) wSum += amt
      if (tTime >= startOfMonth) mSum += amt
      if (tTime >= startOfYear) ySum += amt
    }

    stats = { day: dSum, week: wSum, month: mSum, year: ySum }
  }

  // Format database types to frontend schema
  const formattedTransactions = transactions.map((t: any) => ({
    id: t.id,
    amount: Number(t.amount),
    type: t.type,
    reference: t.reference,
    createdAt: t.createdAt,
    userName: t.user?.name || undefined
  }))

  return (
    <TransactionsClient
      transactions={formattedTransactions}
      userBalance={Number(user.credits)}
      userRole={user.role}
      stats={stats}
    />
  )
}
