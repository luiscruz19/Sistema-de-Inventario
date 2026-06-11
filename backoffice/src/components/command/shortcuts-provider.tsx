'use client'

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Moon, Sun, LogOut } from 'lucide-react'
import { primaryNav, secondaryNav } from '@/lib/nav'
import { ScreenActionsContext, type ScreenActionsConfig } from './screen-actions'
import { CommandPalette, type PaletteGroup } from './command-palette'
import { ShortcutsHelp, type ShortcutRow } from './shortcuts-help'

const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘' : 'Ctrl'

interface CommandUI {
    openPalette: () => void
    openHelp: () => void
    toggleTheme: () => void
    dark: boolean
}
const CommandUIContext = createContext<CommandUI>({ openPalette: () => {}, openHelp: () => {}, toggleTheme: () => {}, dark: false })
export const useCommandUI = () => useContext(CommandUIContext)

export function ShortcutsProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const [paletteOpen, setPaletteOpen] = useState(false)
    const [helpOpen, setHelpOpen] = useState(false)
    const [dark, setDark] = useState(false)
    const [screenActions, setScreenActions] = useState<ScreenActionsConfig | null>(null)

    const screenCtx = useMemo(() => ({ set: setScreenActions }), [])

    // Tema: lee preferencia guardada y la aplica al <html>.
    useEffect(() => {
        const saved = localStorage.getItem('inventario-theme') === 'dark'
        setDark(saved)
        document.documentElement.classList.toggle('dark', saved)
    }, [])

    const toggleTheme = useCallback(() => {
        setDark(prev => {
            const next = !prev
            document.documentElement.classList.toggle('dark', next)
            localStorage.setItem('inventario-theme', next ? 'dark' : 'light')
            return next
        })
    }, [])

    const go = useCallback((href: string) => router.push(href || '/'), [router])

    const logout = useCallback(() => {
        localStorage.removeItem('inventario_token')
        localStorage.removeItem('inventario_user')
        router.replace('/auth/login')
    }, [router])

    const paletteGroups = useMemo<PaletteGroup[]>(() => {
        const groups: PaletteGroup[] = []
        if (screenActions) {
            const items = []
            if (screenActions.primary) {
                items.push({ id: 'act-primary', label: screenActions.primary.label, icon: screenActions.primary.icon ?? Search, kbd: 'N', keywords: 'nuevo crear agregar accion', run: screenActions.primary.run })
            }
            if (screenActions.search) {
                items.push({ id: 'act-search', label: screenActions.searchLabel ?? 'Buscar en esta pantalla', icon: Search, kbd: '/', keywords: 'buscar filtrar', run: screenActions.search })
            }
            if (items.length) groups.push({ group: 'En esta pantalla', items })
        }
        groups.push({ group: 'Ir a', items: primaryNav.map((i, idx) => ({ id: 'nav-' + i.href, label: i.label, icon: i.icon, kbd: String(idx + 1), keywords: 'pantalla ir ' + i.href, run: () => go(i.href) })) })
        groups.push({ group: 'Operaciones', items: secondaryNav.map(i => ({ id: 'op-' + i.href, label: i.label, icon: i.icon, keywords: 'modulo ' + i.href, run: () => go(i.href) })) })
        groups.push({ group: 'General', items: [
            { id: 'theme', label: dark ? 'Tema claro' : 'Tema oscuro', icon: dark ? Sun : Moon, kbd: 'T', keywords: 'tema modo dark claro oscuro', run: toggleTheme },
            { id: 'logout', label: 'Cerrar sesión', icon: LogOut, kbd: 'L', keywords: 'salir logout cerrar', run: logout },
        ] })
        return groups
    }, [screenActions, dark, go, toggleTheme, logout])

    const helpRows = useMemo<ShortcutRow[]>(() => [
        [screenActions?.primary ? screenActions.primary.label : 'Acción principal de la pantalla', ['N']],
        ['Buscar en la pantalla', ['/']],
        ['Buscar comandos / saltar', [MOD, 'K']],
        ['Ir a una sección', ['1', '–', '8']],
        ['Cambiar tema', ['T']],
        ['Cerrar sesión', ['L']],
        ['Mostrar esta ayuda', ['?']],
        ['Cerrar / volver', ['esc']],
    ], [screenActions])

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const el = document.activeElement as HTMLElement | null
            const typing = !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)

            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(o => !o); return }
            if (e.key === 'Escape') { setPaletteOpen(false); setHelpOpen(false); if (typing) el?.blur(); return }
            if (paletteOpen || helpOpen) return
            if (typing || e.metaKey || e.ctrlKey || e.altKey) return

            if (e.key === '?') { e.preventDefault(); setHelpOpen(true); return }
            if (e.key === '/' && screenActions?.search) { e.preventDefault(); screenActions.search(); return }
            const pk = screenActions?.primary?.key ?? 'n'
            if (screenActions?.primary && e.key.toLowerCase() === pk) { e.preventDefault(); screenActions.primary.run(); return }
            const k = e.key.toLowerCase()
            if (k === 't') { toggleTheme(); return }
            if (k === 'l') { logout(); return }
            const n = parseInt(e.key, 10)
            if (n >= 1 && n <= primaryNav.length) { e.preventDefault(); go(primaryNav[n - 1].href) }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [paletteOpen, helpOpen, screenActions, toggleTheme, logout, go])

    const ui = useMemo<CommandUI>(() => ({
        openPalette: () => setPaletteOpen(true),
        openHelp: () => setHelpOpen(true),
        toggleTheme,
        dark,
    }), [toggleTheme, dark])

    return (
        <CommandUIContext.Provider value={ui}>
            <ScreenActionsContext.Provider value={screenCtx}>
                {children}
                {paletteOpen && <CommandPalette groups={paletteGroups} onClose={() => setPaletteOpen(false)} />}
                {helpOpen && <ShortcutsHelp rows={helpRows} onClose={() => setHelpOpen(false)} />}
            </ScreenActionsContext.Provider>
        </CommandUIContext.Provider>
    )
}
