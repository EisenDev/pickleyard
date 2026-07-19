import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { YardPointsAdminClient } from './yard-points-admin-client'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AdminYardPointsPage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/login')

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) redirect('/dashboard')

  // All system settings
  const rawSettings = await db.systemSetting.findMany()
  const settingsMap: Record<string, string> = {}
  for (const s of rawSettings) settingsMap[s.key] = s.value

  // All shop products
  const products = await db.shopProduct.findMany({ orderBy: { createdAt: 'asc' } })

  // Pending redemptions with user/product info
  const pendingRedemptions = await db.redemptionRequest.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { name: true, email: true } },
      product: { select: { name: true, category: true } }
    }
  })

  // All redemptions (last 50)
  const allRedemptions = await db.redemptionRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      user: { select: { name: true, email: true } },
      product: { select: { name: true, category: true } }
    }
  })

  return (
    <YardPointsAdminClient
      settings={settingsMap}
      products={products.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description || '',
        category: p.category,
        pointsCost: p.pointsCost,
        stock: p.stock,
        isActive: p.isActive,
      }))}
      pendingRedemptions={pendingRedemptions.map(r => ({
        id: r.id,
        userName: r.user.name || r.user.email,
        userEmail: r.user.email,
        productName: r.product.name,
        productCategory: r.product.category,
        pointsDeducted: r.pointsDeducted,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      }))}
      allRedemptions={allRedemptions.map(r => ({
        id: r.id,
        userName: r.user.name || r.user.email,
        productName: r.product.name,
        productCategory: r.product.category,
        pointsDeducted: r.pointsDeducted,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  )
}
