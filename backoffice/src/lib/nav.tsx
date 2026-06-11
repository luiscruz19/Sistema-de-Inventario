import {
    Home, ShoppingCart, Package, Tags, Warehouse, Truck, Users, BarChart3,
    FileText, Wallet, Landmark, Calculator, RotateCcw, Building2, ArrowLeftRight,
    Boxes, Barcode, Store, Settings, Receipt,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
    href: string
    label: string
    icon: LucideIcon
}

// Navegación principal — calca la guía de pantallas del design system.
// El orden define los atajos numéricos 1–8.
export const primaryNav: NavItem[] = [
    { href: '', label: 'Dashboard', icon: Home },
    { href: '/ventas', label: 'Punto de venta', icon: ShoppingCart },
    { href: '/productos', label: 'Productos', icon: Package },
    { href: '/categorias', label: 'Categorías', icon: Tags },
    { href: '/stock', label: 'Stock', icon: Warehouse },
    { href: '/compras', label: 'Compras', icon: Truck },
    { href: '/clientes', label: 'Clientes', icon: Users },
    { href: '/reportes', label: 'Reportes', icon: BarChart3 },
]

// Operaciones — módulos reales fuera del flujo principal.
export const secondaryNav: NavItem[] = [
    { href: '/ventas/historial', label: 'Ventas', icon: Receipt },
    { href: '/facturacion', label: 'Facturación', icon: FileText },
    { href: '/caja', label: 'Caja', icon: Wallet },
    { href: '/banco/cuentas', label: 'Banco', icon: Landmark },
    { href: '/contabilidad/asientos', label: 'Contabilidad', icon: Calculator },
    { href: '/devoluciones', label: 'Devoluciones', icon: RotateCcw },
    { href: '/proveedores', label: 'Proveedores', icon: Building2 },
    { href: '/transferencias', label: 'Transferencias', icon: ArrowLeftRight },
    { href: '/lotes', label: 'Lotes', icon: Boxes },
    { href: '/numeros-serie', label: 'Números de serie', icon: Barcode },
    { href: '/marketplace/publicaciones', label: 'Marketplace', icon: Store },
    { href: '/sucursales', label: 'Sucursales', icon: Building2 },
    { href: '/configuracion', label: 'Configuración', icon: Settings },
]
