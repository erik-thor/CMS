import { cookies } from 'next/headers'
import crypto from 'crypto'
import { prisma } from './db'
import { Resend } from 'resend'
import { v4 as uuidv4 } from 'uuid'

const resend = new Resend(process.env.RESEND_API_KEY || 're_mock_api_key')

export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

// Generate a 6-digit OTP code and a secure link token
export async function generateOtp(email: string) {
  // Generate random 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString()
  const codeHash = hashOtp(code)
  
  // Secure token for clickable link
  const token = uuidv4()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes expiry

  // Store in database
  await prisma.verificationToken.create({
    data: {
      email,
      otp_code_hash: codeHash,
      token,
      expires_at: expiresAt,
    },
  })

  return { code, token }
}

// Send OTP email
export async function sendOtpEmail(email: string, code: string, token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const magicLink = `${appUrl}/api/auth/verify?token=${token}&code=${code}`

  console.log(`\n========================================`);
  console.log(`[AUTH MAGIC LINK EMAIL FOR: ${email}]`);
  console.log(`OTP Code: ${code}`);
  console.log(`Magic Link: ${magicLink}`);
  console.log(`========================================\n`);

  // Try to send via Resend, fail silently if API key is mock
  if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.includes('mock')) {
    try {
      await resend.emails.send({
        from: 'Age of Self-Realization <auth@erikthor.com>',
        to: email,
        subject: 'Your Magic Sign-In Link',
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
            <h2 style="color: #111;">Sign in to Project Self-Realization</h2>
            <p>Here is your 6-digit verification code:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; padding: 10px; background: #f4f4f5; text-align: center; border-radius: 4px; margin: 20px 0;">
              ${code}
            </div>
            <p>Or click this direct link to sign in instantly:</p>
            <p><a href="${magicLink}" style="display: inline-block; padding: 10px 20px; background: #000; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">Sign In Instantly</a></p>
            <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;" />
            <p style="font-size: 12px; color: #666;">This code and link will expire in 15 minutes.</p>
          </div>
        `,
      })
    } catch (err) {
      console.error('Failed to send email via Resend:', err)
    }
  }
}

// Verify OTP or Token and create session
export async function verifyAuthToken(token: string, code: string) {
  const codeHash = hashOtp(code)
  
  // Find matching verification token
  const dbToken = await prisma.verificationToken.findFirst({
    where: {
      token,
      otp_code_hash: codeHash,
    },
  })

  if (!dbToken) {
    return { success: false, error: 'Invalid or expired magic link/code.' }
  }

  // Check expiration
  if (dbToken.expires_at < new Date()) {
    await prisma.verificationToken.delete({ where: { id: dbToken.id } })
    return { success: false, error: 'Magic link has expired.' }
  }

  // Delete token to prevent reuse
  await prisma.verificationToken.delete({ where: { id: dbToken.id } })

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { email: dbToken.email },
  })

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: dbToken.email,
        role: 'USER',
      },
    })
  }

  // Create session
  const sessionToken = uuidv4()
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days session

  const session = await prisma.authSession.create({
    data: {
      user_id: user.id,
      token: sessionToken,
      expires_at: expiresAt,
    },
  })

  // Set HTTP-only secure cookie
  const cookieStore = await cookies()
  cookieStore.set('session_token', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })

  return { success: true, user }
}

// Get current session user
export async function getSessionUser() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('session_token')?.value
  if (!sessionToken) return null

  const session = await prisma.authSession.findUnique({
    where: { token: sessionToken },
    include: { user: true },
  })

  if (!session) return null

  if (session.expires_at < new Date()) {
    // Delete expired session
    await prisma.authSession.delete({ where: { id: session.id } })
    const cStore = await cookies()
    cStore.delete('session_token')
    return null
  }

  return session.user
}

// Logout
export async function logoutUser() {
  const cookieStore = await cookies()
  const sessionToken = cookieStore.get('session_token')?.value
  if (sessionToken) {
    await prisma.authSession.deleteMany({
      where: { token: sessionToken },
    })
    cookieStore.delete('session_token')
  }
  return { success: true }
}
