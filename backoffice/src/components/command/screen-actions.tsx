'use client'

import { createContext, useContext, useEffect } from 'react'
import type { DependencyList } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface ScreenPrimary {
    /** Texto de la acción principal, ej. "Nuevo producto" o "Cobrar". */
    label: string
    icon?: LucideIcon
    run: () => void
    /** Tecla que dispara la acción (default "n"). */
    key?: string
}

export interface ScreenActionsConfig {
    /** Acción principal de la pantalla (atajo N). */
    primary?: ScreenPrimary
    /** Enfoca el buscador de la pantalla (atajo /). */
    search?: () => void
    searchLabel?: string
}

interface ScreenActionsCtx {
    set: (config: ScreenActionsConfig | null) => void
}

export const ScreenActionsContext = createContext<ScreenActionsCtx>({ set: () => {} })

/**
 * Registra la acción principal y el buscador de la pantalla actual, para
 * exponerlos como atajos de teclado (N, /) y en la paleta de comandos.
 * `deps` controla cuándo se vuelve a registrar (igual que useEffect).
 */
export function useScreenActions(config: ScreenActionsConfig | null, deps: DependencyList = []) {
    const { set } = useContext(ScreenActionsContext)
    useEffect(() => {
        set(config)
        return () => set(null)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)
}
