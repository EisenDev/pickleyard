import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { YardPointsClient } from './yard-points-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function YardPointsPage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, yardPoints: true, lifetimeYardPoints: true }
  })
  if (!user) redirect('/login')

  // Fetch last 30 point log entries
  const logs = await db.yardPointLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })

  // Fetch all active shop products
  const products = await db.shopProduct.findMany({
    where: { isActive: true },
    orderBy: { pointsCost: 'asc' },
  })

  // Fetch user's redemption requests (last 20)
  const redemptions = await db.redemptionRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: { product: { select: { name: true, category: true } } }
  })

  // Check if daily login already claimed today (Asia/Manila)
  const now = new Date()
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Manila', year: 'numeric', month: 'numeric', day: 'numeric' })
  const parts = fmt.formatToParts(now)
  const y = parts.find(p => p.type === 'year')?.value || '2026'
  const m = parts.find(p => p.type === 'month')?.value || '1'
  const d = parts.find(p => p.type === 'day')?.value || '1'
  const manilaStart = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00+08:00`)

  const dailyClaimedToday = await db.yardPointLog.findFirst({
    where: { userId: user.id, reason: 'DAILY_LOGIN', createdAt: { gte: manilaStart } }
  })

  return (
    <YardPointsClient
      userName={user.name || 'Player'}
      yardPoints={user.yardPoints}
      lifetimeYardPoints={user.lifetimeYardPoints}
      logs={logs.map(l => ({
        id: l.id,
        amount: l.amount,
        reason: l.reason,
        details: l.details || '',
        createdAt: l.createdAt.toISOString(),
      }))}
      products={products.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        category: p.category,
        pointsCost: p.pointsCost,
        stock: p.stock,
      }))}
      redemptions={redemptions.map(r => ({
        id: r.id,
        productName: r.product.name,
        productCategory: r.product.category,
        pointsDeducted: r.pointsDeducted,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      }))}
      dailyClaimedToday={!!dailyClaimedToday}
    />
  )
}
