'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useApi } from '@/hooks/use-api'
import { useKpis } from '@/hooks/use-kpis'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import {
    DollarSign, Package, AlertTriangle, Users, TrendingUp, ShoppingCart,
    TrendingDown, Clock, FileText, Wallet,
} from 'lucide-react'
import type {
    Sale, Product, Customer,
    SalesVsPrevMonth, ReceivablesAging, AvailableCash, StockAlertsKpi,
} from '@/types'

interface DashboardStats {
    salesToday: number
    revenueToday: number
    lowStockCount: number
    activeCustomers: number
}

export default function DashboardPage() {
    const api = useApi()
    const { salesVsPrevMonth, receivablesAging, availableCash, stockAlerts, topCustomers, topProducts: topProductsKpiCall } = useKpis()

    const [stats, setStats] = useState<DashboardStats>({ salesToday: 0, revenueToday: 0, lowStockCount: 0, activeCustomers: 0 })
    const [recentSales, setRecentSales] = useState<Sale[]>([])
    const [topProducts, setTopProducts] = useState<{ name: string; quantity: number; revenue: number }[]>([])
    const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
    const [period, setPeriod] = useState('today')
    const [loading, setLoading] = useState(true)

    // KPI states
    const [salesKpi, setSalesKpi] = useState<SalesVsPrevMonth | null>(null)
    const [agingKpi, setAgingKpi] = useState<ReceivablesAging | null>(null)
    const [cashKpi, setCashKpi] = useState<AvailableCash | null>(null)
    const [stockAlertsKpi, setStockAlertsKpi] = useState<StockAlertsKpi | null>(null)
    const [topCustomersKpi, setTopCustomersKpi] = useState<{ customer_id: number; customer_name: string; total: number }[]>([])
    const [topProductsKpi, setTopProductsKpi] = useState<{ product_id: number; product_name: string; quantity: number; total: number }[]>([])
    const [kpiLoading, setKpiLoading] = useState(true)

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            const today = new Date().toISOString().split('T')[0]

            const [salesRes, alertsRes, customersRes, reportsRes] = await Promise.all([
                api.get<Sale[]>('/sales', { date_from: today, date_to: today, limit: '5' }),
                api.get<Product[]>('/alerts'),
                api.get<Customer[]>('/customers', { active: 'true', limit: '1' }),
                api.get<{ total_sales: number; total_revenue: number; top_products: { name: string; quantity: number; revenue: number }[] }>('/reports', { type: 'by-period', date_from: today, date_to: today }),
            ])

            const sales = salesRes.status === 1 && salesRes.data ? (Array.isArray(salesRes.data) ? salesRes.data : []) : []
            const alerts = alertsRes.status === 1 && alertsRes.data ? (Array.isArray(alertsRes.data) ? alertsRes.data : []) : []
            const customerCount = customersRes.pagination?.totalItems ?? 0

            setRecentSales(sales)
            setLowStockProducts(alerts.slice(0, 5))

            if (reportsRes.status === 1 && reportsRes.data) {
                const rd = reportsRes.data
                setStats({
                    salesToday: rd.total_sales || sales.length,
                    revenueToday: rd.total_revenue || sales.reduce((s, sale) => s + sale.total, 0),
                    lowStockCount: alerts.length,
                    activeCustomers: customerCount,
                })
                setTopProducts(rd.top_products || [])
            } else {
                setStats({
                    salesToday: sales.length,
                    revenueToday: sales.reduce((s, sale) => s + sale.total, 0),
                    lowStockCount: alerts.length,
                    activeCustomers: customerCount,
                })
            }

            setLoading(false)
        }
        load()
    }, [api, period])

    const loadKpis = useCallback(async () => {
        setKpiLoading(true)
        const [svpm, aging, cash, stockA, topC, topP] = await Promise.all([
            salesVsPrevMonth(),
            receivablesAging(),
            availableCash(),
            stockAlerts(),
            topCustomers(5),
            topProductsKpiCall(5),
        ])
        if (svpm.status === 1 && svpm.data) setSalesKpi(svpm.data as SalesVsPrevMonth)
        if (aging.status === 1 && aging.data) setAgingKpi(aging.data as ReceivablesAging)
        if (cash.status === 1 && cash.data) setCashKpi(cash.data as AvailableCash)
        if (stockA.status === 1 && stockA.data) setStockAlertsKpi(stockA.data as StockAlertsKpi)
        if (topC.status === 1 && Array.isArray(topC.data)) setTopCustomersKpi(topC.data as { customer_id: number; customer_name: string; total: number }[])
        if (topP.status === 1 && Array.isArray(topP.data)) setTopProductsKpi(topP.data as { product_id: number; product_name: string; quantity: number; total: number }[])
        setKpiLoading(false)
    }, [salesVsPrevMonth, receivablesAging, availableCash, stockAlerts, topCustomers, topProductsKpiCall])

    useEffect(() => { loadKpis() }, [loadKpis])

    const statCards = [
        { title: 'Ventas hoy', value: stats.salesToday, icon: ShoppingCart, color: 'text-primary-600', bg: 'bg-primary-50' },
        { title: 'Ingresos del dia', value: formatCurrency(stats.revenueToday), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
        { title: 'Alertas stock bajo', value: stats.lowStockCount, icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        { title: 'Clientes activos', value: stats.activeCustomers, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    ]

    // Delta de ventas vs mes anterior
    const deltaPositive = salesKpi && (salesKpi.delta_percentage ?? 0) >= 0

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="today">Hoy</SelectItem>
                        <SelectItem value="week">Esta semana</SelectItem>
                        <SelectItem value="month">Este mes</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Stat cards — ventas del dia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statCards.map((card) => {
                    const Icon = card.icon
                    return (
                        <Card key={card.title}>
                            <CardContent className="p-5">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-500">{card.title}</p>
                                        <p className={`text-2xl font-bold mt-1 ${card.color}`}>
                                            {loading ? '...' : card.value}
                                        </p>
                                    </div>
                                    <div className={`w-11 h-11 rounded-lg ${card.bg} flex items-center justify-center`}>
                                        <Icon className={`h-5 w-5 ${card.color}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* KPI cards — BI (facturación/dashboard-bi) */}
            <h2 className="text-base font-semibold text-gray-700 mb-3">Indicadores del negocio</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Ventas vs mes anterior */}
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-sm text-gray-500">Ventas este mes</p>
                            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                                {deltaPositive
                                    ? <TrendingUp className="h-4 w-4 text-blue-600" />
                                    : <TrendingDown className="h-4 w-4 text-red-500" />}
                            </div>
                        </div>
                        {kpiLoading ? (
                            <p className="text-2xl font-bold text-gray-300">...</p>
                        ) : salesKpi ? (
                            <>
                                <p className="text-2xl font-bold text-blue-700">{formatCurrency(salesKpi.current_month.total)}</p>
                                <p className={`text-xs mt-1 ${deltaPositive ? 'text-green-600' : 'text-red-500'}`}>
                                    {deltaPositive ? '+' : ''}{salesKpi.delta_percentage !== null ? salesKpi.delta_percentage.toFixed(1) : '—'}% vs mes anterior
                                </p>
                            </>
                        ) : (
                            <p className="text-sm text-gray-400">Sin datos</p>
                        )}
                    </CardContent>
                </Card>

                {/* Cuentas a cobrar */}
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-sm text-gray-500">Cuentas a cobrar</p>
                            <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
                                <Clock className="h-4 w-4 text-orange-600" />
                            </div>
                        </div>
                        {kpiLoading ? (
                            <p className="text-2xl font-bold text-gray-300">...</p>
                        ) : agingKpi ? (
                            <>
                                <p className="text-2xl font-bold text-orange-700">{formatCurrency(agingKpi.total)}</p>
                                <div className="flex gap-2 mt-1 flex-wrap">
                                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">0-30d: {formatCurrency(agingKpi.buckets['0-30'])}</span>
                                    <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">31-60d: {formatCurrency(agingKpi.buckets['31-60'])}</span>
                                    <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">61-90d: {formatCurrency(agingKpi.buckets['61-90'])}</span>
                                    <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">+90d: {formatCurrency(agingKpi.buckets['90+'])}</span>
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-gray-400">Sin datos</p>
                        )}
                    </CardContent>
                </Card>

                {/* Disponible en caja */}
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-sm text-gray-500">Disponible en caja</p>
                            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                                <Wallet className="h-4 w-4 text-emerald-600" />
                            </div>
                        </div>
                        {kpiLoading ? (
                            <p className="text-2xl font-bold text-gray-300">...</p>
                        ) : cashKpi ? (
                            <>
                                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(cashKpi.estimated_cash)}</p>
                                <p className="text-xs text-gray-400 mt-1">{cashKpi.open_registers} {cashKpi.open_registers === 1 ? 'caja abierta' : 'cajas abiertas'}</p>
                            </>
                        ) : (
                            <p className="text-sm text-gray-400">Sin cajas abiertas</p>
                        )}
                    </CardContent>
                </Card>

                {/* Alertas de stock */}
                <Card>
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-1">
                            <p className="text-sm text-gray-500">Stock bajo</p>
                            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
                                <Package className="h-4 w-4 text-red-600" />
                            </div>
                        </div>
                        {kpiLoading ? (
                            <p className="text-2xl font-bold text-gray-300">...</p>
                        ) : stockAlertsKpi !== null ? (
                            <>
                                <p className="text-2xl font-bold text-red-600">{stockAlertsKpi.count}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                    {stockAlertsKpi.count === 0 ? 'Todo en orden' : `producto${stockAlertsKpi.count === 1 ? '' : 's'} por reponer`}
                                </p>
                            </>
                        ) : (
                            <p className="text-sm text-gray-400">Sin datos</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Top 5 clientes (KPI) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Users className="h-4 w-4 text-purple-600" />
                            Top 5 clientes por ventas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {kpiLoading ? (
                            <p className="text-sm text-gray-400 text-center py-4">Cargando...</p>
                        ) : topCustomersKpi.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">Sin datos disponibles</p>
                        ) : (
                            <div className="space-y-3">
                                {topCustomersKpi.map((c, idx) => (
                                    <div key={c.customer_id} className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 text-xs font-bold flex items-center justify-center shrink-0">{idx + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{c.customer_name}</p>
                                        </div>
                                        <span className="text-sm font-semibold shrink-0">{formatCurrency(c.total)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Top 5 productos (KPI desde dashboard-bi) */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary-600" />
                            Top 5 productos mas vendidos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {kpiLoading ? (
                            <p className="text-sm text-gray-400 text-center py-4">Cargando...</p>
                        ) : topProductsKpi.length > 0 ? (
                            <div className="space-y-3">
                                {topProductsKpi.map((p, idx) => (
                                    <div key={p.product_id} className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-full bg-primary-50 text-primary-600 text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{p.product_name}</p>
                                            <p className="text-xs text-gray-400">{p.quantity} vendidos</p>
                                        </div>
                                        <span className="text-sm font-semibold">{formatCurrency(p.total)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : topProducts.length > 0 ? (
                            <div className="space-y-3">
                                {topProducts.slice(0, 5).map((p, idx) => (
                                    <div key={p.name} className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-full bg-primary-50 text-primary-600 text-xs font-bold flex items-center justify-center">{idx + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{p.name}</p>
                                            <p className="text-xs text-gray-400">{p.quantity} vendidos</p>
                                        </div>
                                        <span className="text-sm font-semibold">{formatCurrency(p.revenue)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 text-center py-4">Sin datos para el periodo</p>
                        )}
                    </CardContent>
                </Card>

                {/* Ultimas ventas */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4 text-green-600" />
                            Ultimas ventas
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentSales.length === 0 ? (
                            <p className="text-sm text-gray-400 text-center py-4">Sin ventas recientes</p>
                        ) : (
                            <div className="space-y-3">
                                {recentSales.map((sale) => (
                                    <div key={sale.id} className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium">{sale.sale_number || `#${sale.id}`}</p>
                                            <p className="text-xs text-gray-400">{sale.createdAt ? formatDateTime(sale.createdAt) : ''}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-semibold">{formatCurrency(sale.total)}</p>
                                            <Badge variant={sale.status === 'completed' ? 'success' : sale.status === 'cancelled' ? 'destructive' : 'warning'} className="text-[10px]">
                                                {sale.status === 'completed' ? 'Completada' : sale.status === 'cancelled' ? 'Cancelada' : 'Reembolsada'}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Facturas — link a facturación */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            Facturación electrónica
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-gray-500 mb-4">
                            Emitir comprobantes AFIP/ARCA y ver el estado de las facturas emitidas.
                        </p>
                        <div className="flex gap-2">
                            <Link href="/inventario/facturacion/emitir">
                                <button className="text-sm font-medium text-primary-600 hover:underline">Emitir factura</button>
                            </Link>
                            <span className="text-gray-300">|</span>
                            <Link href="/inventario/facturacion">
                                <button className="text-sm font-medium text-gray-600 hover:underline">Ver todas las facturas</button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Alertas de stock bajo */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        Alertas de stock bajo
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {lowStockProducts.length === 0 && (!stockAlertsKpi || stockAlertsKpi.count === 0) ? (
                        <p className="text-sm text-gray-400 text-center py-4">Todos los productos tienen stock suficiente</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {/* productos del KPI si existen, sino fallback a alerts */}
                            {(stockAlertsKpi?.products?.length
                                ? stockAlertsKpi.products.slice(0, 6)
                                : lowStockProducts.map(p => ({ id: p.id, name: p.name, sku: p.sku, min_stock_alert: p.min_stock_alert, total_stock: 0 }))
                            ).map((p) => (
                                <div key={p.id} className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                                    <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium truncate">{p.name}</p>
                                        <p className="text-xs text-yellow-700">Stock: {p.total_stock} / Min: {p.min_stock_alert}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
