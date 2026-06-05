'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import {
    Home, ShoppingCart, History, Wallet, Package, Tags, ListTree, BarChart3,
    Warehouse, ArrowLeftRight, AlertTriangle, Truck, ClipboardList,
    Users, Building2, FileText, Settings, ChevronDown, X, Menu,
} from 'lucide-react'

type NavChild = { href: string; label: string; icon: React.ElementType }
type NavItem = { href: string; label: string; icon: React.ElementType; children?: NavChild[] }

const navItems: NavItem[] = [
    { href: '', label: 'Dashboard', icon: Home },
    {
        href: '/ventas',
        label: 'Ventas',
        icon: ShoppingCart,
        children: [
            { href: '/ventas', label: 'Punto de Venta', icon: ShoppingCart },
            { href: '/ventas/historial', label: 'Historial', icon: History },
            { href: '/caja', label: 'Caja', icon: Wallet },
            { href: '/devoluciones', label: 'Devoluciones', icon: FileText },
        ],
    },
    {
        href: '/productos',
        label: 'Productos',
        icon: Package,
        children: [
            { href: '/productos', label: 'Catalogo', icon: Package },
            { href: '/categorias', label: 'Categorias', icon: Tags },
            { href: '/productos/listas-precio', label: 'Listas de precio', icon: ListTree },
        ],
    },
    {
        href: '/stock',
        label: 'Stock',
        icon: Warehouse,
        children: [
            { href: '/stock', label: 'Niveles', icon: Warehouse },
            { href: '/stock/movimientos', label: 'Movimientos', icon: ArrowLeftRight },
            { href: '/transferencias', label: 'Transferencias', icon: ArrowLeftRight },
            { href: '/stock/alertas', label: 'Alertas', icon: AlertTriangle },
        ],
    },
    {
        href: '/compras',
        label: 'Compras',
        icon: Truck,
        children: [
            { href: '/proveedores', label: 'Proveedores', icon: Truck },
            { href: '/compras', label: 'Ordenes de compra', icon: ClipboardList },
        ],
    },
    { href: '/clientes', label: 'Clientes', icon: Users },
    { href: '/sucursales', label: 'Sucursales', icon: Building2 },
    { href: '/reportes', label: 'Reportes', icon: BarChart3 },
    { href: '/configuracion', label: 'Configuracion', icon: Settings },
]

export default function Sidebar() {
    const pathname = usePathname()
    const [isMobile, setIsMobile] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 1024)
        check()
        window.addEventListener('resize', check)
        return () => window.removeEventListener('resize', check)
    }, [])

    useEffect(() => {
        navItems.forEach((item) => {
            if (item.children && item.children.some(c => pathname === c.href || pathname.startsWith(c.href + '/'))) {
                setOpenGroups(prev => ({ ...prev, [item.href]: true }))
            }
        })
    }, [pathname])

    useEffect(() => {
        if (isMobile) setIsOpen(false)
    }, [pathname, isMobile])

    const toggleGroup = (href: string) => setOpenGroups(prev => ({ ...prev, [href]: !prev[href] }))

    const isActive = (href: string) => {
        if (href === '') return pathname === ''
        return pathname === href
    }

    const isGroupActive = (item: NavItem) =>
        item.children?.some(c => pathname === c.href || pathname.startsWith(c.href + '/')) || false

    return (
        <>
            {isMobile && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed top-4 left-4 z-50 p-2 bg-white border border-gray-200 rounded-lg shadow-sm lg:hidden"
                >
                    <Menu className="h-5 w-5" />
                </button>
            )}

            {isMobile && isOpen && (
                <div className="fixed inset-0 z-[9998] bg-black/50 lg:hidden" onClick={() => setIsOpen(false)} />
            )}

            <aside className={`${
                isMobile
                    ? `fixed left-0 top-0 z-[9999] h-full w-64 transform bg-white border-r border-gray-200 transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
                    : 'flex h-screen w-64 flex-col border-r border-gray-200 bg-white'
            }`}>
                <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
                    <div>
                        <h1 className="text-lg font-bold text-primary-600">Inventario</h1>
                        <p className="text-xs text-gray-500">Sistema de ventas</p>
                    </div>
                    {isMobile && (
                        <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-gray-100">
                            <X className="h-5 w-5 text-gray-500" />
                        </button>
                    )}
                </div>

                <nav className="flex-1 overflow-y-auto px-3 py-4">
                    <ul className="space-y-0.5">
                        {navItems.map((item) => {
                            const Icon = item.icon

                            if (item.children) {
                                const groupOpen = openGroups[item.href] ?? false
                                const groupActive = isGroupActive(item)

                                return (
                                    <li key={item.label}>
                                        <button
                                            onClick={() => toggleGroup(item.href)}
                                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                                                groupActive && !groupOpen
                                                    ? 'bg-primary-50 text-primary-700 font-medium'
                                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                            }`}
                                        >
                                            <Icon className={`h-[18px] w-[18px] shrink-0 ${groupActive ? 'text-primary-600' : 'text-gray-400'}`} />
                                            <span className="flex-1 text-left">{item.label}</span>
                                            <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${groupOpen ? 'rotate-180' : ''} ${groupActive ? 'text-primary-500' : 'text-gray-400'}`} />
                                        </button>
                                        {groupOpen && (
                                            <ul className="ml-3 mt-0.5 space-y-0.5 border-l-2 border-gray-100 pl-3">
                                                {item.children.map((child) => {
                                                    const childActive = isActive(child.href)
                                                    const ChildIcon = child.icon
                                                    return (
                                                        <li key={child.href}>
                                                            <Link
                                                                href={child.href}
                                                                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                                                                    childActive
                                                                        ? 'bg-primary-600 text-white font-medium'
                                                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                                                                }`}
                                                            >
                                                                <ChildIcon className={`h-4 w-4 shrink-0 ${childActive ? 'text-white' : 'text-gray-400'}`} />
                                                                <span>{child.label}</span>
                                                            </Link>
                                                        </li>
                                                    )
                                                })}
                                            </ul>
                                        )}
                                    </li>
                                )
                            }

                            const active = isActive(item.href)
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                                            active
                                                ? 'bg-primary-600 text-white font-medium'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                    >
                                        <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-white' : 'text-gray-400'}`} />
                                        <span>{item.label}</span>
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                </nav>

                <div className="border-t border-gray-200 p-3">
                    <div className="text-center text-xs text-gray-400">Inventario v1.0</div>
                </div>
            </aside>
        </>
    )
}
