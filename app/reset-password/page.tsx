import type { Metadata } from 'next'
import ResetPasswordClient from './ResetPasswordClient'

export const metadata: Metadata = {
  title: 'Reset Password',
  robots: { index: false, follow: false },
}

export default function ResetPasswordPage() {
  return <ResetPasswordClient />
}
