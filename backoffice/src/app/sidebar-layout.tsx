'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import { ShortcutsProvider } from '@/components/command/shortcuts-provider'
import { Toaster } from '@/components/ui/toaster'

const AUTH_PATHS = ['/auth']

export function SidebarLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const isAuthRoute = AUTH_PATHS.some(p => pathname.startsWith(p))
    const [checked, setChecked] = useState(false)

    useEffect(() => {
        if (!isAuthRoute) {
            const token = localStorage.getItem('inventario_token')
            if (!token) {
                router.replace('/auth/login')
            } else {
                setChecked(true)
            }
        }
    }, [pathname, isAuthRoute, router])

    if (isAuthRoute) {
        return (
            <>
                {children}
                <Toaster />
            </>
        )
    }

    if (!checked) return null

    return (
        <ShortcutsProvider>
            <div className="flex h-screen overflow-hidden bg-background">
                <Sidebar />
                <div className="flex min-w-0 flex-1 flex-col">
                    <Header />
                    <main className="flex-1 overflow-auto px-7 py-6">
                        {children}
                    </main>
                </div>
                <Toaster />
            </div>
        </ShortcutsProvider>
    )
}
