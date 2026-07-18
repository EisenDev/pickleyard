import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const courts = await prisma.court.findMany({ orderBy: { number: 'asc' } })
  const stacks = await prisma.paddleStack.findMany({
    where: { status: { in: ['WAITING', 'MATCHED', 'PLAYING'] } },
    include: { user: true }
  })
  
  console.log('COURTS:')
  console.dir(courts, { depth: null })
  console.log('\nPADDLESTACKS:')
  console.dir(stacks.map(s => ({
    id: s.id,
    userName: s.user.name,
    skillLevel: s.skillLevel,
    status: s.status,
    courtId: s.courtId
  })), { depth: null })
}

main().finally(() => prisma.$disconnect())
