'use server'

import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { signIn } from '@/lib/auth'
import { AuthError } from 'next-auth'

const SignUpSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
})

const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string }

export async function signUpAction(
  formData: FormData,
): Promise<ActionResult> {
  const rawInput = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const parsed = SignUpSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input',
    }
  }

  const { name, email, password } = parsed.data
  const emailNormalized = email.toLowerCase().trim()

  const existingUser = await db.user.findUnique({ where: { email: emailNormalized } })
  if (existingUser) {
    return { success: false, error: 'An account with this email already exists' }
  }

  const hashedPassword = await bcrypt.hash(password, 12)

  await db.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: { name, email: emailNormalized, hashedPassword },
    })
    await checkAndApplySignupPromo(tx, newUser.id)
  })

  // Auto sign-in after registration
  try {
    await signIn('credentials', { email, password, redirectTo: '/dashboard' })
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: 'Account created. Please sign in.' }
    }
    throw error
  }

  return { success: true }
}

async function sendLoginOtpEmail(email: string, code: string) {
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_PASS

  if (smtpUser && smtpPass) {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    })

    const mailOptions = {
      from: `"PaddleYard" <${smtpUser}>`,
      to: email,
      subject: `Your PaddleYard Login Verification Code: ${code}`,
      text: `Your PaddleYard verification code is: ${code}. This code is valid for 15 minutes.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #007C80; margin-bottom: 20px;">Admin/Staff Login Verification</h2>
          <p>Please use the following 6-digit verification code to complete your login:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 14px; background: #f0fdfa; color: #007C80; text-align: center; border-radius: 6px; margin: 24px 0; border: 1px solid #ccfbf1;">
            ${code}
          </div>
          <p style="color: #666; font-size: 13px;">This code is valid for 15 minutes. If you did not request this login, you can safely ignore this email.</p>
        </div>
      `
    }

    await transporter.sendMail(mailOptions)
  } else {
    console.log('\n=============================================')
    console.log(`[PADDLEYARD LOGIN OTP] Code: ${code} for ${email}`)
    console.log('=============================================\n')
  }
}

export async function signInAction(
  formData: FormData,
): Promise<ActionResult> {
  const rawInput = {
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const parsed = SignInSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { success: false, error: 'Invalid email or password' }
  }

  const { email, password } = parsed.data
  const emailNormalized = email.toLowerCase().trim()

  const user = await db.user.findUnique({ where: { email: emailNormalized } })
  if (!user || !user.hashedPassword) {
    return { success: false, error: 'Invalid email or password' }
  }

  const passwordMatch = await bcrypt.compare(password, user.hashedPassword)
  if (!passwordMatch) {
    return { success: false, error: 'Invalid email or password' }
  }

  const otp = formData.get('otp') as string || undefined

  if ((user.role === 'ADMIN' || user.role === 'STAFF') && !otp) {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expires = new Date(Date.now() + 15 * 60 * 1000)

    await db.verificationToken.deleteMany({
      where: { identifier: emailNormalized }
    })

    await db.verificationToken.create({
      data: {
        identifier: emailNormalized,
        token: code,
        expires
      }
    })

    try {
      await sendLoginOtpEmail(emailNormalized, code)
    } catch (err: any) {
      console.error('Failed to send login OTP:', err)
      return { success: false, error: 'Failed to send verification code. Please check SMTP settings.' }
    }

    return { success: false, error: 'OTP_REQUIRED' }
  }

  try {
    await signIn('credentials', {
      email: emailNormalized,
      password,
      otp,
      redirectTo: '/dashboard',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: 'Invalid email, password, or verification code' }
    }
    throw error
  }

  return { success: true }
}

import nodemailer from 'nodemailer'

export async function sendOtpAction(email: string): Promise<ActionResult> {
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Invalid email address' }
  }

  const emailNormalized = email.toLowerCase().trim()

  const existingUser = await db.user.findUnique({ where: { email: emailNormalized } })
  if (existingUser) {
    return { success: false, error: 'An account with this email already exists' }
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const expires = new Date(Date.now() + 15 * 60 * 1000)

  try {
    await db.verificationToken.deleteMany({
      where: { identifier: emailNormalized }
    })

    await db.verificationToken.create({
      data: {
        identifier: emailNormalized,
        token: code,
        expires
      }
    })

    console.log('\n=============================================')
    console.log(`[PADDLEYARD SIGNUP OTP] Code: ${code} for ${emailNormalized}`)
    console.log('=============================================\n')

    const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER
    const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_PASS

    if (smtpUser && smtpPass) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      })

      const mailOptions = {
        from: `"PaddleYard" <${smtpUser}>`,
        to: emailNormalized,
        subject: `Your PaddleYard Verification Code: ${code}`,
        text: `Your PaddleYard verification code is: ${code}. This code is valid for 15 minutes.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; max-width: 600px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #007C80; margin-bottom: 20px;">Verify your email address</h2>
            <p>Welcome to PaddleYard! Please verify your email by entering the 6-digit code below on the signup page:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 14px; background: #f0fdfa; color: #007C80; text-align: center; border-radius: 6px; margin: 24px 0; border: 1px solid #ccfbf1;">
              ${code}
            </div>
            <p style="color: #666; font-size: 13px;">This code is valid for 15 minutes. If you did not request this code, you can safely ignore this email.</p>
          </div>
        `
      }

      await transporter.sendMail(mailOptions)
    } else {
      console.warn('SMTP credentials missing. Skipped sending email, printed code in logs.')
    }

    return { success: true }
  } catch (error: any) {
    if (error instanceof Error && (error.message === 'NEXT_REDIRECT' || error.message?.includes('NEXT_REDIRECT') || (error as any).digest?.startsWith('NEXT_REDIRECT'))) {
      throw error
    }
    console.error('Error in sendOtpAction:', error)
    return { success: false, error: `Failed to send email: ${error.message || error}` }
  }
}

export async function signUpWithOtpAction(
  formData: FormData,
  code: string
): Promise<ActionResult> {
  const rawInput = {
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
  }

  const parsed = SignUpSchema.safeParse(rawInput)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input',
    }
  }

  const { name, email, password } = parsed.data

  try {
    const tokenRecord = await db.verificationToken.findFirst({
      where: { identifier: email, token: code }
    })

    if (!tokenRecord) {
      return { success: false, error: 'Invalid verification code.' }
    }

    if (new Date() > tokenRecord.expires) {
      return { success: false, error: 'Verification code has expired. Please request a new one.' }
    }

    await db.$transaction(async (tx) => {
      await tx.verificationToken.deleteMany({
        where: { identifier: email, token: code }
      })

      const existingUser = await tx.user.findUnique({ where: { email } })
      if (existingUser) {
        throw new Error('An account with this email already exists.')
      }

      const hashedPassword = await bcrypt.hash(password, 12)

      const newUser = await tx.user.create({
        data: { name, email, hashedPassword }
      })

      await checkAndApplySignupPromo(tx, newUser.id)
    })

    try {
      await signIn('credentials', { email, password, redirectTo: '/dashboard' })
    } catch (err) {
      if (err instanceof AuthError) {
        return { success: false, error: 'Account created. Please sign in.' }
      }
      throw err
    }

    return { success: true }
  } catch (err: any) {
    if (err instanceof Error && (err.message === 'NEXT_REDIRECT' || err.message?.includes('NEXT_REDIRECT') || (err as any).digest?.startsWith('NEXT_REDIRECT'))) {
      throw err
    }
    console.error('Error in signUpWithOtpAction:', err)
    return { success: false, error: err.message || 'Error occurred during registration.' }
  }
}

async function checkAndApplySignupPromo(tx: any, userId: string) {
  try {
    const settings = await tx.systemSetting.findMany({
      where: {
        key: {
          in: [
            'promo_signup_active',
            'promo_signup_start',
            'promo_signup_end',
            'promo_signup_limit',
            'promo_signup_amount',
            'promo_signup_count'
          ]
        }
      }
    })

    const getVal = (key: string, def: string) => {
      const match = settings.find((s: any) => s.key === key)
      return match ? match.value : def
    }

    const active = getVal('promo_signup_active', 'false') === 'true'
    if (!active) return

    const startStr = getVal('promo_signup_start', '')
    const endStr = getVal('promo_signup_end', '')
    const now = new Date()

    if (startStr) {
      const startDate = new Date(startStr)
      if (now < startDate) return
    }
    if (endStr) {
      const endDate = new Date(endStr)
      if (now > endDate) return
    }

    const limit = parseInt(getVal('promo_signup_limit', '20'))
    const count = parseInt(getVal('promo_signup_count', '0'))
    if (count >= limit) return

    const amount = parseFloat(getVal('promo_signup_amount', '100.00'))

    // Apply promo settings
    await tx.systemSetting.upsert({
      where: { key: 'promo_signup_count' },
      update: { value: (count + 1).toString() },
      create: { key: 'promo_signup_count', value: (count + 1).toString() }
    })

    await tx.user.update({
      where: { id: userId },
      data: {
        credits: { increment: amount }
      }
    })

    await tx.transaction.create({
      data: {
        userId,
        amount,
        type: 'TOPUP',
        reference: `Auto Sign-up Promo Credit (${count + 1}/${limit})`
      }
    })

    const topUpPointsRatio = 10
    const pointsAwarded = Math.floor(amount / topUpPointsRatio)
    if (pointsAwarded > 0) {
      await tx.user.update({
        where: { id: userId },
        data: {
          yardPoints: { increment: pointsAwarded },
          lifetimeYardPoints: { increment: pointsAwarded }
        }
      })

      await tx.yardPointLog.create({
        data: {
          userId,
          amount: pointsAwarded,
          reason: 'TOPUP',
          details: `Earned from Auto Sign-up Promo Credit of ₱${amount.toFixed(2)}`
        }
      })
    }
  } catch (error) {
    console.error('Error applying signup promo:', error)
  }
}
