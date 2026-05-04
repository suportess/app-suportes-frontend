'use client'

import Image from 'next/image'
import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import {
  Mail, Lock, Eye, EyeOff,
  ArrowRight, AlertCircle, Loader2, CheckCircle2,
} from 'lucide-react'
import { GoogleIcon } from '@/components/icons/social-icons'
import logo from '@/suportes-icone-branco.png'

interface Props {
  initialError?: string
  registered?  : boolean
}

export function LoginForm({ initialError, registered }: Props) {
  const [showPw,    setShowPw]    = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [errorMsg,  setErrorMsg]  = useState<string | null>(initialError ?? null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsPending(true)
    setErrorMsg(null)

    const form     = e.currentTarget
    const email    = (form.elements.namedItem('email')    as HTMLInputElement).value.trim()
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    try {
      const res = await fetch('/api/auth/login', {
        method  : 'POST',
        headers : { 'Content-Type': 'application/json' },
        body    : JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as Record<string, string>
        setErrorMsg(data.error ?? 'E-mail ou senha incorretos.')
        setIsPending(false)
        return
      }

      // Cookie definido pelo servidor — navegar para o dashboard
      window.location.href = '/dashboard'
    } catch {
      setErrorMsg('Não foi possível conectar ao servidor.')
      setIsPending(false)
    }
  }

  return (
    <div className="login-page">
      {/* ── Background ── */}
      <div className="login-bg" aria-hidden="true">
        <div className="login-blob login-blob--1" />
        <div className="login-blob login-blob--2" />
        <div className="login-blob login-blob--3" />
        <div className="login-grid" />
      </div>

      <main className="login-wrap">
        <div className="login-card">

          {/* Logo */}
          <Image src={logo} alt="Suportes" width={200} height={200} className="rounded-2xl object-contain mx-auto" priority />

          {/* Cabeçalho */}
          <div className="login-header">
            <h1 className="login-title">Portal de Gestão</h1>
            <p className="login-subtitle">Entre na sua conta para continuar</p>
          </div>

          {/* Sucesso — conta criada */}
          {registered && (
            <div className="login-success" role="status">
              <CheckCircle2 size={15} aria-hidden="true" />
              <span>Conta criada com sucesso! Entre com suas credenciais.</span>
            </div>
          )}

          {/* Erro */}
          {errorMsg && (
            <div className="login-error" role="alert">
              <AlertCircle size={15} aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Formulário e-mail + senha */}
          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="login-field">
              <label htmlFor="login-email" className="login-label">E-mail</label>
              <div className="login-input-wrap">
                <Mail size={15} className="login-input-icon" aria-hidden="true" />
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="seu@email.com"
                  className="login-input"
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="login-field">
              <label htmlFor="login-password" className="login-label">Senha</label>
              <div className="login-input-wrap">
                <Lock size={15} className="login-input-icon" aria-hidden="true" />
                <input
                  id="login-password"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="login-input login-input--pw"
                  disabled={isPending}
                />
                <button
                  type="button"
                  className="login-pw-toggle"
                  onClick={() => setShowPw(p => !p)}
                  aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPw
                    ? <EyeOff size={15} aria-hidden="true" />
                    : <Eye    size={15} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="login-btn"
              disabled={isPending}
              aria-busy={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                  <span>Aguarde…</span>
                </>
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight size={17} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Divisor */}
          <div className="login-divider">
            <span>ou continue com</span>
          </div>

          {/* Botões sociais */}
          <div className="social-grid social-grid--single">
            <a href="/auth/social?connection=google-oauth2" className="social-btn" aria-label="Entrar com Google">
              <GoogleIcon size={17} />
              <span>Continuar com Google</span>
            </a>
            {/* Microsoft, GitHub e Apple — habilitados em breve */}
          </div>

          {/* Link cadastro */}
          <p className="login-alt-link">
            Não tem conta?{' '}
            <Link href="/register">Criar conta</Link>
          </p>

        </div>
      </main>
    </div>
  )
}
