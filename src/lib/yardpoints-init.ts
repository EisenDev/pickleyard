import { db } from './db'

export async function initYardPointsSettings() {
  const DEFAULT_SETTINGS = [
    { key: 'yp_novice_winner', value: '35' },
    { key: 'yp_intermediate_winner', value: '50' },
    { key: 'yp_advanced_winner', value: '65' },
    { key: 'yp_loser_percentage', value: '15' },
    { key: 'yp_topup_500', value: '75' },
    { key: 'yp_topup_1000', value: '180' },
    { key: 'yp_topup_2000', value: '450' },
    { key: 'yp_topup_5000', value: '1350' },
    { key: 'yp_daily_login', value: '2' },
  ]

  const DEFAULT_PRODUCTS = [
    { name: 'Bottled Water', description: 'Chilled premium spring water.', category: 'DRINK', pointsCost: 600, stock: -1 },
    { name: 'Sports Drink', description: 'Electrolyte hydration drink.', category: 'DRINK', pointsCost: 1000, stock: -1 },
    { name: 'Energy Drink', description: 'Gives you wings for the matches.', category: 'DRINK', pointsCost: 1200, stock: -1 },
    { name: '₱100 Credit Voucher', description: '₱100 discount applied to future top-ups.', category: 'VOUCHER', pointsCost: 1500, stock: -1 },
    { name: '₱250 Credit Voucher', description: '₱250 discount applied to future top-ups.', category: 'VOUCHER', pointsCost: 4000, stock: -1 },
    { name: '₱500 Credit Voucher', description: '₱500 discount applied to future top-ups.', category: 'VOUCHER', pointsCost: 8500, stock: -1 },
    { name: '30 Minutes Court Time', description: 'Free 30 minutes booking credits.', category: 'COURT_TIME', pointsCost: 1500, stock: -1 },
    { name: '1 Hour Court Time', description: 'Free 1 hour booking credits.', category: 'COURT_TIME', pointsCost: 3000, stock: -1 },
    { name: '2 Hours Court Time', description: 'Free 2 hours booking credits.', category: 'COURT_TIME', pointsCost: 5800, stock: -1 },
  ]

  // 1. Seed System Settings
  for (const s of DEFAULT_SETTINGS) {
    const existing = await db.systemSetting.findUnique({ where: { key: s.key } })
    if (!existing) {
      await db.systemSetting.create({ data: { key: s.key, value: s.value } })
    }
  }

  // 2. Seed Shop Products
  for (const p of DEFAULT_PRODUCTS) {
    const existing = await db.shopProduct.findFirst({ where: { name: p.name } })
    if (!existing) {
      await db.shopProduct.create({
        data: {
          name: p.name,
          description: p.description,
          category: p.category,
          pointsCost: p.pointsCost,
          stock: p.stock,
          isActive: true
        }
      })
    }
  }
}
