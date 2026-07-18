import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'PaddleYard — Premium Pickleball Court Booking & Stacking',
    template: '%s | PaddleYard',
  },
  description:
    'Book your pickleball court in just a few clicks. Track play time, join open play sessions, manage player stacks, and check in securely.',
  keywords: ['pickleball booking', 'court scheduler', 'open play check-in', 'paddle stacking', 'pickleball club'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  )
}
