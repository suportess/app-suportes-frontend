import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ThemeInit } from '@/components/providers/theme-init'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Portal — Gestão de Estoque',
  description: 'Plataforma de gestão de estoque hospitalar.',
}

export const viewport: Viewport = {
  themeColor: '#060E1A',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeInit />
        {children}
      </body>
    </html>
  )
}
