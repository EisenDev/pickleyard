import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { ProfileClient } from './profile-client'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.email) return null

  const user = await db.user.findUnique({ where: { email: session.user.email } })
  if (!user) return null

  return (
    <ProfileClient
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        duprRating: user.duprRating,
        credits: Number(user.credits),
        membership: user.membership,
        createdAt: user.createdAt
      }}
    />
  )
}
