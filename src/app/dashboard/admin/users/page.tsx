import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { UsersClient } from './users-client'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage() {
  const session = await auth()
  if (!session?.user?.email) {
    redirect('/')
  }

  // Load user role
  const user = await db.user.findUnique({
    where: { email: session.user.email }
  })

  // Role validation: Non-admins redirect to dashboard (only ADMIN can access User Management)
  if (user?.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  // Fetch all users to list them
  const users = await db.user.findMany({
    orderBy: { createdAt: 'desc' }
  })

  return (
    <UsersClient
      users={users.map(u => ({
        id: u.id,
        name: u.name || 'Member',
        email: u.email,
        role: u.role,
        membership: u.membership,
        duprRating: u.duprRating,
        credits: Number(u.credits),
        createdAt: u.createdAt.toISOString()
      }))}
    />
  )
}
