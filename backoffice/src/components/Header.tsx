'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Building2, LogOut, Search, Moon, Sun, Keyboard } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/command/kbd'
import { useCommandUI } from '@/components/command/shortcuts-provider'

const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘' : 'Ctrl'

export default function Header() {
    const router = useRouter()
    const { openPalette, openHelp, toggleTheme, dark } = useCommandUI()
    const [user, setUser] = useState('admin@inventario.local')

    useEffect(() => {
        try {
            const raw = localStorage.getItem('inventario_user')
            if (raw) {
                const parsed = JSON.parse(raw)
                if (parsed?.email) setUser(parsed.email)
            }
        } catch {
            /* sin datos de usuario: se usa el valor por defecto */
        }
    }, [])

    const logout = () => {
        localStorage.removeItem('inventario_token')
        localStorage.removeItem('inventario_user')
        router.replace('/auth/login')
    }

    return (
        <header className="flex h-[58px] shrink-0 items-center justify-between border-b border-border bg-card px-6">
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Building2 className="h-[15px] w-[15px]" />
                Sucursal Centro
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-2" onClick={openPalette} title="Buscar comandos">
                    <Search className="h-[15px] w-[15px]" />
                    <span className="hidden text-muted-foreground sm:inline">Buscar</span>
                    <span className="hidden gap-1 sm:inline-flex"><Kbd>{MOD}</Kbd><Kbd>K</Kbd></span>
                </Button>
                <Button size="icon" variant="ghost" title="Atajos de teclado (?)" onClick={openHelp}>
                    <Keyboard className="h-[17px] w-[17px]" />
                </Button>
                <Button size="icon" variant="ghost" title="Cambiar tema (T)" onClick={toggleTheme}>
                    {dark ? <Sun className="h-[17px] w-[17px]" /> : <Moon className="h-[17px] w-[17px]" />}
                </Button>
                <Badge variant="success">Caja abierta</Badge>
                <span className="hidden text-[13px] text-muted-foreground md:inline">{user}</span>
                <Button size="icon" variant="ghost" title="Cerrar sesión" onClick={logout}>
                    <LogOut className="h-[17px] w-[17px]" />
                </Button>
            </div>
        </header>
    )
}
