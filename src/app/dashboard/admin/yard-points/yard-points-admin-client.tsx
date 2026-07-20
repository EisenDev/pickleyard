'use client'

import { useState, useTransition } from 'react'
import {
  updateYardPointsSettingsAction,
  createShopProductAction,
  updateShopProductAction,
  deleteShopProductAction,
  processRedemptionAction
} from '@/lib/actions/yardpoints'
import { Star, Plus, Edit2, Trash2, CheckCircle, XCircle, AlertCircle, Save, Package, Settings, ShoppingBag, Clock, Gift, Droplets, X } from 'lucide-react'

interface Product {
  id: string; name: string; description: string; category: string
  pointsCost: number; stock: number; isActive: boolean
}
interface Redemption {
  id: string; userName: string; userEmail?: string; productName: string
  productCategory: string; pointsDeducted: number; status: string; createdAt: string
}

interface Props {
  settings: Record<string, string>
  products: Product[]
  pendingRedemptions: Redemption[]
  allRedemptions: Omit<Redemption, 'userEmail'>[]
}

const CATEGORY_OPTIONS = ['DRINK', 'VOUCHER', 'COURT_TIME', 'MERCHANDISE', 'OTHER']
const CATEGORY_ICONS: Record<string, any> = {
  DRINK: Droplets, VOUCHER: Gift, COURT_TIME: Clock, MERCHANDISE: Star, OTHER: Package
}
const CATEGORY_COLORS: Record<string, string> = {
  DRINK: '#3b82f6', VOUCHER: '#10b981', COURT_TIME: '#8b5cf6', MERCHANDISE: '#f59e0b', OTHER: '#6b7280'
}

// ── System Default Rates ──────────────────────────────────────────────────
const DEFAULT_RATES: Record<string, string> = {
  yp_novice_winner: '35',
  yp_intermediate_winner: '50',
  yp_advanced_winner: '65',
  yp_loser_percentage: '15',
  yp_daily_login: '2',
  yp_topup_500: '75',
  yp_topup_1000: '180',
  yp_topup_2000: '450',
  yp_topup_5000: '1350',
}

export function YardPointsAdminClient({ settings: initialSettings, products: initialProducts, pendingRedemptions, allRedemptions }: Props) {
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<'settings' | 'products' | 'redemptions'>('settings')
  const [notice, setNotice] = useState<{ success: boolean; text: string } | null>(null)

  // ── Settings State ─────────────────────────────────────────────────────────
  const [settings, setSettings] = useState(() => {
    const merged: Record<string, string> = { ...DEFAULT_RATES }
    for (const [key, val] of Object.entries(initialSettings)) {
      if (val !== undefined && val !== null && val !== '') {
        merged[key] = val
      }
    }
    return merged
  })

  // ── Products State ─────────────────────────────────────────────────────────
  const [products, setProducts] = useState(initialProducts)
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [productForm, setProductForm] = useState({
    name: '', description: '', category: 'DRINK', pointsCost: 600, stock: -1, isActive: true
  })

  const showNotice = (success: boolean, text: string) => {
    setNotice({ success, text })
    setTimeout(() => setNotice(null), 5000)
  }

  // ── Save Settings ─────────────────────────────────────────────────────────
  const handleSaveSettings = () => {
    startTransition(async () => {
      const res = await updateYardPointsSettingsAction(settings)
      if (res.success) showNotice(true, '✅ Settings saved successfully!')
      else showNotice(false, res.error || 'Failed to save settings.')
    })
  }

  const handleResetSettings = () => {
    if (!confirm('Are you sure you want to reset all rates to system default rates?')) return
    setSettings(prev => ({
      ...prev,
      ...DEFAULT_RATES
    }))
    startTransition(async () => {
      const res = await updateYardPointsSettingsAction(DEFAULT_RATES)
      if (res.success) showNotice(true, '✅ Settings reset to system defaults successfully!')
      else showNotice(false, res.error || 'Failed to reset settings.')
    })
  }

  // ── Product Form ──────────────────────────────────────────────────────────
  const openAddProduct = () => {
    setProductForm({ name: '', description: '', category: 'DRINK', pointsCost: 600, stock: -1, isActive: true })
    setEditingProduct(null)
    setShowAddProduct(true)
  }
  const openEditProduct = (p: Product) => {
    setProductForm({ name: p.name, description: p.description, category: p.category, pointsCost: p.pointsCost, stock: p.stock, isActive: p.isActive })
    setEditingProduct(p)
    setShowAddProduct(true)
  }

  const handleSubmitProduct = () => {
    startTransition(async () => {
      if (editingProduct) {
        const res = await updateShopProductAction(editingProduct.id, productForm)
        if (res.success) {
          setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...productForm } : p))
          showNotice(true, '✅ Product updated!')
        } else showNotice(false, res.error || 'Failed to update product.')
      } else {
        const res = await createShopProductAction(productForm)
        if (res.success) {
          showNotice(true, '✅ Product created! Refresh to see it.')
        } else showNotice(false, res.error || 'Failed to create product.')
      }
      setShowAddProduct(false)
    })
  }

  const handleDeleteProduct = (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    startTransition(async () => {
      const res = await deleteShopProductAction(id)
      if (res.success) {
        setProducts(prev => prev.filter(p => p.id !== id))
        showNotice(true, '✅ Product deleted.')
      } else showNotice(false, res.error || 'Failed to delete.')
    })
  }

  const handleProcessRedemption = (id: string, status: 'APPROVED' | 'REJECTED') => {
    const notes = status === 'REJECTED' ? prompt('Rejection reason (optional):') || '' : undefined
    startTransition(async () => {
      const res = await processRedemptionAction(id, status, notes)
      if (res.success) {
        showNotice(true, `✅ Redemption ${status.toLowerCase()}! ${status === 'APPROVED' && 'Any voucher credits auto-applied.'}`)
      } else showNotice(false, res.error || 'Failed to process.')
    })
  }

  // ── Settings Fields Config ─────────────────────────────────────────────────
  const earningFields = [
    { key: 'yp_novice_winner',       label: 'Novice Winner Points',       suffix: 'YP', def: '35' },
    { key: 'yp_intermediate_winner',  label: 'Intermediate Winner Points', suffix: 'YP', def: '50' },
    { key: 'yp_advanced_winner',      label: 'Advanced Winner Points',     suffix: 'YP', def: '65' },
    { key: 'yp_loser_percentage',     label: 'Loser Reward Percentage',    suffix: '%',  def: '15' },
    { key: 'yp_daily_login',          label: 'Daily Login Reward',         suffix: 'YP', def: '2' },
  ]
  const topupFields = [
    { key: 'yp_topup_500',  label: '₱500 Top-up Reward',   suffix: 'YP', def: '75' },
    { key: 'yp_topup_1000', label: '₱1,000 Top-up Reward', suffix: 'YP', def: '180' },
    { key: 'yp_topup_2000', label: '₱2,000 Top-up Reward', suffix: 'YP', def: '450' },
    { key: 'yp_topup_5000', label: '₱5,000 Top-up Reward', suffix: 'YP', def: '1350' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '4px 0 32px' }}>
      {/* Notice */}
      {notice && (
        <div style={{
          padding: '12px 16px', borderRadius: 'var(--radius-lg)', fontSize: '13px', fontWeight: 650,
          display: 'flex', alignItems: 'center', gap: '8px',
          background: notice.success ? 'var(--color-success-subtle)' : 'var(--color-danger-subtle)',
          color: notice.success ? 'var(--color-success)' : 'var(--color-danger)',
          border: `1.5px solid ${notice.success ? '#bbf7d0' : '#fecaca'}`,
        }}>
          {notice.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          <span>{notice.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Star size={22} color="#f59e0b" fill="#f59e0b" />
            Yard Points Manager
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
            Configure earning rates, manage shop products, and process player redemptions.
          </p>
        </div>
        {pendingRedemptions.length > 0 && (
          <span style={{ fontSize: '12px', fontWeight: 800, background: '#ef4444', color: 'white', padding: '4px 12px', borderRadius: 'var(--radius-full)', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }}>
            {pendingRedemptions.length} Pending Redemption{pendingRedemptions.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="admin-tabs-container" style={{ display: 'flex', gap: '4px', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', padding: '4px', border: '1px solid var(--color-border)' }}>
        {([
          ['settings', '⚙️ Earning Rates'],
          ['products', '🛒 Shop Products'],
          ['redemptions', `📦 Redemptions${pendingRedemptions.length > 0 ? ` (${pendingRedemptions.length})` : ''}`],
        ] as const).map(([tab, label]) => (
          <button key={tab} className="admin-tab-btn" onClick={() => setActiveTab(tab)} style={{
            flex: 1, height: '36px', border: 'none', borderRadius: 'var(--radius-md)',
            background: activeTab === tab ? 'var(--color-card)' : 'transparent',
            color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontSize: '13px', fontWeight: activeTab === tab ? 700 : 500, cursor: 'pointer',
            boxShadow: activeTab === tab ? 'var(--shadow-sm)' : 'none', transition: 'all 120ms',
            whiteSpace: 'nowrap'
          }}>{label}</button>
        ))}
      </div>

      {/* ── Settings Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Two-column grid for settings cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

            {/* Earning Rates Card */}
            <div style={{ background: 'var(--color-card)', borderRadius: 'var(--radius-xl)', padding: '24px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Star size={16} color="#f59e0b" fill="#f59e0b" /> Open Play &amp; Login Rates
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)' }}>Points awarded per match by skill level.</p>
              </div>
              {earningFields.map(field => (
                <div key={field.key}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>
                    {field.label}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      value={settings[field.key] || ''}
                      onChange={e => setSettings(prev => ({ ...prev, [field.key]: e.target.value }))}
                      style={{ flex: 1, height: '40px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0 12px', fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', background: 'var(--color-surface)' }}
                      min={0}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', minWidth: '28px' }}>{field.suffix}</span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--color-text-disabled)' }}>System default: <strong>{field.def} YP</strong></p>
                </div>
              ))}
            </div>

            {/* Top-up Rates Card */}
            <div style={{ background: 'var(--color-card)', borderRadius: 'var(--radius-xl)', padding: '24px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Gift size={16} color="#10b981" /> Top-up Reward Rates
                </h3>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  Points awarded when a player tops up their wallet at or above these amounts.
                </p>
              </div>
              {topupFields.map(field => (
                <div key={field.key}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>
                    {field.label}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      value={settings[field.key] || ''}
                      onChange={e => setSettings(prev => ({ ...prev, [field.key]: e.target.value }))}
                      style={{ flex: 1, height: '40px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0 12px', fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', background: 'var(--color-surface)' }}
                      min={0}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#f59e0b', minWidth: '28px' }}>{field.suffix}</span>
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--color-text-disabled)' }}>System default: <strong>{field.def} YP</strong></p>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons row — full width below both cards */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={handleSaveSettings}
              disabled={isPending}
              style={{
                flex: 1, minWidth: '180px', height: '44px', border: 'none', borderRadius: 'var(--radius-md)',
                background: 'var(--color-primary)', color: 'white',
                fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: 'var(--shadow-primary-btn)', transition: 'opacity 120ms'
              }}
            >
              <Save size={15} />
              {isPending ? 'Saving…' : 'Save All Settings'}
            </button>
            <button
              onClick={handleResetSettings}
              disabled={isPending}
              style={{
                flex: 1, minWidth: '180px', height: '44px', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface)', color: 'var(--color-text-secondary)',
                fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 120ms'
              }}
            >
              ↩ Reset to Defaults
            </button>
          </div>
        </div>
      )}

      {/* ── Products Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'products' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: 'var(--color-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)' }}>Shop Catalog</h3>
              <button
                onClick={openAddProduct}
                style={{ height: '34px', padding: '0 16px', border: 'none', borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: 'white', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: 'var(--shadow-primary-btn)', whiteSpace: 'nowrap' }}
              >
                <Plus size={14} /> Add Product
              </button>
            </div>
            {products.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-disabled)' }}>
                <p style={{ margin: 0 }}>No products yet. Click "Add Product" to create one.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface)' }}>
                      {['Product', 'Category', 'YP Cost', 'Stock', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-disabled)', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, i) => {
                      const CatIcon = CATEGORY_ICONS[product.category] || Package
                      const catColor = CATEGORY_COLORS[product.category] || '#6b7280'
                      return (
                        <tr key={product.id} style={{ borderBottom: i < products.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{product.name}</div>
                            {product.description && <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{product.description}</div>}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: catColor, background: `${catColor}15`, padding: '3px 8px', borderRadius: 'var(--radius-full)' }}>
                              <CatIcon size={12} />{product.category}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 800, color: '#f59e0b', fontSize: '14px' }}>
                            {product.pointsCost.toLocaleString()} YP
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                            {product.stock === -1 ? '∞ Unlimited' : `${product.stock} left`}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: product.isActive ? 'var(--color-success)' : '#6b7280', background: product.isActive ? 'var(--color-success-subtle)' : 'var(--color-surface)', padding: '3px 8px', borderRadius: 'var(--radius-full)', border: `1px solid ${product.isActive ? '#bbf7d0' : 'var(--color-border)'}` }}>
                              {product.isActive ? 'Active' : 'Hidden'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={() => openEditProduct(product)} style={{ padding: '6px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Edit2 size={12} /> Edit
                              </button>
                              <button onClick={() => handleDeleteProduct(product.id, product.name)} style={{ padding: '6px 12px', border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--color-danger-subtle)', color: 'var(--color-danger)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Trash2 size={12} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Redemptions Tab ──────────────────────────────────────────────── */}
      {activeTab === 'redemptions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Pending Section */}
          {pendingRedemptions.length > 0 && (
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#f59e0b', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⏳ Pending — Awaiting Approval
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pendingRedemptions.map(r => {
                  const catColor = CATEGORY_COLORS[r.productCategory] || '#6b7280'
                  const CatIcon = CATEGORY_ICONS[r.productCategory] || Package
                  return (
                    <div key={r.id} style={{ background: 'var(--color-card)', border: '1.5px solid #fde68a', borderRadius: 'var(--radius-xl)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${catColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CatIcon size={20} color={catColor} />
                      </div>
                      <div style={{ flex: 1, minWidth: '160px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)' }}>{r.productName}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                          {r.userName} · {new Date(r.createdAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444', marginTop: '2px' }}>
                          -{r.pointsDeducted.toLocaleString()} YP deducted
                        </div>
                      </div>
                      {r.productCategory === 'VOUCHER' && (
                        <span style={{ fontSize: '10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '3px 8px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
                          💳 Auto-credit on approve
                        </span>
                      )}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleProcessRedemption(r.id, 'APPROVED')}
                          disabled={isPending}
                          style={{ height: '36px', padding: '0 16px', border: 'none', borderRadius: 'var(--radius-md)', background: 'var(--color-success)', color: 'white', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <CheckCircle size={14} /> Approve
                        </button>
                        <button
                          onClick={() => handleProcessRedemption(r.id, 'REJECTED')}
                          disabled={isPending}
                          style={{ height: '36px', padding: '0 16px', border: 'none', borderRadius: 'var(--radius-md)', background: 'var(--color-danger-subtle)', color: 'var(--color-danger)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* All Redemptions History */}
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>
              📋 All Redemptions History
            </h3>
            <div style={{ background: 'var(--color-card)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-border)', overflow: 'hidden' }}>
              {allRedemptions.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-disabled)' }}>
                  <p style={{ margin: 0 }}>No redemptions yet.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '500px' }}>
                    <thead>
                      <tr style={{ background: 'var(--color-surface)' }}>
                        {['Player', 'Product', 'YP Spent', 'Status', 'Date'].map(h => (
                          <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-disabled)', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allRedemptions.map((r, i) => {
                        const statusConfig = { PENDING: { color: '#f59e0b', label: 'Pending' }, APPROVED: { color: '#10b981', label: 'Approved' }, REJECTED: { color: '#ef4444', label: 'Rejected' } }[r.status] || { color: '#6b7280', label: r.status }
                        return (
                          <tr key={r.id} style={{ borderBottom: i < allRedemptions.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                            <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{r.userName}</td>
                            <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>{r.productName}</td>
                            <td style={{ padding: '12px 16px', fontWeight: 700, color: '#ef4444', fontSize: '13px' }}>{r.pointsDeducted.toLocaleString()}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{ fontSize: '11px', fontWeight: 700, color: statusConfig.color, background: `${statusConfig.color}15`, padding: '3px 8px', borderRadius: 'var(--radius-full)' }}>
                                {statusConfig.label}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--color-text-disabled)' }}>
                              {new Date(r.createdAt).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Product Modal ──────────────────────────────────────── */}
      {showAddProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'var(--color-card)', borderRadius: 'var(--radius-xl)', padding: '28px', width: '100%', maxWidth: '440px', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--color-text-primary)' }}>{editingProduct ? 'Edit Product' : 'Add New Product'}</h3>
              <button onClick={() => setShowAddProduct(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: '4px' }}>
                <X size={20} />
              </button>
            </div>

            {[
              { label: 'Product Name *', key: 'name', type: 'text' },
              { label: 'Description', key: 'description', type: 'text' },
              { label: 'Points Cost (YP) *', key: 'pointsCost', type: 'number' },
              { label: 'Stock (-1 for unlimited)', key: 'stock', type: 'number' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>{label}</label>
                <input
                  type={type}
                  value={(productForm as any)[key]}
                  onChange={e => setProductForm(prev => ({ ...prev, [key]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))}
                  style={{ width: '100%', height: '38px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0 12px', fontSize: '14px', color: 'var(--color-text-primary)', background: 'var(--color-surface)', boxSizing: 'border-box' }}
                />
              </div>
            ))}

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)', display: 'block', marginBottom: '6px' }}>Category *</label>
              <select
                value={productForm.category}
                onChange={e => setProductForm(prev => ({ ...prev, category: e.target.value }))}
                style={{ width: '100%', height: '38px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0 12px', fontSize: '14px', color: 'var(--color-text-primary)', background: 'var(--color-surface)' }}
              >
                {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                type="checkbox"
                id="isActive"
                checked={productForm.isActive}
                onChange={e => setProductForm(prev => ({ ...prev, isActive: e.target.checked }))}
                style={{ width: '16px', height: '16px' }}
              />
              <label htmlFor="isActive" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', cursor: 'pointer' }}>Active (visible in player shop)</label>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button onClick={() => setShowAddProduct(false)} style={{ flex: 1, height: '40px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', color: 'var(--color-text-secondary)' }}>
                Cancel
              </button>
              <button onClick={handleSubmitProduct} disabled={!productForm.name || isPending} style={{ flex: 2, height: '40px', border: 'none', borderRadius: 'var(--radius-md)', background: 'var(--color-primary)', color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: 'var(--shadow-primary-btn)' }}>
                <Save size={14} />
                {isPending ? 'Saving...' : editingProduct ? 'Save Changes' : 'Create Product'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 640px) {
          table { font-size: 11px !important; }
          td, th { padding: 8px 10px !important; }
          .admin-tabs-container {
            overflow-x: auto !important;
            white-space: nowrap !important;
            display: flex !important;
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
            padding: 3px !important;
          }
          .admin-tabs-container::-webkit-scrollbar {
            display: none !important;
          }
          .admin-tab-btn {
            flex: 0 0 auto !important;
            padding: 0 14px !important;
            font-size: 11px !important;
          }
        }
      `}</style>
    </div>
  )
}
