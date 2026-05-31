'use client'

import { useState, useTransition, useActionState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { requestLoginAction, verifyLoginAction } from '../actions/auth'
import { Mail, ShieldCheck, ArrowRight, Loader2, Sparkles } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const errorParam = searchParams.get('error')

  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [message, setMessage] = useState<string | null>(errorParam)
  const [isSuccess, setIsSuccess] = useState(false)

  const [isPending, startTransition] = useTransition()

  const handleEmailSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage(null)
    
    const formData = new FormData(e.currentTarget)
    const emailVal = formData.get('email') as string
    if (!emailVal) return

    startTransition(async () => {
      const result = await requestLoginAction(null, formData)
      if (result.success && result.token && result.email) {
        setToken(result.token)
        setEmail(result.email)
        setStep('otp')
        setMessage('Verification code sent to your email. Check your inbox!')
        setIsSuccess(true)
      } else {
        setMessage(result.error || 'Failed to send OTP code.')
        setIsSuccess(false)
      }
    })
  }

  const handleOtpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    formData.append('token', token)

    startTransition(async () => {
      const result = await verifyLoginAction(null, formData)
      if (result.success) {
        setMessage('Login successful! Redirecting to dashboard...')
        setIsSuccess(true)
        setTimeout(() => {
          router.push('/dashboard')
          router.refresh()
        }, 1500)
      } else {
        setMessage(result.error || 'Invalid or expired OTP.')
        setIsSuccess(false)
      }
    })
  }

  return (
    <div className="min-h-screen bg-[#08080c] bg-radial-[at_top_right,_var(--tw-gradient-stops)] from-[#18113c] via-[#090812] to-[#040408] text-white flex flex-col justify-center items-center px-4 relative overflow-hidden">
      
      {/* Background ambient lighting */}
      <div className="absolute top-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-20%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none" />

      {/* Decorative branding */}
      <div className="mb-8 text-center animate-fade-in z-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/5 text-xs text-violet-400 font-medium tracking-wide mb-3 backdrop-blur-sm">
          <Sparkles className="w-3.5 h-3.5" /> Book Launch Platform
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-neutral-200 to-neutral-500 bg-clip-text text-transparent">
          The Age of Self-Realization
        </h1>
        <p className="text-neutral-400 text-sm mt-2">
          Sign in to access your backer account and read the book community feed
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white/[0.02] border border-white/[0.08] backdrop-blur-xl rounded-2xl p-6 md:p-8 shadow-2xl z-10 relative overflow-hidden transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
        
        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Mail className="w-5 h-5 text-violet-400" /> Enter your email
              </h2>
              <p className="text-xs text-neutral-400">
                We'll email you a secure 6-digit verification code to log in instantly.
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="name@domain.com"
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.1] rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all text-sm placeholder-neutral-500 text-white"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] transition-all rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-600/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending Link...
                  </>
                ) : (
                  <>
                    Send Magic Code <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-violet-400" /> Enter verification code
              </h2>
              <p className="text-xs text-neutral-400">
                Enter the 6-digit OTP code sent to <strong className="text-neutral-200">{email}</strong>.
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  name="code"
                  required
                  maxLength={6}
                  pattern="[0-9]{6}"
                  placeholder="123456"
                  className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.1] rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all text-center text-2xl font-mono tracking-[0.75em] pl-7 placeholder-neutral-700 text-white"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-[0.98] transition-all rounded-xl font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-violet-600/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  <>
                    Confirm Sign In <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep('email')}
                className="w-full text-center text-xs text-neutral-400 hover:text-white transition-colors py-1 cursor-pointer"
              >
                Change Email
              </button>
            </div>
          </form>
        )}

        {/* Feedback message */}
        {message && (
          <div
            className={`mt-6 p-4 rounded-xl text-xs border ${
              isSuccess
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/5 border-rose-500/20 text-rose-400'
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
