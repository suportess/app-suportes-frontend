import type { Metadata } from 'next'
import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Entrar - Portal de Gestao',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; registered?: string }>
}) {
  const params = await searchParams
  return (
    <LoginForm
      initialError={params.error}
      registered={!!params.registered}
    />
  )
}
