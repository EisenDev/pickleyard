import { authConfig } from '@/lib/auth'
import NextAuth from 'next-auth'

const authHandler = NextAuth(authConfig).auth

export default authHandler

export const config = {
  // Protect routes starting with dashboard
  matcher: ['/dashboard/:path*'],
}
