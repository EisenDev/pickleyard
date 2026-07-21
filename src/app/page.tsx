'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { SignInModal } from '@/components/auth/signin-modal'
import {
  Calendar,
  CreditCard,
  Clock,
  ClipboardCheck,
  CheckCircle2,
  Menu,
  X,
  MapPin,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

// Isolated component so useSearchParams doesn't block static prerendering of LandingPage
function OAuthErrorHandler({ onError }: { onError: (msg: string) => void }) {
  const searchParams = useSearchParams()
  useEffect(() => {
    const error = searchParams.get('error')
    if (error === 'OAuthAccountNotLinked') {
      onError('This email is already registered with a different sign-in method. Please use email & password to log in.')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])
  return null
}

export default function LandingPage() {
  const [isSignInOpen, setIsSignInOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data && Object.keys(data).length > 0 && data.user) {
          setSession(data)
        }
      })
      .catch(err => console.error(err))

    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const courtsData = [
    { id: '1', name: 'Court 1', image: '/court_illustration.jpg' },
    { id: '2', name: 'Court 2', image: '/court_illustration.jpg' },
    { id: '3', name: 'Court 3', image: '/court_illustration.jpg' },
    { id: '4', name: 'Court 4', image: '/court_illustration.jpg' },
    { id: '5', name: 'Court 5', image: '/court_illustration.jpg' },
    { id: '6', name: 'Court 6', image: '/court_illustration.jpg' },
    { id: '7', name: 'Court 7', image: '/court_illustration.jpg' },
    { id: '8', name: 'Court 8', image: '/court_illustration.jpg' },
    { id: '9', name: 'Court 9', image: '/court_illustration.jpg' },
    { id: '10', name: 'Court 10', image: '/court_illustration.jpg' }
  ]

  // Reset index when changing viewport mode
  useEffect(() => {
    setActiveIndex(0)
  }, [isMobile])

  // Auto-slide effect for the courts carousel
  useEffect(() => {
    const totalPages = isMobile ? 10 : 3
    const interval = setInterval(() => {
      setActiveIndex(prev => {
        if (prev >= totalPages - 1) return 0
        return prev + 1
      })
    }, 5000) // Slide every 5 seconds
    return () => clearInterval(interval)
  }, [isMobile])

  const displayPages = isMobile
    ? courtsData.map(c => [c])
    : [
        courtsData.slice(0, 4),
        courtsData.slice(4, 8),
        courtsData.slice(8, 10)
      ]

  const totalPages = isMobile ? 10 : 3
  const maxIndex = totalPages - 1

  const handlePrev = () => {
    setActiveIndex(prev => Math.max(prev - 1, 0))
  }

  const handleNext = () => {
    setActiveIndex(prev => Math.min(prev + 1, maxIndex))
  }

  return (
    <div style={{ background: 'var(--color-bg-primary)', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Navigation Header */}
      <header className="header-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src="/paddleyard-logo.png" alt="PaddleYard Logo" style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: '50%' }} />
          <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', paddingLeft: '4px' }}>
            PaddleYard
          </span>
        </div>

        {/* Desktop Nav Links */}
        <nav className="desktop-nav">
          <Link href="#courts" className="nav-link">Courts</Link>
          <Link href="#features" className="nav-link">Why PaddleYard</Link>
          <Link href="#how-it-works" className="nav-link">How It Works</Link>
        </nav>

        {/* Desktop Actions */}
        <div className="desktop-actions">
          {session ? (
            <Link href="/dashboard" className="get-started-btn">
              Go to Dashboard
            </Link>
          ) : (
            <>
              <button
                onClick={() => setIsSignInOpen(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 14,
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 650,
                  transition: 'color var(--duration-fast)'
                }}
                className="login-btn-link"
              >
                Log in
              </button>
              <Link href="/signup" className="get-started-btn">
                Book a Court
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Trigger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="mobile-menu-trigger"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="mobile-drawer">
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '24px 0' }}>
            <Link href="#courts" onClick={() => setMobileMenuOpen(false)} className="nav-link-mobile">Courts</Link>
            <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="nav-link-mobile">Why PaddleYard</Link>
            <Link href="#how-it-works" onClick={() => setMobileMenuOpen(false)} className="nav-link-mobile">How It Works</Link>
            <div style={{ height: 1, background: 'var(--color-border)', margin: '10px 0' }} />
            {session ? (
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="get-started-btn" style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 44 }}>
                Go to Dashboard
              </Link>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setIsSignInOpen(true)
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    height: 44,
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                  }}
                >
                  Log in
                </button>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="get-started-btn" style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', height: 44 }}>
                  Book a Court
                </Link>
              </>
            )}
          </nav>
        </div>
      )}

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          {/* Left Hero Content */}
          <div className="hero-left-content animate-fade-up">
            <div className="badge-courts">
              <span className="badge-courts-dot" />
              <span>INDOOR COURTS. ALL DAY.</span>
            </div>

            <h1 className="hero-title">
              Book Your<br />
              Pickleball Court<br />
              <span className="title-accent-success">Play More.</span>
            </h1>

            <p className="hero-subtitle">
              Premium indoor pickleball courts. Easy booking. Real-time availability.
            </p>

            <div className="hero-actions">
              {session ? (
                <>
                  <Link href="/dashboard/bookings" className="get-started-btn hero-cta-btn">
                    Book a Court 📅
                  </Link>
                  <Link href="/dashboard/bookings" className="sec-btn hero-cta-btn">
                    <span>View Courts</span>
                    <MapPin size={14} style={{ marginLeft: 6 }} />
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/signup" className="get-started-btn hero-cta-btn">
                    Book a Court 📅
                  </Link>
                  <button className="sec-btn hero-cta-btn" onClick={() => setIsSignInOpen(true)}>
                    <span>View Courts</span>
                    <MapPin size={14} style={{ marginLeft: 6 }} />
                  </button>
                </>
              )}
            </div>

            {/* Rating Stars proof */}
            <div className="user-proof">
              <div className="avatars-row">
                <span className="avatar-circle" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=60)' }}></span>
                <span className="avatar-circle" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&fit=crop&q=60)' }}></span>
                <span className="avatar-circle" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&fit=crop&q=60)' }}></span>
                <span className="avatar-circle" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&fit=crop&q=60)' }}></span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>★★★★★</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 600 }}>Trusted by 500+ players</span>
              </div>
            </div>
          </div>

          {/* Right Hero / Visual Image (Bigger Pickleball Court Image) */}
          <div className="hero-right-visual animate-fade-up">
            <div 
              className="court-visual-canvas" 
              style={{ 
                backgroundImage: 'url(/hero_illustration.jpg)', 
                backgroundSize: 'cover', 
                backgroundPosition: 'center',
                position: 'relative',
                borderRadius: 'var(--radius-xl)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              {/* Floating Active Next Available Card Mockup */}
              <div className="hero-card next-available-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge-pill">
                    <span className="pulse-dot" />
                    <span>NEXT AVAILABLE</span>
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                      Today, May 25
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      6:00 PM – 7:00 PM
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--color-text-disabled)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
                      <MapPin size={10} />
                      <span>Court 2</span>
                    </div>
                  </div>
                </div>
                {session ? (
                  <Link href="/dashboard/bookings" className="book-now-floating-btn">
                    Book Now
                  </Link>
                ) : (
                  <button onClick={() => setIsSignInOpen(true)} className="book-now-floating-btn">
                    Book Now
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="features-section">
        <div className="features-container-grid">
          {[
            {
              title: 'Real-time Availability',
              desc: 'See open courts in real-time and book instantly.',
              icon: Calendar
            },
            {
              title: 'Easy & Secure Payments',
              desc: 'Pay safely and securely through PayMongo.',
              icon: CreditCard
            },
            {
              title: 'Indoor Premium Courts',
              desc: 'High-quality indoor courts built for the best experience.',
              icon: Clock
            },
            {
              title: 'Manage Bookings',
              desc: 'View, reschedule, or cancel your bookings anytime.',
              icon: ClipboardCheck
            }
          ].map((f, i) => {
            const Icon = f.icon
            return (
              <div key={i} className="feature-item-card">
                <div className="feature-icon-wrapper">
                  <Icon size={20} />
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  {f.desc}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── System Ecosystem Section ── */}
      <section id="ecosystem" className="ecosystem-section" style={{ borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '80px 48px' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              The PaddleYard Ecosystem
            </span>
            <h2 style={{ fontSize: '36px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', marginTop: '8px', margin: '8px 0 0' }}>
              A Unified Pickleball Experience
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', marginTop: '12px', maxWidth: '600px', margin: '12px auto 0', lineHeight: 1.6 }}>
              Our platform bridges front desk kiosk checking, live open play queues, private bookings, and point ledgers in one seamless application.
            </p>
          </div>

          <div className="ecosystem-grid">
            {[
              {
                title: '📅 Court Reservation Hub',
                desc: 'Browse court layouts and book single or multi-hour sessions with instant credit sync. Calculates member rates, VIP perks, and court type fees dynamically.',
                pill: 'Bookings & Scheduling'
              },
               {
                 title: '⚡ Paddle Stack Matchmaker',
                 desc: 'Our collaborative open-play rotation engine. Just scan at the lobby, choose your skill bracket, and let the system handle match rotations and queue timers.',
                 pill: 'Lobby Open Play Queue'
               },
              {
                title: '📱 Lobby Kiosk & Check-in',
                desc: 'Quick kiosk scan functionality. Players check in at the court lobby using their digital pass QR code. Automatically verifies accounts and enters active play pools.',
                pill: 'Self-Serve Kiosks'
              },
              {
                title: '💸 Credit Balance Ledger',
                desc: 'Top up securely using GCash, Maya, or cash over the counter. Check past bookings and debits in a live transaction ledger that updates in real-time.',
                pill: 'Secure PayMongo Wallet'
              }
            ].map((eco, idx) => (
              <div key={idx} className="ecosystem-card">
                <span className="ecosystem-badge">{eco.pill}</span>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--color-text-primary)', margin: '16px 0 8px' }}>{eco.title}</h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0 }}>{eco.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── YP Rewards Sneakpeek Section ── */}
      <section id="rewards" className="rewards-section" style={{ background: 'var(--color-bg-primary)', padding: '80px 0', borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 48px' }} className="rewards-container">
          {/* Left Text */}
          <div className="rewards-left">
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              🎁 Yard Points (YP) Rewards System
            </span>
            <h2 style={{ fontSize: '36px', fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', marginTop: '8px', margin: '8px 0 0', lineHeight: 1.15 }}>
              Play More. Win More.<br />Get Rewarded.
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: 1.6, margin: '16px 0 24px', fontWeight: 500 }}>
              Earn Yard Points automatically every time you step on a court! YP values scale based on your skill rating and match outcomes, which you can redeem for premium club awards.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { title: '🎮 Play and Earn', desc: 'All open play matches award points. Winners get full points (up to 65 YP for Advanced), while losers earn a 15% participation share.' },
                { title: '⚖️ Skill Level Multipliers', desc: 'Points scale automatically to reward performance across brackets: Advanced (65 YP), Intermediate (50 YP), and Novice (35 YP).' },
                { title: '🛍️ Premium Rewards Catalog', desc: 'Turn your YP balance into free court bookings, VIP memberships, custom paddles, grips, drinks, or tournament passes.' }
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#ecfdf5', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, flexShrink: 0, marginTop: '2px' }}>✓</div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>{item.title}</h4>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0', lineHeight: 1.4 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Visual (Interactive Rewards Catalog Widget Mockup) */}
          <div className="rewards-right">
            <div className="rewards-mock-card">
              {/* Card Header: YP Balance */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '16px', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 700 }}>MY YARD POINTS</div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--color-primary)', marginTop: '2px' }}>2,450 YP</div>
                </div>
                <div style={{ background: 'var(--color-primary-subtle)', color: 'var(--color-primary)', padding: '6px 12px', borderRadius: 'var(--radius-full)', fontSize: '11px', fontWeight: 800 }}>
                  PRO RANK
                </div>
              </div>

              {/* Progress Goal */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                  <span>Next Goal: Free Court Booking</span>
                  <span>2,450 / 3,000 YP</span>
                </div>
                <div style={{ height: '8px', background: 'var(--color-border)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div style={{ width: '81.6%', height: '100%', background: 'linear-gradient(90deg, var(--color-primary), #10b981)', borderRadius: 'var(--radius-full)' }} />
                </div>
              </div>

              {/* Catalog Items list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-disabled)', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Unlocking Soon
                </div>
                {[
                  { name: '1-Hour Private Court booking', cost: '1,000 YP', status: 'UNLOCKED', bg: '#ecfdf5', text: '#10b981' },
                  { name: 'PaddleYard Premium Paddle Grip', cost: '350 YP', status: 'UNLOCKED', bg: '#ecfdf5', text: '#10b981' },
                  { name: 'Free VIP Day Membership Pass', cost: '3,000 YP', status: '81% UNLOCKED', bg: 'var(--color-surface)', text: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderRadius: 'var(--radius-md)', background: item.status === 'UNLOCKED' ? 'var(--color-surface)' : 'rgba(0,0,0,0.01)', border: item.border || '1px solid var(--color-border)' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--color-text-primary)' }}>{item.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px', fontWeight: 650 }}>Cost: {item.cost}</div>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: 850, padding: '4px 8px', borderRadius: 'var(--radius-sm)', background: item.bg, color: item.text }}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Indoor Courts (Side Slider Carousel) */}
      <section id="courts" className="courts-showcase-section">
        <div className="courts-showcase-container">
          <div className="courts-showcase-left animate-fade-up">
            <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981', display: 'block', marginBottom: '8px' }}>
              Our Indoor Courts
            </span>
            <h2 className="courts-showcase-title">Built for Every Pickleball Player</h2>
            <p className="courts-showcase-desc">
              Clean, safe, and fully indoor courts so you can play your best, no matter the weather.
            </p>
            
            <ul className="courts-showcase-list">
              {[
                'Climate-controlled environment',
                'Professional court flooring',
                'Bright LED lighting',
                'Comfortable lounge & rest areas'
              ].map((bullet) => (
                <li key={bullet} className="courts-showcase-item">
                  <CheckCircle2 size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <button 
                onClick={handlePrev} 
                disabled={activeIndex === 0}
                style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  border: '1px solid var(--color-border)', background: 'var(--color-card)',
                  color: activeIndex === 0 ? 'var(--color-text-disabled)' : 'var(--color-text-primary)',
                  display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center',
                  cursor: activeIndex === 0 ? 'not-allowed' : 'pointer',
                  transition: 'all var(--duration-fast)'
                }}
                className="carousel-nav-btn"
                aria-label="Previous court"
              >
                <ChevronLeft size={18} />
              </button>
              <button 
                onClick={handleNext} 
                disabled={activeIndex === maxIndex}
                style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  border: '1px solid var(--color-border)', background: 'var(--color-card)',
                  color: activeIndex === maxIndex ? 'var(--color-text-disabled)' : 'var(--color-text-primary)',
                  display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center',
                  cursor: activeIndex === maxIndex ? 'not-allowed' : 'pointer',
                  transition: 'all var(--duration-fast)'
                }}
                className="carousel-nav-btn"
                aria-label="Next court"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div style={{ overflow: 'hidden', width: '100%' }}>
            <div 
              style={{
                display: 'flex',
                transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: `translateX(-${activeIndex * 100}%)`,
                width: '100%'
              }}
            >
              {displayPages.map((pageCourts, pageIdx) => (
                <div 
                  key={pageIdx} 
                  style={{ 
                    flex: '0 0 100%', 
                    width: '100%',
                    display: isMobile ? 'flex' : 'grid',
                    flexDirection: isMobile ? 'column' : undefined,
                    gridTemplateColumns: isMobile ? undefined : '1fr 1fr',
                    gap: '16px',
                    boxSizing: 'border-box',
                    padding: isMobile ? '0' : '0 8px'
                  }}
                >
                  {pageCourts.map((court) => (
                    <div key={court.id} className="showcase-card" style={{ width: '100%' }}>
                      <div className="showcase-img-container">
                        <img src={court.image} alt={court.name} className="showcase-img" />
                        <div className="showcase-number">{court.id}</div>
                      </div>
                      <div className="showcase-footer">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Calendar size={13} style={{ color: 'var(--color-text-secondary)' }} />
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{court.name}</span>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500 }}>Indoor Court</span>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Clickable indicators dots representing the pages */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '32px' }}>
          {Array.from({ length: isMobile ? 10 : 3 }).map((_, idx) => {
            const isActive = activeIndex === idx
            return (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isActive ? '#10b981' : 'var(--color-border)',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  transition: 'all var(--duration-fast)'
                }}
                aria-label={`Go to page ${idx + 1}`}
              />
            )
          })}
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="how-section">
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            How It Works
          </span>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', marginTop: '8px', margin: '8px 0 0' }}>
            Book in 3 Simple Steps
          </h2>
        </div>

        <div className="steps-container-grid">
          {[
            {
              step: '1',
              title: 'Choose a Court',
              desc: 'Pick your preferred indoor court.',
              icon: Calendar
            },
            {
              step: '2',
              title: 'Pick a Time',
              desc: 'Select the date and time you want.',
              icon: Clock
            },
            {
              step: '3',
              title: 'Book & Play',
              desc: 'Confirm, pay, and you\'re all set!',
              icon: CreditCard
            }
          ].map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '20px' }} className="step-arrow-wrapper">
              <div className="step-card">
                <div className="step-icon-badge">
                  <item.icon size={20} />
                  <div className="step-number-pill">{item.step}</div>
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)', margin: '14px 0 4px 0' }}>{item.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.4, margin: 0 }}>{item.desc}</p>
              </div>
              {idx < 2 && (
                <span className="step-arrow">→</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Ready Banner */}
      <section className="cta-banner-section">
        <div className="cta-banner-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }} className="banner-details-row">
            <div className="paddle-ball-badge">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M5.5 2C3.57 2 2 3.57 2 5.5S3.57 9 5.5 9c1.47 0 2.73-.91 3.25-2.2L13 11l-3.8 3.8a2.5 2.5 0 0 0-3.2 3.2l-3 3a1 1 0 1 0 1.4 1.4l3-3a2.5 2.5 0 0 0 3.2-3.2L14.4 13l4.2 4.2c1.29.52 2.2 1.78 2.2 3.25 0 1.93-1.57 3.5-3.5 3.5S13.8 22.43 13.8 20.5a1 1 0 1 0-2 0c0 3.03 2.47 5.5 5.5 5.5s5.5-2.47 5.5-5.5c0-1.47-.91-2.73-2.2-3.25L16.4 13l3.8-3.8a2.5 2.5 0 0 0 3.2-3.2l3-3a1 1 0 1 0-1.4-1.4l-3 3a2.5 2.5 0 0 0-3.2 3.2L14.8 11 10.6 6.8C10.08 5.51 9.17 4.25 7.68 3.2L5.5 2z"/>
              </svg>
            </div>
            <div style={{ textAlign: 'left' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>Ready to Play?</h2>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>Book your court now and enjoy the game!</p>
            </div>
          </div>
          <Link href={session ? "/dashboard/bookings" : "/signup"} className="banner-cta-button">
            Book Your Court Now →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-section">
        <div className="footer-grid">
          {/* Logo & Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="footer-info-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <img src="/paddleyard-logo.png" alt="PaddleYard Logo" style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: '50%' }} />
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)', paddingLeft: '4px' }}>
                PickleYard
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5, margin: 0, textAlign: 'left' }}>
              Premium indoor pickleball courts. Play more, every day.
            </p>
            {/* Social Icons */}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <a href="#" className="social-icon" aria-label="Facebook">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c4.56-.93 8-4.96 8-9.75z"/>
                </svg>
              </a>
              <a href="#" className="social-icon" aria-label="Instagram">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
              </a>
              <a href="#" className="social-icon" aria-label="Twitter">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Quick Links</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <a href="#courts" className="footer-link">Courts</a>
              <a href="#" className="footer-link">Pricing</a>
              <a href="#how-it-works" className="footer-link">How It Works</a>
              <a href="#" className="footer-link">About Us</a>
              <a href="#" className="footer-link">Contact</a>
            </div>
          </div>

          {/* Support */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Support</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <a href="#" className="footer-link">Help Center</a>
              <a href="#" className="footer-link">Terms & Conditions</a>
              <a href="#" className="footer-link">Privacy Policy</a>
            </div>
          </div>

          {/* Follow Us */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>Follow Us</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <a href="#" className="footer-link">Facebook</a>
              <a href="#" className="footer-link">Instagram</a>
              <a href="#" className="footer-link">TikTok</a>
              <a href="#" className="footer-link">YouTube</a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            marginTop: 32,
            borderTop: '1px solid var(--color-border)',
            paddingTop: 16
          }}
        >
          © 2026 PickleYard. All rights reserved.
        </div>
      </footer>

      {/* OAuth error detection - wrapped in Suspense so useSearchParams doesn't block static prerendering */}
      <Suspense fallback={null}>
        <OAuthErrorHandler onError={(msg) => { setAuthError(msg); setIsSignInOpen(true) }} />
      </Suspense>

      {/* Auth Modal */}
      <SignInModal
        isOpen={isSignInOpen}
        onClose={() => { setIsSignInOpen(false); setAuthError(null) }}
        initialError={authError}
      />

      <style>{`
        .header-container {
          height: 100px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 48px;
          max-width: 1280px;
          margin: 0 auto;
          position: relative;
          z-index: 50;
        }

        .desktop-nav {
          display: flex;
          align-items: center;
          gap: 32px;
        }

        .desktop-actions {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .mobile-menu-trigger {
          display: none;
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--color-text-primary);
          padding: 4px;
        }

        .mobile-drawer {
          position: fixed;
          top: 100px;
          left: 0;
          width: 100%;
          background: var(--color-card);
          border-bottom: 1px solid var(--color-border);
          padding: 16px 24px;
          box-shadow: var(--shadow-md);
          z-index: 45;
        }

        .nav-link {
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          color: var(--color-text-secondary);
          transition: color var(--duration-fast);
        }
        .nav-link:hover {
          color: var(--color-text-primary);
        }

        .nav-link-mobile {
          text-decoration: none;
          font-size: 16px;
          font-weight: 600;
          color: var(--color-text-primary);
        }

        .login-btn-link:hover {
          color: var(--color-text-primary) !important;
        }

        .get-started-btn {
          background: var(--color-primary);
          color: white;
          border-radius: var(--radius-md);
          padding: 11px 22px;
          font-size: 14px;
          font-weight: 700;
          text-decoration: none;
          box-shadow: var(--shadow-primary-btn);
          border: none;
          cursor: pointer;
          transition: background var(--duration-fast) var(--ease-out);
          display: inline-block;
        }
        .get-started-btn:hover {
          background: var(--color-primary-hover) !important;
        }

        .sec-btn {
          background: var(--color-card);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 11px 22px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: var(--shadow-sm);
          transition: background var(--duration-fast);
        }
        .sec-btn:hover {
          background: var(--color-surface) !important;
        }

        /* Hero Layout */
        .hero-section {
          background-color: var(--color-bg-primary);
          min-height: 80vh;
          display: flex;
          align-items: center;
          padding-top: 60px;
          padding-bottom: 80px;
          position: relative;
          overflow: hidden;
          border-bottom: 1px solid var(--color-border);
        }

        .hero-container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 48px;
          width: 100%;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
          position: relative;
          z-index: 10;
        }

        .hero-left-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
          position: relative;
          z-index: 10;
        }

        .badge-courts {
          align-self: flex-start;
          background: var(--color-primary-subtle);
          color: var(--color-primary);
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          padding: 6px 14px;
          border-radius: var(--radius-full);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--color-primary-muted);
        }
        .badge-courts-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10B981;
        }

        .hero-title {
          font-size: 58px;
          font-weight: 800;
          color: var(--color-text-primary);
          line-height: 1.1;
          letter-spacing: -0.025em;
          text-align: left;
          margin: 0;
        }
        .title-accent-success {
          color: #10B981;
        }

        .hero-subtitle {
          font-size: 16px;
          color: var(--color-text-secondary);
          line-height: 1.6;
          max-width: 480px;
          text-align: left;
          margin: 0;
          font-weight: 500;
        }

        .hero-actions {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .user-proof {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 12px;
          border-top: 1px solid var(--color-border);
          padding-top: 24px;
          max-width: 440px;
        }
        .avatars-row {
          display: flex;
          align-items: center;
        }
        .avatar-circle {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-full);
          border: 2px solid var(--color-card);
          margin-left: -10px;
          background-size: cover;
          background-position: center;
        }
        .avatar-circle:first-child {
          margin-left: 0;
        }

        /* Right Visual Canvas */
        .hero-right-visual {
          display: flex;
          justify-content: flex-end;
          position: relative;
        }
        .court-visual-canvas {
          position: relative;
          width: 100%;
          aspect-ratio: 4/3;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .next-available-card {
          position: absolute;
          bottom: 24px;
          left: 24px;
          padding: 24px;
          width: 250px;
          display: flex;
          flex-direction: column;
          background: var(--color-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-xl);
          z-index: 20;
          box-sizing: border-box;
          animation: float-animation 6s ease-in-out infinite;
        }
        @keyframes float-animation {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .badge-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ecfdf5;
          color: #10b981;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          border: 1px solid rgba(16, 185, 129, 0.15);
        }
        .pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: var(--radius-full);
          background: #10b981;
          animation: pulse-glow 1.5s infinite;
        }
        @keyframes pulse-glow {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 5px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        .book-now-floating-btn {
          width: 100%;
          height: 38px;
          background: var(--color-text-primary);
          border: none;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 700;
          color: white;
          cursor: pointer;
          margin-top: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: background var(--duration-fast);
        }
        .book-now-floating-btn:hover {
          background: #000000 !important;
        }

        /* Features */
        .features-section {
          max-width: 1280px;
          margin: 0 auto;
          padding: 40px 48px;
        }
        .features-container-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          background: var(--color-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-2xl);
          padding: 40px;
          box-shadow: var(--shadow-sm);
        }
        .feature-item-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
          text-align: center;
          align-items: center;
        }
        .feature-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #ecfdf5;
          color: #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Showcase Section */
        .courts-showcase-section {
          max-width: 1280px;
          margin: 0 auto;
          padding: 80px 48px;
        }
        .courts-showcase-container {
          display: grid;
          grid-template-columns: 1fr 1.8fr;
          gap: 60px;
          align-items: center;
        }
        .courts-showcase-left {
          display: flex;
          flex-direction: column;
          gap: 20px;
          text-align: left;
        }
        .courts-showcase-title {
          font-size: 38px;
          font-weight: 800;
          color: var(--color-text-primary);
          line-height: 1.15;
          letter-spacing: -0.02em;
          margin: 0;
        }
        .courts-showcase-desc {
          font-size: 15px;
          color: var(--color-text-secondary);
          line-height: 1.6;
          margin: 0;
          font-weight: 500;
        }
        .courts-showcase-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .courts-showcase-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 700;
          color: var(--color-text-primary);
        }
        .explore-btn {
          align-self: flex-start;
          background: var(--color-text-primary);
          color: white;
          padding: 12px 24px;
          font-size: 13px;
          font-weight: 700;
          border-radius: var(--radius-md);
          text-decoration: none;
          transition: background var(--duration-fast);
        }
        .explore-btn:hover {
          background: #000000;
        }

        .showcase-card {
          background: var(--color-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
        }
        .showcase-img-container {
          position: relative;
          width: 100%;
          aspect-ratio: 16/10;
          overflow: hidden;
        }
        .showcase-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform var(--duration-normal);
        }
        .showcase-card:hover .showcase-img {
          transform: scale(1.04);
        }
        .showcase-number {
          position: absolute;
          top: 12px;
          left: 16px;
          font-size: 64px;
          font-weight: 800;
          color: #10b981;
          line-height: 1;
        }
        .showcase-footer {
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          text-align: left;
          border-top: 1px solid var(--color-border);
        }

        .carousel-nav-btn:hover:not(:disabled) {
          background: var(--color-primary-subtle) !important;
          color: var(--color-primary) !important;
          border-color: var(--color-primary-muted) !important;
        }

        /* How it works */
        .how-section {
          max-width: 1280px;
          margin: 0 auto;
          padding: 80px 48px;
        }
        .steps-container-grid {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
        }
        .step-arrow-wrapper {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
          justify-content: center;
        }
        .step-card {
          background: var(--color-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: 28px;
          width: 100%;
          max-width: 280px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          box-shadow: var(--shadow-sm);
          box-sizing: border-box;
        }
        .step-icon-badge {
          position: relative;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #ecfdf5;
          color: #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .step-number-pill {
          position: absolute;
          top: -4px;
          right: -4px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #10b981;
          color: white;
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--color-card);
        }
        .step-arrow {
          font-size: 24px;
          color: var(--color-text-disabled);
          font-weight: 700;
        }

        /* CTA Ready Banner */
        .cta-banner-section {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 48px 80px 48px;
          box-sizing: border-box;
        }
        .cta-banner-container {
          background: var(--color-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-2xl);
          padding: 32px 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: var(--shadow-md);
          box-sizing: border-box;
        }
        .paddle-ball-badge {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          background: #ecfdf5;
          color: #10b981;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .banner-cta-button {
          background: var(--color-text-primary);
          color: white;
          padding: 12px 24px;
          font-size: 13px;
          font-weight: 700;
          border-radius: var(--radius-md);
          text-decoration: none;
          transition: background var(--duration-fast);
          display: inline-flex;
          align-items: center;
          white-space: nowrap;
        }
        .banner-cta-button:hover {
          background: #000000;
        }

        /* Footer */
        .footer-section {
          background: var(--color-card);
          border-top: 1px solid var(--color-border);
          padding: 80px 48px 40px;
        }
        .footer-grid {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1fr;
          gap: 40px;
        }
        .footer-link {
          text-decoration: none;
          color: var(--color-text-secondary);
          transition: color var(--duration-fast);
          text-align: left;
        }
        .footer-link:hover {
          color: var(--color-text-primary);
        }
        .social-icon {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-full);
          border: 1px solid var(--color-border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--color-text-secondary);
          transition: all var(--duration-fast);
        }
        .social-icon:hover {
          color: var(--color-text-primary);
          border-color: var(--color-border-hover);
        }

        /* Ecosystem styling */
        .ecosystem-section {
          width: 100%;
          box-sizing: border-box;
        }
        .ecosystem-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 32px;
        }
        .ecosystem-card {
          background: var(--color-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-2xl);
          padding: 32px;
          box-shadow: var(--shadow-sm);
          text-align: left;
          transition: transform var(--duration-fast), box-shadow var(--duration-fast);
        }
        .ecosystem-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-md);
        }
        .ecosystem-badge {
          background: var(--color-primary-subtle);
          color: var(--color-primary);
          font-size: 10px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: var(--radius-full);
          border: 1px solid rgba(0, 124, 128, 0.15);
        }

        /* Rewards styling */
        .rewards-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }
        .rewards-left {
          display: flex;
          flex-direction: column;
          gap: 20px;
          text-align: left;
        }
        .rewards-right {
          display: flex;
          justify-content: flex-end;
        }
        .rewards-mock-card {
          background: var(--color-card);
          border: 1.5px solid var(--color-border);
          border-radius: var(--radius-2xl);
          padding: 32px;
          box-shadow: var(--shadow-lg);
          width: 100%;
          max-width: 440px;
          box-sizing: border-box;
          text-align: left;
        }

        /* ── Responsive ── */
        @media (max-width: 1024px) {
          .features-container-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
          }
          .ecosystem-grid {
            grid-template-columns: 1fr;
          }
          .rewards-container {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .rewards-right {
            justify-content: center;
          }
          .rewards-left {
            align-items: center;
            text-align: center;
          }
          .rewards-left h2, .rewards-left p {
            text-align: center;
          }
          .hero-container {
            grid-template-columns: 1fr;
            text-align: center;
            gap: 40px;
          }
          .hero-left-content {
            align-items: center;
          }
          .hero-title, .hero-subtitle {
            text-align: center;
          }
          .hero-right-visual {
            justify-content: center;
            margin: 0 auto;
            width: 100%;
            max-width: 580px;
          }
          .courts-showcase-container {
            grid-template-columns: 1fr;
            gap: 40px;
          }
          .courts-showcase-left {
            align-items: center;
            text-align: center;
          }
          .courts-showcase-title, .courts-showcase-desc {
            text-align: center;
          }
          .footer-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .header-container {
            padding: 0 24px;
            height: 80px;
          }
          .mobile-drawer {
            top: 80px;
          }
          .desktop-nav, .desktop-actions {
            display: none;
          }
          .mobile-menu-trigger {
            display: block;
          }
          .hero-container {
            padding: 0 24px;
          }
          .hero-title {
            font-size: 38px;
          }
          .hero-actions {
            flex-direction: column;
            width: 100%;
            gap: 12px;
          }
          .hero-cta-btn {
            width: 100%;
            text-align: center;
            box-sizing: border-box;
          }
          .features-section {
            padding: 40px 24px;
          }
          .features-container-grid {
            grid-template-columns: 1fr;
            padding: 24px;
          }
          .courts-showcase-section {
            padding: 60px 24px;
          }
          .how-section {
            padding: 60px 24px;
          }
          .steps-container-grid {
            flex-direction: column;
            gap: 24px;
          }
          .step-arrow-wrapper {
            flex-direction: column;
            width: 100%;
          }
          .step-arrow {
            display: none;
          }
          .cta-banner-section {
            padding: 0 24px 60px;
          }
          .cta-banner-container {
            flex-direction: column;
            gap: 20px;
            padding: 32px 24px;
            text-align: center;
          }
          .banner-details-row {
            flex-direction: column;
            text-align: center;
            align-items: center;
          }
          .banner-cta-button {
            width: 100%;
            justify-content: center;
            box-sizing: border-box;
          }
          .footer-section {
            padding: 60px 24px 20px;
          }
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 30px;
          }
        }
      `}</style>
    </div>
  )
}
