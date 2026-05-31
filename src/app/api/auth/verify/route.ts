import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '../../../../lib/auth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  const code = searchParams.get('code')

  if (!token || !code) {
    return NextResponse.redirect(new URL('/login?error=Invalid link parameters', request.url))
  }

  const result = await verifyAuthToken(token, code)

  if (!result.success) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(result.error || 'Verification failed')}`, request.url)
    )
  }

  // Redirect to dashboard on successful login
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
