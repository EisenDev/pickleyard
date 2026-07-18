import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/shared/sidebar'
import { Header } from '@/components/shared/header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)' }}>
      {/* Sidebar navigation */}
      <Sidebar user={session.user} />

      {/* Main layout frame */}
      <div
        style={{
          marginLeft: 'var(--sidebar-width)',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Header user={session.user} />
        
        <main
          style={{
            flex: 1,
            padding: 'var(--spacing-page-y) var(--spacing-page-x)',
            maxWidth: '1600px',
            width: '100%',
            margin: '0 auto',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
