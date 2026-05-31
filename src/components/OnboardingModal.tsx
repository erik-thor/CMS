'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateDisplayNameAction } from '../app/actions/onboarding'
import { User, Sparkles, Loader2, ArrowRight } from 'lucide-react'

export default function OnboardingModal({ isOpen }: { isOpen: boolean }) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await updateDisplayNameAction(null, formData)
      if (result.success) {
        router.refresh()
      } else {
        setError(result.error || 'Something went wrong.')
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#0d0c15] border border-white/[0.08] rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Glow ambient background */}
        <div className="absolute top-[-40%] left-[-40%] w-[300px] h-[300px] rounded-full bg-violet-600/10 blur-[80px] pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-full bg-violet-600/10 text-violet-400 mb-2 border border-violet-500/20">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Create your Profile</h2>
            <p className="text-sm text-neutral-400">
              Welcome to *The Age of Self-Realization* community! Choose a display name to participate in discussions and reactions.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-neutral-300 block">
                Display Name (shown on your comments and reactions)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  name="displayName"
                  required
                  minLength={2}
                  maxLength={30}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Erik Thor"
                  className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/[0.1] rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all text-sm text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] transition-all rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-600/10 cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving Profile...
                </>
              ) : (
                <>
                  Enter Platform <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="p-3 rounded-lg border bg-rose-500/5 border-rose-500/20 text-rose-400 text-xs text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
