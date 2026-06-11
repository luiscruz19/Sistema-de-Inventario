'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { Package, X, Menu } from 'lucide-react'
import { primaryNav, secondaryNav, type NavItem } from '@/lib/nav'

export default function Sidebar() {
    const pathname = usePathname()
    const [isMobile, setIsMobile] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 1024)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    useEffect(() => {
        if (isMobile) setIsOpen(false)
    }, [pathname, isMobile])

    // Activo = el ítem cuyo href coincide más específicamente (match más largo gana),
    // así /ventas/historial marca "Ventas" y no "Punto de venta".
    const activeHref = useMemo(() => {
        const matches = [...primaryNav, ...secondaryNav]
            .map(i => i.href)
            .filter(h => (h === '' ? pathname === '' || pathname === '/' : pathname === h || pathname.startsWith(h + '/')))
        return matches.sort((a, b) => b.length - a.length)[0] ?? null
    }, [pathname])

    const isActive = (href: string) => href === activeHref

    const renderItem = (item: NavItem, shortcut?: number) => {
        const active = isActive(item.href)
        const Icon = item.icon
        return (
            <li key={item.href || 'dashboard'}>
                <Link
                    href={item.href}
                    className={`relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors ${
                        active
                            ? 'bg-accent font-medium text-foreground'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                >
                    {active && (
                        <span className="absolute -left-2.5 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-sm bg-primary" />
                    )}
                    <Icon className={`h-[17px] w-[17px] shrink-0 ${active ? 'opacity-100' : 'opacity-85'}`} />
                    <span className="flex-1">{item.label}</span>
                    {shortcut && (
                        <kbd
                            className={`rounded border border-border bg-muted px-1.5 py-px font-mono text-[10.5px] font-medium text-muted-foreground transition-opacity ${
                                active ? 'opacity-100' : 'opacity-0 group-hover/sb:opacity-100'
                            }`}
                        >
                            {shortcut}
                        </kbd>
                    )}
                </Link>
            </li>
        )
    }

    return (
        <>
            {isMobile && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed left-4 top-4 z-50 rounded-md border border-border bg-card p-2 shadow-sm lg:hidden"
                    aria-label="Abrir menú"
                >
                    <Menu className="h-5 w-5" />
                </button>
            )}

            {isMobile && isOpen && (
                <div className="fixed inset-0 z-[9998] bg-foreground/30 lg:hidden" onClick={() => setIsOpen(false)} />
            )}

            <aside
                className={`${
                    isMobile
                        ? `fixed left-0 top-0 z-[9999] h-full w-[248px] transform bg-card transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
                        : 'flex h-screen w-[248px] flex-col bg-card'
                } group/sb border-r border-border`}
            >
                {/* Marca */}
                <div className="flex items-center justify-between border-b border-border px-[18px] py-4">
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-[30px] w-[30px] items-center justify-center rounded-md bg-foreground text-background">
                            <Package className="h-[17px] w-[17px]" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold leading-tight tracking-[-0.01em] text-foreground">Inventario</p>
                            <p className="text-[11px] leading-snug text-muted-foreground">Sistema de ventas</p>
                        </div>
                    </div>
                    {isMobile && (
                        <button onClick={() => setIsOpen(false)} className="rounded-md p-1 hover:bg-muted" aria-label="Cerrar menú">
                            <X className="h-5 w-5 text-muted-foreground" />
                        </button>
                    )}
                </div>

                {/* Navegación */}
                <nav className="flex-1 overflow-y-auto px-2.5 py-3">
                    <ul className="flex flex-col gap-px">{primaryNav.map((item, i) => renderItem(item, i + 1))}</ul>
                    <p className="px-2.5 pb-1.5 pt-5 text-[10px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                        Operaciones
                    </p>
                    <ul className="flex flex-col gap-px">{secondaryNav.map(item => renderItem(item))}</ul>
                </nav>

                {/* Pie */}
                <div className="border-t border-border px-3.5 py-3 text-[11px] text-muted-foreground">Inventario · v1.0</div>
            </aside>
        </>
    )
}
