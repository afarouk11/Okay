import { Metadata } from 'next'
import LoginClient from './LoginClient'

export const metadata: Metadata = {
  title: 'Login',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ mode?: string | string[] }>
}) {
  const params = searchParams ? await searchParams : undefined
  const mode = Array.isArray(params?.mode) ? params.mode[0] : params?.mode

  return <LoginClient initialMode={mode === 'register' ? 'register' : 'login'} />
}
