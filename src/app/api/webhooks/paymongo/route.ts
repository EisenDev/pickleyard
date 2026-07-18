import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

export async function POST(req: Request) {
  const rawBody = await req.text()
  const signatureHeader = req.headers.get('paymongo-signature') || ''
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET || ''

  // Validate webhook signature
  const isVerified = verifyPaymongoSignature(rawBody, signatureHeader, webhookSecret, false)
  if (!isVerified) {
    console.error('Invalid signature on PayMongo Webhook call')
    verifyPaymongoSignature(rawBody, signatureHeader, webhookSecret, true) // print diagnostics on fail
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 })
  }

  try {
    const payload = JSON.parse(rawBody)
    const eventType = payload.data?.attributes?.type

    if (eventType === 'checkout_session.payment.paid' || eventType === 'payment.paid') {
      const sessionObj = payload.data?.attributes?.data
      const metadata = sessionObj?.attributes?.metadata
      const paymentId = sessionObj?.id || 'PAYMENT'

      const userId = metadata?.userId
      const amountStr = metadata?.amount

      if (!userId || !amountStr) {
        console.error('Missing userId or amount in webhook metadata')
        return NextResponse.json({ error: 'Missing metadata.' }, { status: 400 })
      }

      const amount = parseFloat(amountStr)
      if (isNaN(amount) || amount <= 0) {
        console.error('Invalid amount in webhook metadata:', amountStr)
        return NextResponse.json({ error: 'Invalid amount.' }, { status: 400 })
      }

      // Check if this transaction reference has already been processed to prevent double crediting
      const existingTx = await db.transaction.findFirst({
        where: { reference: `PAYMONGO-${paymentId}` }
      })

      if (existingTx) {
        console.log(`Transaction PAYMONGO-${paymentId} already processed, skipping.`)
        return NextResponse.json({ received: true, message: 'Already processed.' })
      }

      // Update user credits and create ledger entry in transaction
      await db.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: userId }
        })
        if (!user) throw new Error('User not found')

        // Update credits
        await tx.user.update({
          where: { id: user.id },
          data: { credits: Number(user.credits) + amount }
        })

        // Log transaction ledger
        await tx.transaction.create({
          data: {
            userId: user.id,
            amount,
            type: 'TOPUP',
            reference: `PAYMONGO-${paymentId}`
          }
        })
      })

      console.log(`User ${userId} topped up with ₱${amount} successfully via PayMongo payment ${paymentId}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Error handling PayMongo Webhook:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

function verifyPaymongoSignature(
  rawBody: string,
  signatureHeader: string,
  webhookSecret: string,
  debug = false
): boolean {
  if (!signatureHeader || !webhookSecret) {
    if (debug) console.log('[Webhook Debug] Missing signature header or secret key.')
    return false
  }

  const parts = signatureHeader.split(',')
  let timestamp = ''
  let signature = ''

  for (const part of parts) {
    const [key, val] = part.split('=')
    if (key === 't') timestamp = val
    if (key === 'li' || key === 'te') signature = val
  }

  if (!timestamp || !signature) {
    if (debug) console.log(`[Webhook Debug] Missing parsed timestamp ("${timestamp}") or signature ("${signature}")`)
    return false
  }

  const baseString = timestamp + '.' + rawBody
  const computedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(baseString)
    .digest('hex')

  if (debug) {
    console.log(`[Webhook Debug] Parsed Signature: "${signature}"`)
    console.log(`[Webhook Debug] Computed Signature: "${computedSignature}"`)
    console.log(`[Webhook Debug] Match: ${computedSignature === signature}`)
  }

  return computedSignature === signature
}
