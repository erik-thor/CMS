'use client'

import { useState, useTransition } from 'react'
import { createCheckoutSessionAction } from './actions/checkout'
import { 
  BookOpen, Sparkles, ShieldCheck, Mail, ArrowRight, 
  Lock, Globe, Flame, Star, Loader2, DollarSign, Users, Award 
} from 'lucide-react'
import Link from 'next/link'

interface Tier {
  id: string
  name: string
  type: string
  price: number
  stock_allocated: number
  max_limit: number | null
}

interface CampaignClientProps {
  tiers: Tier[]
  totalRaised: number
  backersCount: number
}

export default function CampaignClient({ tiers, totalRaised, backersCount }: CampaignClientProps) {
  const [email, setEmail] = useState('')
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Funding goal calculation
  const fundingGoal = 1000000 // $10,000 in cents
  const progressPercent = Math.min(100, Math.round((totalRaised / fundingGoal) * 100))

  const handlePledge = (tierId: string) => {
    setSelectedTierId(tierId)
    setError(null)
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address first to choose a tier.')
      // Scroll to email input
      document.getElementById('email-input-section')?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    startTransition(async () => {
      try {
        const result = await createCheckoutSessionAction(email, tierId)
        if (result.success && result.url) {
          window.location.href = result.url
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initiate checkout.')
      }
    })
  }

  return (
    <div className="min-h-screen bg-[#06050b] text-white overflow-hidden relative">
      
      {/* Visual background atmospheric elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[40%] left-[-20%] w-[600px] h-[600px] rounded-full bg-indigo-600/5 blur-[150px] pointer-events-none" />

      {/* Sticky top info bar */}
      <div className="w-full border-b border-white/[0.06] bg-[#06050b]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-lg tracking-tight">
            <BookOpen className="w-5 h-5 text-violet-400" />
            <span className="bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">Age of Self-Realization</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/community" className="text-xs text-neutral-300 hover:text-white transition-colors font-medium flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-violet-400" /> Community
            </Link>
            <Link href="/login" className="text-xs px-3.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.06] transition-all font-medium">
              Log In
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 pt-16 pb-12 text-center space-y-8 z-10 relative">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-violet-500/20 bg-violet-500/5 text-xs text-violet-400 font-semibold tracking-wide animate-pulse">
          <Sparkles className="w-3.5 h-3.5" /> Direct Creator Crowdfunding Launch
        </div>
        
        <div className="space-y-4 max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-none bg-gradient-to-b from-white via-neutral-100 to-neutral-500 bg-clip-text text-transparent">
            The Age of Self-Realization
          </h1>
          <p className="text-neutral-400 text-lg md:text-xl font-normal leading-relaxed">
            By Erik Thor. A groundbreaking exploration of identity, personal sovereignty, and creator economy dynamics in a modern technological age. 
          </p>
        </div>

        {/* Crowdfunding Goal Progress Card */}
        <div className="max-w-2xl mx-auto bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
          
          <div className="grid grid-cols-3 gap-4 text-center border-b border-white/[0.06] pb-6 mb-6">
            <div className="space-y-1">
              <div className="text-neutral-400 text-xs flex items-center justify-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-neutral-500" /> Raised
              </div>
              <div className="text-2xl md:text-3xl font-bold tracking-tight text-violet-400">
                ${(totalRaised / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}
              </div>
            </div>
            
            <div className="space-y-1 border-x border-white/[0.06] px-2">
              <div className="text-neutral-400 text-xs flex items-center justify-center gap-1">
                <Users className="w-3.5 h-3.5 text-neutral-500" /> Backers
              </div>
              <div className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                {backersCount}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-neutral-400 text-xs flex items-center justify-center gap-1">
                <Award className="w-3.5 h-3.5 text-neutral-500" /> Goal
              </div>
              <div className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-300">
                $10,000
              </div>
            </div>
          </div>

          <div className="space-y-2 text-left">
            <div className="flex justify-between text-xs text-neutral-400">
              <span>Funding progress</span>
              <span className="font-semibold text-white">{progressPercent}%</span>
            </div>
            <div className="w-full h-3 bg-white/[0.04] border border-white/[0.08] rounded-full overflow-hidden p-0.5">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Email Capture Section */}
        <div id="email-input-section" className="max-w-md mx-auto pt-6 text-left space-y-3">
          <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
            <Mail className="w-4 h-4 text-violet-400" /> 1. Enter Email to Start
          </label>
          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email to select a reward tier..."
              className="w-full pl-4 pr-12 py-3.5 bg-white/[0.03] border border-white/[0.1] rounded-2xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 transition-all text-sm placeholder-neutral-600 text-white"
            />
            {email && email.includes('@') && (
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-emerald-400 animate-pulse">
                <ShieldCheck className="w-5 h-5" />
              </span>
            )}
          </div>
          <p className="text-[10px] text-neutral-500 leading-normal">
            Your email is used to send verification magic links for reading content and accessing the upgrade dashboard.
          </p>
        </div>
      </div>

      {/* Pledge Tiers Section */}
      <div className="max-w-6xl mx-auto px-4 py-12 pb-32">
        <h2 className="text-2xl font-bold tracking-tight text-center mb-8 flex items-center justify-center gap-2">
          <Star className="w-5 h-5 text-violet-400" /> 2. Choose Your Reward Pledge Tier
        </h2>

        {error && (
          <div className="max-w-md mx-auto mb-8 p-4 rounded-xl border bg-rose-500/5 border-rose-500/20 text-rose-400 text-xs text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {tiers.map((tier) => {
            const isLimited = tier.max_limit !== null
            const remaining = isLimited ? tier.max_limit! - tier.stock_allocated : null
            const isSoldOut = isLimited && remaining! <= 0
            
            let badgeText = ''
            if (tier.id === 'tier-digital-epub') badgeText = 'Digital Starter'
            if (tier.id === 'tier-paperback-epub') badgeText = 'Most Popular'
            if (tier.id === 'tier-signed-hardcover') badgeText = 'Limited Scarcity'

            return (
              <div 
                key={tier.id}
                className={`flex flex-col bg-white/[0.02] border rounded-3xl p-6 relative overflow-hidden transition-all duration-300 text-left ${
                  isSoldOut 
                    ? 'opacity-60 border-white/[0.04]' 
                    : tier.id === 'tier-paperback-epub'
                      ? 'border-violet-500/40 bg-gradient-to-b from-[#100b2c]/30 to-[#06050b] scale-[1.02] shadow-xl shadow-violet-500/[0.02]'
                      : 'border-white/[0.08] hover:border-white/[0.16] hover:bg-white/[0.03]'
                }`}
              >
                {/* Glow ambient inside card */}
                {tier.id === 'tier-paperback-epub' && (
                  <div className="absolute top-[-30%] right-[-30%] w-[150px] h-[150px] rounded-full bg-violet-500/10 blur-[40px] pointer-events-none" />
                )}

                {badgeText && (
                  <div className="mb-4">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                      tier.id === 'tier-paperback-epub'
                        ? 'bg-violet-500/10 border-violet-500/20 text-violet-400'
                        : 'bg-white/[0.04] border-white/[0.08] text-neutral-400'
                    }`}>
                      {badgeText}
                    </span>
                  </div>
                )}

                <div className="flex-1 space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold tracking-tight text-neutral-200">{tier.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-white">${(tier.price / 100).toFixed(0)}</span>
                      <span className="text-xs text-neutral-500">USD</span>
                    </div>
                  </div>

                  {/* Scarcity tag */}
                  {isLimited && (
                    <div className="text-xs font-mono">
                      {isSoldOut ? (
                        <span className="text-red-400 font-semibold">SOLD OUT</span>
                      ) : (
                        <span className="text-indigo-400 font-semibold">
                          Only {remaining} of {tier.max_limit} left!
                        </span>
                      )}
                    </div>
                  )}

                  {/* Features List */}
                  <ul className="space-y-2.5 text-xs text-neutral-400 pt-2 border-t border-white/[0.06]">
                    <li className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0" /> Full eBook access (EPUB & PDF)
                    </li>
                    <li className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0" /> Inline comments & discussion access
                    </li>
                    
                    {tier.type === 'physical' && (
                      <li className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0" /> Physical paperback delivery
                      </li>
                    )}

                    {tier.id === 'tier-signed-hardcover' && (
                      <>
                        <li className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0" /> Signed Deluxe Hardcover format
                        </li>
                        <li className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0" /> Backer credits printed in the book
                        </li>
                      </>
                    )}
                  </ul>
                </div>

                <div className="pt-6">
                  <button
                    onClick={() => handlePledge(tier.id)}
                    disabled={isSoldOut || (isPending && selectedTierId === tier.id)}
                    className={`w-full py-3 px-4 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer ${
                      isSoldOut
                        ? 'bg-neutral-800 border border-neutral-700 text-neutral-500 cursor-not-allowed'
                        : tier.id === 'tier-paperback-epub'
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/10'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-neutral-200'
                    }`}
                  >
                    {isPending && selectedTierId === tier.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Reserving Spot...
                      </>
                    ) : isSoldOut ? (
                      'Sold Out'
                    ) : (
                      <>
                        Pledge This Tier <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
