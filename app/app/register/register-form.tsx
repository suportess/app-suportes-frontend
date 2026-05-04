'use client'

import Image from 'next/image'
import logo from '@/suportes-icone-branco.png'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import {
  UserRound, Mail, Lock, Eye, EyeOff,
  ArrowRight, AlertCircle, Loader2,
} from 'lucide-react'
import { GoogleIcon } from '@/components/icons/social-icons'
import { signUp, type RegisterState } from './actions'

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState<RegisterState, FormData>(signUp, null)
  const [showPw,  setShowPw]  = useState(false)
  const [showCfm, setShowCfm] = useState(false)

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
            <h1 className="login-title">Criar conta</h1>
            <p className="login-subtitle">Preencha os dados para se cadastrar</p>
          </div>

          {/* Erro */}
          {state?.error && (
            <div className="login-error" role="alert">
              <AlertCircle size={15} aria-hidden="true" />
              <span>{state.error}</span>
            </div>
          )}

          {/* Formulário */}
          <form action={formAction} className="login-form" noValidate>

            {/* Nome */}
            <div className="login-field">
              <label htmlFor="reg-name" className="login-label">Nome completo</label>
              <div className="login-input-wrap">
                <UserRound size={15} className="login-input-icon" aria-hidden="true" />
                <input
                  id="reg-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="Seu nome"
                  className="login-input"
                  disabled={isPending}
                />
              </div>
            </div>

            {/* E-mail */}
            <div className="login-field">
              <label htmlFor="reg-email" className="login-label">E-mail</label>
              <div className="login-input-wrap">
                <Mail size={15} className="login-input-icon" aria-hidden="true" />
                <input
                  id="reg-email"
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

            {/* Senha */}
            <div className="login-field">
              <label htmlFor="reg-password" className="login-label">Senha</label>
              <div className="login-input-wrap">
                <Lock size={15} className="login-input-icon" aria-hidden="true" />
                <input
                  id="reg-password"
                  name="password"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder="Mínimo 8 caracteres"
                  className="login-input login-input--pw"
                  disabled={isPending}
                />
                <button
                  type="button"
                  className="login-pw-toggle"
                  onClick={() => setShowPw(p => !p)}
                  aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPw ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
                </button>
              </div>
            </div>

            {/* Confirmar senha */}
            <div className="login-field">
              <label htmlFor="reg-confirm" className="login-label">Confirmar senha</label>
              <div className="login-input-wrap">
                <Lock size={15} className="login-input-icon" aria-hidden="true" />
                <input
                  id="reg-confirm"
                  name="confirmPassword"
                  type={showCfm ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  placeholder="Repita a senha"
                  className="login-input login-input--pw"
                  disabled={isPending}
                />
                <button
                  type="button"
                  className="login-pw-toggle"
                  onClick={() => setShowCfm(p => !p)}
                  aria-label={showCfm ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                >
                  {showCfm ? <EyeOff size={15} aria-hidden="true" /> : <Eye size={15} aria-hidden="true" />}
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
                  <span>Criando conta…</span>
                </>
              ) : (
                <>
                  <span>Criar conta</span>
                  <ArrowRight size={17} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Divisor */}
          <div className="login-divider">
            <span>ou cadastre-se com</span>
          </div>

          {/* Botões sociais */}
          <div className="social-grid social-grid--single">
            <a href="/auth/social?connection=google-oauth2" className="social-btn" aria-label="Cadastrar com Google">
              <GoogleIcon size={17} />
              <span>Continuar com Google</span>
            </a>
            {/* Microsoft, GitHub e Apple — habilitados em breve */}
          </div>

          {/* Link login */}
          <p className="login-alt-link">
            Já tem conta?{' '}
            <Link href="/login">Entrar</Link>
          </p>

        </div>
      </main>
    </div>
  )
}
