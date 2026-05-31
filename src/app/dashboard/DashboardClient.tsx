'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { logoutAction } from '../actions/auth'
import { createUpgradeSessionAction, executeDowngradeAction } from '../actions/tiers'
import { 
  Sparkles, ShieldCheck, Settings, LogOut, ArrowRight, 
  Lock, Unlock, Globe, Heart, FileText, History, MapPin, 
  CreditCard, Loader2, BookOpen, UserCheck 
} from 'lucide-react'
import Link from 'next/link'

interface UserData {
  id: string
  email: string
  display_name: string | null
  role: string
}

interface ItemData {
  id: string
  name: string
  price: number
  type: string
}

interface LineItemData {
  id: string
  item: ItemData
  price_paid: number
}

interface LedgerData {
  id: string
  type: string
  amount: number
  stripe_id: string
  created_at: string | Date
}

interface OrderData {
  id: string
  total_amount: number
  line_items: LineItemData[]
  ledger_entries: LedgerData[]
}

interface PostData {
  id: string
  title: string
  slug: string
  gated_tier_requirement: string | null
}

interface DashboardClientProps {
  user: UserData
  activeOrder: OrderData | null
  tiers: ItemData[]
  posts: PostData[]
  userMaxPledgePrice: number
}

export default function DashboardClient({
  user,
  activeOrder,
  tiers,
  posts,
  userMaxPledgePrice,
}: DashboardClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(
    searchParams.get('checkout_success') ? 'Thank you for backing! Your order is active.' :
    searchParams.get('upgrade_success') ? 'Upgrade completed successfully! Thank you.' : null
  )

  const [isPending, startTransition] = useTransition()
  const [activeTierId, setActiveTierId] = useState<string | null>(
    activeOrder?.line_items[0]?.item.id || null
  )

  const handleLogout = () => {
    startTransition(async () => {
      await logoutAction()
      router.push('/login')
      router.refresh()
    })
  }

  const handleUpgrade = (tierId: string) => {
    setError(null)
    setSuccessMsg(null)

    startTransition(async () => {
      try {
        const res = await createUpgradeSessionAction(tierId)
        if (res.success && res.url) {
          window.location.href = res.url
        }
      } catch (err: any) {
        setError(err.message || 'Failed to start upgrade session.')
      }
    })
  }

  const handleDowngrade = (tierId: string) => {
    setError(null)
    setSuccessMsg(null)

    if (
      !confirm(
        'Are you sure you want to downgrade? A partial refund for the price difference will be issued programmatically via Stripe.'
      )
    ) {
      return
    }

    startTransition(async () => {
      try {
        const res = await executeDowngradeAction(tierId)
        if (res.success) {
          setSuccessMsg('Successfully downgraded your pledge. Refund is processing.')
          router.refresh()
        }
      } catch (err: any) {
        setError(err.message || 'Downgrade transaction failed.')
      }
    })
  }

  const activeTier = activeOrder?.line_items[0]?.item || null
  
  // Parse user shipping address JSON
  const shippingAddress = (activeOrder as any)?.user?.shipping_address || null

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-8 relative text-left">
      
      {/* Background glow visual */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full bg-violet-600/5 blur-[100px] pointer-events-none" />

      {/* Header Panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-violet-400 text-sm font-medium">
            <UserCheck className="w-4 h-4" /> Backer Portal
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Welcome back, {user.display_name || 'Backer'}
          </h1>
          <p className="text-neutral-400 text-sm">
            Account: <strong className="text-neutral-300 font-normal">{user.email}</strong>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {user.role === 'ADMIN' && (
            <Link
              href="/admin/posts"
              className="px-4 py-2 border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 text-violet-400 hover:text-violet-300 transition-colors rounded-xl text-xs font-semibold flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" /> Admin Dashboard
            </Link>
          )}
          <button
            onClick={handleLogout}
            disabled={isPending}
            className="px-4 py-2 border border-white/[0.08] hover:bg-white/[0.04] active:scale-[0.98] transition-all rounded-xl text-xs font-medium flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5 text-neutral-400" /> Log Out
          </button>
        </div>
      </div>

      {/* Feedback Messages */}
      {successMsg && (
        <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/20 text-emerald-400 text-xs">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="p-4 rounded-xl border bg-rose-500/5 border-rose-500/20 text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Main Grid: Status & Chapters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Chapters & Upgrades */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Chapter Reading Portal */}
          <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-6 md:p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-violet-400" /> Book Chapters & Updates
              </h2>
              <p className="text-neutral-400 text-xs">
                Select a chapter to open the reading view and leave inline comments or reactions.
              </p>
            </div>

            <div className="divide-y divide-white/[0.06] border-t border-white/[0.06]">
              {posts.length === 0 ? (
                <p className="py-8 text-neutral-500 text-xs italic">
                  Chapters will appear here as soon as the author publishes them.
                </p>
              ) : (
                posts.map((post) => {
                  let hasChapterAccess = true
                  let postRequiredTier = tiers.find(t => t.id === post.gated_tier_requirement)
                  
                  if (postRequiredTier && user.role !== 'ADMIN') {
                    hasChapterAccess = userMaxPledgePrice >= postRequiredTier.price
                  }

                  return (
                    <div
                      key={post.id}
                      className="py-4 flex items-center justify-between gap-4 group"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <h3 className="font-semibold text-neutral-200 group-hover:text-white transition-colors truncate text-sm">
                          {post.title}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px]">
                          {post.gated_tier_requirement ? (
                            <span className="inline-flex items-center gap-0.5 text-indigo-400 font-medium">
                              <Lock className="w-3 h-3" /> Gated ({postRequiredTier?.name})
                            </span>
                          ) : (
                            <span className="text-neutral-500 flex items-center gap-0.5">
                              <Globe className="w-3 h-3" /> Public access
                            </span>
                          )}
                        </div>
                      </div>

                      <Link
                        href={`/posts/${post.slug}`}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                          hasChapterAccess
                            ? 'bg-violet-600/10 border border-violet-500/20 text-violet-400 hover:bg-violet-600 hover:text-white'
                            : 'bg-white/[0.02] border border-white/[0.08] text-neutral-400 hover:bg-white/[0.06]'
                        }`}
                      >
                        {hasChapterAccess ? (
                          <>
                            Read Now <ArrowRight className="w-3 h-3" />
                          </>
                        ) : (
                          <>
                            Unlock Chapter <Lock className="w-3 h-3" />
                          </>
                        )}
                      </Link>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Upgrades & Downgrades Panel */}
          {activeTier && (
            <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-6 md:p-8 space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-400" /> Upgrade or Downgrade Pledge Tiers
                </h2>
                <p className="text-neutral-400 text-xs">
                  Change your backing tier. Upgrades charge only the delta. Downgrades issue programmatic Stripe refunds.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tiers.map((tier) => {
                  const isActive = tier.id === activeTier.id
                  const isUpgrade = tier.price > activeTier.price
                  const isDowngrade = tier.price < activeTier.price
                  
                  return (
                    <div
                      key={tier.id}
                      className={`p-4 border rounded-2xl flex flex-col justify-between space-y-4 ${
                        isActive
                          ? 'border-violet-500/30 bg-violet-600/5'
                          : 'border-white/[0.06] bg-white/[0.005]'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <h4 className="font-semibold text-xs text-neutral-300">{tier.name}</h4>
                        <div className="text-lg font-bold">${(tier.price / 100).toFixed(0)}</div>
                      </div>

                      <div>
                        {isActive ? (
                          <span className="w-full py-1.5 rounded-lg border border-violet-500/20 bg-violet-600/10 text-violet-400 font-semibold text-[10px] inline-flex justify-center items-center gap-1 select-none">
                            <ShieldCheck className="w-3.5 h-3.5" /> Current Pledge
                          </span>
                        ) : isUpgrade ? (
                          <button
                            onClick={() => handleUpgrade(tier.id)}
                            disabled={isPending}
                            className="w-full py-1.5 bg-violet-600 hover:bg-violet-500 active:scale-[0.97] transition-all rounded-lg text-white font-medium text-[10px] cursor-pointer disabled:opacity-50"
                          >
                            Upgrade (+${((tier.price - activeTier.price) / 100).toFixed(0)})
                          </button>
                        ) : (
                          <button
                            onClick={() => handleDowngrade(tier.id)}
                            disabled={isPending}
                            className="w-full py-1.5 border border-white/[0.1] hover:bg-white/[0.05] active:scale-[0.97] transition-all rounded-lg text-neutral-300 font-medium text-[10px] cursor-pointer disabled:opacity-50"
                          >
                            Downgrade (-${((activeTier.price - tier.price) / 100).toFixed(0)})
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Order Info & Ledger */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Backing Status Info Card */}
          <div className="bg-white/[0.02] border border-white/[0.08] rounded-3xl p-6 shadow-xl space-y-6">
            <h3 className="text-md font-bold flex items-center gap-2 border-b border-white/[0.08] pb-3 text-neutral-300">
              <CreditCard className="w-4 h-4 text-violet-400" /> Active Pledge Details
            </h3>

            {activeOrder ? (
              <div className="space-y-5 text-xs text-neutral-400">
                <div className="flex justify-between">
                  <span>Current Reward Tier:</span>
                  <span className="font-semibold text-white">{activeTier?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Amount Paid:</span>
                  <span className="font-semibold text-violet-400 text-sm">
                    ${(activeOrder.total_amount / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Pledge Status:</span>
                  <span className="inline-flex px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-semibold text-[10px] tracking-wide uppercase">
                    PAID
                  </span>
                </div>

                {/* Shipping address summary */}
                {shippingAddress ? (
                  <div className="pt-3 border-t border-white/[0.06] space-y-1.5 text-left">
                    <span className="text-[10px] text-neutral-500 flex items-center gap-1 uppercase tracking-wider font-semibold">
                      <MapPin className="w-3 h-3" /> Shipping Address
                    </span>
                    <div className="text-white text-xs font-medium">{shippingAddress.name}</div>
                    <div className="text-neutral-400 leading-normal">
                      {shippingAddress.line1}
                      {shippingAddress.line2 && `, ${shippingAddress.line2}`}
                      <br />
                      {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postal_code}
                      <br />
                      {shippingAddress.country}
                    </div>
                  </div>
                ) : activeTier?.type === 'physical' ? (
                  <div className="pt-3 border-t border-white/[0.06] text-neutral-500 text-xs italic">
                    Address will be captured upon final shipping preparation or via Stripe.
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4 py-4 text-center">
                <p className="text-xs text-neutral-400 leading-normal">
                  You haven't backed any tiers for the campaign yet.
                </p>
                <Link
                  href="/"
                  className="w-full py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 text-white shadow-lg"
                >
                  Browse Pledge Tiers <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Ledger History Cards */}
          {activeOrder && activeOrder.ledger_entries && activeOrder.ledger_entries.length > 0 && (
            <div className="bg-white/[0.01] border border-white/[0.06] rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold flex items-center gap-2 border-b border-white/[0.08] pb-3 text-neutral-300">
                <History className="w-4 h-4 text-violet-400" /> Transaction Ledger
              </h3>
              
              <div className="space-y-3">
                {activeOrder.ledger_entries.map((entry) => (
                  <div 
                    key={entry.id}
                    className="p-3 bg-white/[0.01] border border-white/[0.04] rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-neutral-200 uppercase tracking-wider text-[9px]">
                        {entry.type}
                      </div>
                      <div className="text-[9px] text-neutral-500">
                        {new Date(entry.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </div>
                    </div>

                    <div className={`font-semibold ${entry.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {entry.amount >= 0 ? '+' : ''}${(entry.amount / 100).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
