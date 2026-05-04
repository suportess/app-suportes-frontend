'use client'

import { createContext, useContext, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { UsuarioDTO, EmpresaDTO } from '@/lib/types'
import { atualizarEmpresaAtiva } from '@/app/dashboard/actions'

type UserContextValue = {
  usuario: UsuarioDTO | null
  empresaAtiva: EmpresaDTO | null
  switchEmpresa: (empresa: EmpresaDTO) => void
  switching: boolean
}

const UserContext = createContext<UserContextValue>({
  usuario: null,
  empresaAtiva: null,
  switchEmpresa: () => {},
  switching: false,
})

export function UserProvider({
  usuario,
  children,
}: {
  usuario: UsuarioDTO | null
  children: React.ReactNode
}) {
  const [empresaAtiva, setEmpresaAtiva] = useState<EmpresaDTO | null>(
    usuario?.empresaAtiva ?? null
  )
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function switchEmpresa(empresa: EmpresaDTO) {
    setEmpresaAtiva(empresa) // atualização otimista imediata
    startTransition(async () => {
      await atualizarEmpresaAtiva(empresa.id)
      router.refresh() // força re-fetch dos Server Components da página atual
    })
  }

  return (
    <UserContext.Provider value={{ usuario, empresaAtiva, switchEmpresa, switching: isPending }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUsuario() {
  return useContext(UserContext)
}
