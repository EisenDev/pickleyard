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
  Play,
  Menu,
  X,
  Sparkles,
  MapPin,
  ArrowRight,
  TrendingUp,
  Award,
  Users
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

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data && Object.keys(data).length > 0 && data.user) {
          setSession(data)
        }
      })
      .catch(err => console.error(err))
  }, [])

  const features = [
    {
      icon: Calendar,
      title: 'Real-time Availability',
      desc: 'See open courts in real-time and book instantly without phone calls.',
    },
    {
      icon: CreditCard,
      title: 'Secure Payments',
      desc: 'Pay safely and securely through verified automated payment options.',
    },
    {
      icon: Clock,
      title: 'Easy Booking',
      desc: 'Choose your preferred court, date, and hour slot in just a few taps.',
    },
    {
      icon: ClipboardCheck,
      title: 'Manage Bookings',
      desc: 'View, reschedule, or cancel your bookings anytime from your portal.',
    },
  ]

  const courts = [
    {
      name: 'Indoor Courts',
      tag: 'All-Weather Play',
      image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=600',
      features: ['Climate controlled', 'Premium cushion floors', 'High-definition lighting']
    },
    {
      name: 'Outdoor Courts',
      tag: 'Scenic & Fresh',
      image: 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&q=80&w=600',
      features: ['Pro-tournament nets', 'Windbreaker fences', 'Spectator seating']
    },
    {
      name: 'Rooftop Courts',
      tag: 'Skyline Views',
      image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=600',
      features: ['Panoramic city views', 'Lounge access', 'Night play ready']
    }
  ]

  return (
    <div style={{ background: 'var(--color-bg-primary)', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Navigation Header */}
      <header className="header-container animate-fade-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/paddleyard-logo.png" alt="PaddleYard Logo" style={{ width: 44, height: 44, objectFit: 'contain' }} />
          <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
            PaddleYard
          </span>
        </div>

        {/* Desktop Nav Links */}
        <nav className="desktop-nav">
          <Link href="#courts" className="nav-link">Courts</Link>
          <Link href="#features" className="nav-link">Why PaddleYard</Link>
          <Link href="#how-it-works" className="nav-link">How It Works</Link>
          <Link href="#pricing" className="nav-link">Pricing</Link>
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
                  fontWeight: 500,
                }}
                className="login-btn"
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
            <Link href="#pricing" onClick={() => setMobileMenuOpen(false)} className="nav-link-mobile">Pricing</Link>
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
            <div
              style={{
                alignSelf: 'flex-start',
                background: 'var(--color-accent-subtle)',
                color: 'var(--color-text-primary)',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                border: '1px solid rgba(138, 226, 52, 0.4)'
              }}
            >
              <Sparkles size={12} style={{ color: '#76D11B' }} />
              <span>Play More. Wait Less.</span>
            </div>

            <h1 className="hero-title">
              Book Your<br />
              Pickleball Court<br />
              <span className="title-accent">In Just a Few Clicks</span>
            </h1>

            <p
              style={{
                fontSize: 16,
                color: 'var(--color-text-secondary)',
                lineHeight: 1.6,
                maxWidth: 480,
              }}
              className="hero-subtitle"
            >
              Find available courts, choose your time, and play your game. Fast, easy, and secure court booking for pickleball players.
            </p>

            <div className="hero-actions">
              {session ? (
                <>
                  <Link href="/dashboard/bookings" className="get-started-btn hero-cta-btn">
                    Book a Court
                  </Link>
                  <Link href="/dashboard/bookings" className="sec-btn hero-cta-btn">
                    <span>View Courts</span>
                    <MapPin size={14} style={{ marginLeft: 6, color: 'var(--color-text-secondary)' }} />
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/signup" className="get-started-btn hero-cta-btn">
                    Book a Court
                  </Link>
                  <button className="sec-btn hero-cta-btn" onClick={() => setIsSignInOpen(true)}>
                    <span>View Courts</span>
                    <MapPin size={14} style={{ marginLeft: 6, color: 'var(--color-text-secondary)' }} />
                  </button>
                </>
              )}
            </div>

            {/* User stars verification proof */}
            <div className="user-proof">
              <div className="avatars-row">
                <span className="avatar-circle" style={{ background: '#E2E8F0', backgroundImage: 'url(https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&q=60)', backgroundSize: 'cover' }}></span>
                <span className="avatar-circle" style={{ background: '#CBD5E1', backgroundImage: 'url(https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&fit=crop&q=60)', backgroundSize: 'cover' }}></span>
                <span className="avatar-circle" style={{ background: '#94A3B8', backgroundImage: 'url(https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&fit=crop&q=60)', backgroundSize: 'cover' }}></span>
                <span className="avatar-circle" style={{ background: '#64748B', backgroundImage: 'url(https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&fit=crop&q=60)', backgroundSize: 'cover' }}></span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>⭐️⭐️⭐️⭐️⭐️</span>
                <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontWeight: 500 }}>4.9/5 from 500+ active players</span>
              </div>
            </div>
          </div>

          {/* Right Hero / Visual Mockup */}
          <div className="hero-right-visual animate-fade-up">
            <div 
              className="court-visual-canvas" 
              style={{ 
                backgroundImage: 'url(https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=800)', 
                backgroundSize: 'cover', 
                backgroundPosition: 'center',
                position: 'relative'
              }}
            >
              {/* Floating Active Card Mockup */}
              <div className="hero-card next-available-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="badge-pill">
                    <span className="pulse-dot" />
                    <span>NEXT AVAILABLE</span>
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 12 }}>
                  <div className="court-num-badge">2</div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                      Today, May 25
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                      6:00 PM – 7:00 PM • Court 2
                    </div>
                  </div>
                </div>
                {session ? (
                  <Link
                    href="/dashboard/bookings"
                    style={{
                      width: '100%',
                      height: 38,
                      background: 'var(--color-primary)',
                      border: 'none',
                      borderRadius: 'var(--radius-lg)',
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'white',
                      cursor: 'pointer',
                      marginTop: 12,
                      boxShadow: 'var(--shadow-primary-btn)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textDecoration: 'none'
                    }}
                    className="book-now-floating-btn"
                  >
                    Book Now
                  </Link>
                ) : (
                  <button
                    onClick={() => setIsSignInOpen(true)}
                    style={{
                      width: '100%',
                      height: 38,
                      background: 'var(--color-primary)',
                      border: 'none',
                      borderRadius: 'var(--radius-lg)',
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'white',
                      cursor: 'pointer',
                      marginTop: 12,
                      boxShadow: 'var(--shadow-primary-btn)'
                    }}
                    className="book-now-floating-btn"
                  >
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
        <div style={{ textAlign: 'center', marginBottom: 56, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-secondary)' }}>
            WHY PADDLEYARD?
          </span>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em' }}>
            Everything you need in{' '}
            <span style={{ color: 'var(--color-secondary)' }}>one simple platform</span>
          </h2>
          <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', maxWidth: 500, margin: '0 auto', lineHeight: 1.5 }}>
            Ditch the phone calls and physical logs. PaddleYard automates court assignments, player queues, and check-ins.
          </p>
        </div>

        <div className="features-grid">
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <div
                key={i}
                style={{
                  background: 'var(--color-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-xl)',
                  padding: 28,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  boxShadow: 'var(--shadow-sm)',
                  textAlign: 'left'
                }}
                className="feature-item-card"
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--color-primary-subtle)',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--color-primary-muted)'
                  }}
                >
                  <Icon size={20} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                  {f.desc}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Courts Carousel / Cards Section */}
      <section id="courts" className="courts-section">
        <div className="courts-container">
          <div className="courts-header">
            <span className="courts-eyebrow">PREMIUM COURTS</span>
            <h2 className="courts-title">Great Experience. Beautiful Facilities.</h2>
            <p className="courts-desc">We partner with the best facilities to bring you top-quality courts that meet your game.</p>
            
            <ul className="courts-bullet-list">
              {['Well-maintained pro courts', 'Clean and comfortable facilities', 'Night play lighting ready', 'Ample secure parking space'].map((bullet) => (
                <li key={bullet} className="courts-bullet-item">
                  <CheckCircle2 size={16} className="bullet-check-icon" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            <Link href={session ? "/dashboard/bookings" : "/signup"} className="get-started-btn" style={{ marginTop: 24, alignSelf: 'flex-start' }}>
              Explore Courts
            </Link>
          </div>

          <div className="courts-visual-grid">
            {courts.map((court, idx) => (
              <div key={idx} className="court-image-card">
                <div className="court-img-wrap">
                  <img src={court.image} alt={court.name} className="court-img" />
                  <span className="court-img-tag">{court.tag}</span>
                </div>
                <div className="court-info">
                  <h3 className="court-name">{court.name}</h3>
                  <div className="court-features-row">
                    {court.features.map(f => (
                      <span key={f} className="court-feat-badge">{f}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="how-section">
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-secondary)' }}>
            HOW IT WORKS
          </span>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: 'var(--color-text-primary)', letterSpacing: '-0.02em', marginTop: 10 }}>
            Book in 3 Simple Steps
          </h2>
        </div>

        <div className="steps-grid">
          {[
            { step: '1', title: 'Choose a Court', desc: 'Browse available courts near you and check current stack occupancy.' },
            { step: '2', title: 'Pick a Time', desc: 'Select your preferred date, hour block, and court category.' },
            { step: '3', title: 'Book & Pay', desc: 'Confirm your booking, pay securely with points or cards, and lock in the slot.' }
          ].map((item, index) => (
            <div key={index} className="step-card">
              <div className="step-num">{item.step}</div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)', marginTop: 16 }}>{item.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.5, marginTop: 8 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Ready banner */}
      <section className="cta-banner-section">
        <div className="cta-banner-container">
          <h2 className="cta-banner-title">
            Ready to Play?<br />
            Join Smarter & Book Courts Instantly.
          </h2>
          <p className="cta-banner-desc">
            PaddleYard simplifies scheduling for players and management for club staff. Sign up today and hit the court.
          </p>
          <Link href={session ? "/dashboard/bookings" : "/signup"} className="get-started-btn hero-cta-btn" style={{ background: 'var(--color-primary-hover)' }}>
            Book Your Court Now
          </Link>
        </div>
      </section>

      {/* Complete Footer */}
      <footer className="footer-section">
        <div className="footer-grid">
          {/* Logo & Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="footer-info-col">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src="/paddleyard-logo.png" alt="PaddleYard Logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)' }}>
                PaddleYard
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
              Premium pickleball booking portal for checking timers, joining player queues, and scheduling games seamlessly.
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

          {/* Navigation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Facilities</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <a href="#courts" className="footer-link">Indoor Courts</a>
              <a href="#courts" className="footer-link">Outdoor Courts</a>
              <a href="#courts" className="footer-link">Rooftop Arenas</a>
              <a href="#" className="footer-link">Pro Shop</a>
            </div>
          </div>

          {/* Support */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Support</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <a href="#" className="footer-link">Help Center</a>
              <a href="#" className="footer-link">Contact Us</a>
              <a href="#" className="footer-link">Court Rules</a>
              <a href="#" className="footer-link">Pricing Matrix</a>
            </div>
          </div>

          {/* Club Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h4 style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>Club Info</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <a href="#" className="footer-link">About Us</a>
              <a href="#" className="footer-link">Membership Plans</a>
              <a href="#" className="footer-link">Privacy Policy</a>
              <a href="#" className="footer-link">Terms of Service</a>
            </div>
          </div>

          {/* Quick Booking */}
          <div className="footer-cta-card">
            <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', lineHeight: 1.3 }}>
              Ready to claim your court?
            </h4>
            <Link
              href={session ? "/dashboard/bookings" : "/signup"}
              style={{
                background: 'var(--color-primary)',
                color: 'white',
                borderRadius: 'var(--radius-lg)',
                padding: '10px 20px',
                fontSize: 13,
                fontWeight: 600,
                textDecoration: 'none',
                boxShadow: 'var(--shadow-primary-btn)',
                display: 'block',
                width: '100%',
                textAlign: 'center',
                transition: 'background var(--duration-fast)',
              }}
              className="get-started-btn"
            >
              Book Now
            </Link>
            <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', display: 'block', marginTop: 4 }}>
              Check availability instantly.
            </span>
          </div>
        </div>

        {/* Copyright */}
        <div
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--color-text-secondary)',
            marginTop: 32,
          }}
        >
          © 2026 PaddleYard. All rights reserved.
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
          height: 80px;
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
          top: 80px;
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
          font-weight: 500;
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

        .login-btn:hover {
          color: var(--color-text-primary);
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
          min-height: 85vh;
          display: flex;
          align-items: center;
          padding-top: 60px;
          padding-bottom: 60px;
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
          grid-template-columns: 1.05fr 0.95fr;
          gap: 40px;
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

        .hero-title {
          font-size: 52px;
          font-weight: 800;
          color: var(--color-text-primary);
          line-height: 1.1;
          letter-spacing: -0.025em;
        }
        .title-accent {
          color: var(--color-secondary);
          position: relative;
          display: inline-block;
        }
        .title-accent::after {
          content: '';
          position: absolute;
          bottom: 2px;
          left: 0;
          width: 100%;
          height: 4px;
          background: var(--color-accent);
          border-radius: var(--radius-full);
          z-index: -1;
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
          width: 32px;
          height: 32px;
          border-radius: var(--radius-full);
          border: 2px solid var(--color-card);
          margin-left: -8px;
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
          width: 580px;
          height: 480px;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .court-lines {
          position: absolute;
          inset: 0;
          border: 2px dashed rgba(255,255,255,0.4);
          pointer-events: none;
        }
        .court-center-line {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          width: 2px;
          background: rgba(255,255,255,0.7);
        }
        .court-kitchen-line {
          position: absolute;
          left: 0;
          right: 0;
          top: 40%;
          height: 2px;
          background: rgba(255,255,255,0.7);
        }

        /* Abstract paddle and ball design */
        .pickleball-illustration {
          position: absolute;
          bottom: 40px;
          right: 40px;
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .illustration-paddle {
          width: 56px;
          height: 80px;
          background: var(--color-primary);
          border-radius: 20px 20px 8px 8px;
          position: relative;
          transform: rotate(-15deg);
          box-shadow: var(--shadow-md);
        }
        .illustration-paddle::after {
          content: '';
          position: absolute;
          bottom: -16px;
          left: 50%;
          transform: translateX(-50%);
          width: 8px;
          height: 20px;
          background: #E2E8F0;
          border-radius: 4px;
        }
        .illustration-ball {
          width: 32px;
          height: 32px;
          border-radius: var(--radius-full);
          background: var(--color-accent);
          border: 1px solid var(--color-border);
          box-shadow: 0 4px 8px rgba(0,0,0,0.15);
        }

        .next-available-card {
          position: absolute;
          bottom: 24px;
          right: 24px;
          padding: 24px;
          width: 260px;
          display: flex;
          flex-direction: column;
          background: var(--color-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-xl);
          z-index: 20;
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
          background: var(--color-success-subtle);
          color: var(--color-success);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          padding: 4px 10px;
          border-radius: var(--radius-full);
        }
        .pulse-dot {
          width: 6px;
          height: 6px;
          border-radius: var(--radius-full);
          background: var(--color-success);
          animation: pulse-glow 1.5s infinite;
        }
        @keyframes pulse-glow {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 5px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        .court-num-badge {
          width: 38px;
          height: 38px;
          border-radius: var(--radius-lg);
          background: var(--color-secondary-subtle);
          color: var(--color-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 16px;
        }

        /* Features */
        .features-section {
          max-width: 1280px;
          margin: 0 auto;
          padding: 100px 48px;
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
        }

        /* Courts Section */
        .courts-section {
          background: var(--color-surface);
          border-top: 1px solid var(--color-border);
          border-bottom: 1px solid var(--color-border);
          padding: 100px 48px;
        }
        .courts-container {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 0.95fr 1.05fr;
          gap: 60px;
          align-items: center;
        }
        .courts-header {
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: left;
        }
        .courts-eyebrow {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--color-secondary);
        }
        .courts-title {
          font-size: 32px;
          font-weight: 800;
          color: var(--color-text-primary);
          letter-spacing: -0.02em;
          line-height: 1.2;
        }
        .courts-desc {
          font-size: 15px;
          color: var(--color-text-secondary);
          line-height: 1.6;
        }
        .courts-bullet-list {
          list-style: none;
          padding: 0;
          margin: 12px 0 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .courts-bullet-item {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          color: var(--color-text-primary);
          font-weight: 500;
        }
        .bullet-check-icon {
          color: var(--color-success);
          flex-shrink: 0;
        }

        .courts-visual-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .court-image-card {
          background: var(--color-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          overflow: hidden;
          box-shadow: var(--shadow-sm);
          display: grid;
          grid-template-columns: 140px 1fr;
          align-items: center;
        }
        .court-img-wrap {
          height: 100px;
          position: relative;
        }
        .court-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .court-img-tag {
          position: absolute;
          top: 8px;
          left: 8px;
          font-size: 9px;
          font-weight: 700;
          background: rgba(9, 30, 58, 0.85);
          color: white;
          padding: 2px 6px;
          border-radius: var(--radius-xs);
          text-transform: uppercase;
        }
        .court-info {
          padding: 16px 24px;
          text-align: left;
        }
        .court-name {
          font-size: 16px;
          font-weight: 800;
          color: var(--color-text-primary);
          margin: 0;
        }
        .court-features-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 10px;
        }
        .court-feat-badge {
          font-size: 10px;
          font-weight: 600;
          color: var(--color-text-secondary);
          background: var(--color-surface);
          padding: 3px 8px;
          border-radius: var(--radius-sm);
        }

        /* How it Works */
        .how-section {
          max-width: 1280px;
          margin: 0 auto;
          padding: 100px 48px;
        }
        .steps-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 32px;
        }
        .step-card {
          background: var(--color-card);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: 32px 28px;
          text-align: center;
          position: relative;
          box-shadow: var(--shadow-sm);
        }
        .step-num {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-full);
          background: var(--color-accent);
          color: var(--color-text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 15px;
          margin: 0 auto;
        }

        /* Banner CTA */
        .cta-banner-section {
          padding: 0 48px 100px;
        }
        .cta-banner-container {
          max-width: 1280px;
          margin: 0 auto;
          background: linear-gradient(135deg, var(--color-primary) 0%, #1e3a60 100%);
          border-radius: var(--radius-xl);
          padding: 80px 48px;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 20px;
          align-items: center;
          box-shadow: var(--shadow-md);
        }
        .cta-banner-title {
          font-size: 34px;
          font-weight: 800;
          color: white;
          letter-spacing: -0.02em;
          line-height: 1.2;
          margin: 0;
        }
        .cta-banner-desc {
          font-size: 15px;
          color: rgba(255,255,255,0.7);
          line-height: 1.6;
          max-width: 500px;
          margin: 0;
        }

        /* Footer */
        .footer-section {
          border-top: 1px solid var(--color-border);
          background: var(--color-bg-primary);
          padding: 80px 48px 40px;
        }
        .footer-grid {
          max-width: 1280px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.2fr 0.8fr 0.8fr 0.8fr 1.4fr;
          gap: 40px;
          padding-bottom: 60px;
          border-bottom: 1px solid var(--color-border);
        }
        .footer-link {
          color: var(--color-text-secondary);
          text-decoration: none;
          transition: color var(--duration-fast);
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
          background: var(--color-surface);
          color: var(--color-text-primary);
          border-color: var(--color-border-hover);
        }
        .footer-cta-card {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          text-align: left;
        }

        /* ── Responsive ── */
        @media (max-width: 1024px) {
          .features-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .hero-container {
            grid-template-columns: 1fr;
            text-align: center;
          }
          .hero-left-content {
            align-items: center;
          }
          .title-accent::after {
            bottom: 0;
          }
          .hero-right-visual {
            justify-content: center;
            margin: 0 auto;
          }
          .next-available-card {
            left: 20px;
            top: 20px;
          }
          .courts-container {
            grid-template-columns: 1fr;
          }
          .courts-header {
            align-items: center;
            text-align: center;
          }
          .courts-bullet-list {
            align-self: center;
          }
          .footer-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .footer-cta-card {
            grid-column: span 2;
          }
        }

        @media (max-width: 768px) {
          .header-container {
            padding: 0 24px;
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
          }
          .hero-cta-btn {
            width: 100%;
            text-align: center;
          }
          .court-visual-canvas {
            width: 100%;
            height: 320px;
          }
          .next-available-card {
            width: 250px;
            padding: 16px;
          }
          .features-section {
            padding: 80px 24px;
          }
          .features-grid {
            grid-template-columns: 1fr;
          }
          .courts-section {
            padding: 80px 24px;
          }
          .courts-visual-grid {
            gap: 16px;
          }
          .court-image-card {
            grid-template-columns: 1fr;
          }
          .court-img-wrap {
            height: 140px;
          }
          .how-section {
            padding: 80px 24px;
          }
          .steps-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .cta-banner-section {
            padding: 0 24px 80px;
          }
          .cta-banner-container {
            padding: 60px 24px;
          }
          .cta-banner-title {
            font-size: 26px;
          }
          .footer-section {
            padding: 60px 24px 30px;
          }
          .footer-grid {
            grid-template-columns: 1fr;
            gap: 30px;
          }
          .footer-cta-card {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  )
}
