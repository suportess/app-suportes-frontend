'use client'

import { useLayoutEffect } from 'react'

export function ThemeInit() {
  useLayoutEffect(() => {
    try {
      if (localStorage.getItem('portal-theme') !== 'light') {
        document.documentElement.classList.add('dark')
      }
    } catch { /* ignorar se localStorage não estiver disponível */ }
  }, [])

  return null
}
