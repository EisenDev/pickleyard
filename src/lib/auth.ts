import type { NextAuthConfig } from 'next-auth'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db } from './db'
import 'nodemailer'

const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  otp: z.string().optional(),
})

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(db),
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/',
    newUser: '/signup',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Only intercept Google OAuth
      if (account?.provider === 'google') {
        const email = user.email
        if (!email) return false

        // Check if user exists in DB
        const existing = await db.user.findUnique({ where: { email } })

        if (!existing) {
          // Check if this came from the signup page via google_signup flag
          // The signup page passes callbackUrl='/dashboard?google_signup=1'
          const callbackUrl = (account as any)?.callbackUrl || ''
          const isSignupIntent = typeof callbackUrl === 'string' && callbackUrl.includes('google_signup=1')

          if (!isSignupIntent) {
            // Came from login modal — redirect to signup page with helpful hint
            return `/signup?email=${encodeURIComponent(email)}&reason=not_registered`
          }
          // Came from signup page — let PrismaAdapter create the new account (return true)
        }

        // User exists OR signup intent — allow sign-in/creation
        return true
      }
      return true
    },
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
      allowDangerousEmailAccountLinking: true,
    }),
    Credentials({
      async authorize(credentials) {
        const parsed = CredentialsSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password, otp } = parsed.data

        const user = await db.user.findUnique({ where: { email } })
        if (!user?.hashedPassword) return null

        const passwordMatch = await bcrypt.compare(password, user.hashedPassword)
        if (!passwordMatch) return null

        if (user.role === 'ADMIN' || user.role === 'STAFF') {
          if (!otp) return null

          const tokenRecord = await db.verificationToken.findFirst({
            where: { identifier: email, token: otp }
          })

          if (!tokenRecord || tokenRecord.expires < new Date()) {
            return null
          }

          await db.verificationToken.delete({
            where: {
              identifier_token: {
                identifier: email,
                token: otp
              }
            }
          })
        }

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
