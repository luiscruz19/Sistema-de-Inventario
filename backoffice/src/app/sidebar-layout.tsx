'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Sidebar from '@/components/Sidebar'
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
        <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-auto">
                <div className="p-6 lg:p-8 max-w-7xl">
                    {children}
                </div>
            </main>
            <Toaster />
        </div>
    )
}
