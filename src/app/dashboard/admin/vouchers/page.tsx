// VOUCHER PAGE DISABLED — uncomment everything below and remove the redirect to re-enable.

import { redirect } from 'next/navigation'

// import { auth } from '@/lib/auth'
// import { db } from '@/lib/db'
// import { getRedeemableVouchersAction, getVoucherSettingsAction } from '@/lib/actions/admin'
// import { VouchersClient } from './vouchers-client'

export default async function VouchersPage() {
  // Route disabled — redirect away so the URL is inaccessible.
  redirect('/dashboard')

  // ── ORIGINAL PAGE BELOW ─────────────────────────────────────────────────────
  // const session = await auth()
  //
  // if (!session?.user?.email) {
  //   redirect('/')
  // }
  //
  // // Double check admin role
  // const dbUser = await db.user.findUnique({
  //   where: { email: session.user.email }
  // })
  //
  // if (!dbUser || dbUser.role !== 'ADMIN') {
  //   redirect('/dashboard')
  // }
  //
  // // Fetch data
  // const vouchersRes = await getRedeemableVouchersAction()
  // const settingsRes = await getVoucherSettingsAction()
  //
  // const vouchers = vouchersRes.success ? vouchersRes.vouchers : []
  //
  // // Safe fallback settings
  // const settings = settingsRes.success ? settingsRes.settings : {
  //   active: false,
  //   start: '',
  //   end: '',
  //   limit: 20,
  //   amount: 100.00,
  //   count: 0
  // }
  //
  // return (
  //   <VouchersClient
  //     initialVouchers={vouchers}
  //     initialSettings={settings}
  //   />
  // )
}
