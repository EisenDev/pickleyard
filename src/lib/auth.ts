import type { NextAuthConfig } from 'next-auth'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db } from './db'

const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/',
    newUser: '/signup',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.name = user.name
        token.email = user.email
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.name = token.name as string
        session.user.email = token.email as string
        session.user.role = token.role as string
      }
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnProtectedRoute = nextUrl.pathname.startsWith('/dashboard')
      if (isOnProtectedRoute && !isLoggedIn) {
        return Response.redirect(new URL('/', nextUrl))
      }
      return true
    },
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || 'dummy_google_id',
      clientSecret: process.env.AUTH_GOOGLE_SECRET || 'dummy_google_secret',
    }),
    Credentials({
      async authorize(credentials) {
        const parsed = CredentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        const user = await db.user.findUnique({ where: { email } })
        if (!user?.hashedPassword) return null

        const passwordMatch = await bcrypt.compare(password, user.hashedPassword)
        if (!passwordMatch) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      },
    }),
  ],
}

export const { auth, signIn, signOut, handlers } = NextAuth(authConfig)
