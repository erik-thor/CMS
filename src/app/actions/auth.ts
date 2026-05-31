'use server'

import { generateOtp, sendOtpEmail, verifyAuthToken, logoutUser } from '../../lib/auth'

export async function requestLoginAction(prevState: any, formData: FormData) {
  const email = formData.get('email') as string
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  try {
    const { code, token } = await generateOtp(email.trim().toLowerCase())
    await sendOtpEmail(email.trim().toLowerCase(), code, token)
    return { success: true, token, email: email.trim().toLowerCase() }
  } catch (err: any) {
    console.error('Request login action error:', err)
    return { success: false, error: err.message || 'Something went wrong. Please try again.' }
  }
}

export async function verifyLoginAction(prevState: any, formData: FormData) {
  const token = formData.get('token') as string
  const code = formData.get('code') as string

  if (!token) {
    return { success: false, error: 'Session expired or missing. Please request a new code.' }
  }
  if (!code || code.length !== 6) {
    return { success: false, error: 'Please enter a 6-digit code.' }
  }

  try {
    const res = await verifyAuthToken(token, code)
    if (!res.success) {
      return { success: false, error: res.error }
    }
    return { success: true }
  } catch (err: any) {
    console.error('Verify login action error:', err)
    return { success: false, error: err.message || 'Failed to verify code. Please try again.' }
  }
}

export async function logoutAction() {
  await logoutUser()
  return { success: true }
}
