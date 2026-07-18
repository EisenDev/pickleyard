import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { SettingsClient } from './settings-client'

export default async function AdminSettingsPage() {
  const session = await auth()
  if (!session || session.user?.role !== 'ADMIN') {
    redirect('/dashboard')
  }

  // Fetch current system settings from database
  const list = await db.systemSetting.findMany()
  const settings: Record<string, string> = {
    booking_duration_minutes: '60',
    booking_price_per_hour: '500',
    openplay_match_duration_seconds: '900',
    openplay_expiry_hours: '3',
    openplay_entry_fee: '150',
    openplay_start_hour: '8',
    openplay_end_hour: '22'
  }
  for (const item of list) {
    settings[item.key] = item.value
  }

  // Fetch all courts for status toggles
  const courts = await db.court.findMany({
    orderBy: { number: 'asc' }
  })

  return (
    <SettingsClient
      initialSettings={settings}
      courts={courts.map(c => ({
        id: c.id,
        number: c.number,
        name: c.name,
        status: c.status
      }))}
    />
  )
}
