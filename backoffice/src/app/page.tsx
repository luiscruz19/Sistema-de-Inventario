'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useApi } from '@/hooks/use-api'
import { useKpis } from '@/hooks/use-kpis'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatCard } from '@/components/ui/stat-card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { StockBadge } from '@/components/common/StockBadge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { ShoppingCart, Package } from 'lucide-react'
import type { Sale, Customer, SalesVsPrevMonth, StockAlertsKpi } from '@/types'

interface DashboardStats {
    salesToday: number
    revenueToday: number
    lowStockCount: number
    activeCustomers: number
}

interface TopProduct { name: string; quantity: number; revenue: number }
type StockAlertProduct = StockAlertsKpi['products'][number]

export default function DashboardPage() {
    const api = useApi()
    const router = useRouter()
    const { salesVsPrevMonth, topProducts: topProductsKpiCall, stockAlerts } = useKpis()

    const [stats, setStats] = useState<DashboardStats>({ salesToday: 0, revenueToday: 0, lowStockCount: 0, activeCustomers: 0 })
    const [topProducts, setTopProducts] = useState<TopProduct[]>([])
    const [lowStockProducts, setLowStockProducts] = useState<StockAlertProduct[]>([])
    const [salesDelta, setSalesDelta] = useState<number | null>(null)
    const [period, setPeriod] = useState('today')
    const [loading, setLoading] = useState(true)

    const todayLabel = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

    const load = useCallback(async () => {
        setLoading(true)
        const now = new Date()
        const dateTo = now.toISOString().split('T')[0]
        const fromDate = new Date(now)
        if (period === 'week') {
            // Inicio de semana (lunes), es-AR
            const day = (now.getDay() + 6) % 7
            fromDate.setDate(now.getDate() - day)
        } else if (period === 'month') {
            fromDate.setDate(1)
        }
        const dateFrom = fromDate.toISOString().split('T')[0]

        const [salesRes, alertsRes, customersRes, reportsRes, svpm, topP] = await Promise.all([
            api.get<Sale[]>('/sales', { date_from: dateFrom, date_to: dateTo, limit: '1' }),
            stockAlerts(),
            api.get<Customer[]>('/customers', { active: 'true', limit: '1' }),
            api.get<{ totalSales: number; totalRevenue: number }>('/reports', { type: 'by-period', date_from: dateFrom, date_to: dateTo }),
            salesVsPrevMonth(),
            topProductsKpiCall(4),
        ])

        const alertsKpi = alertsRes.status === 1 && alertsRes.data ? (alertsRes.data as StockAlertsKpi) : null
        const customerCount = customersRes.pagination?.totalItems ?? 0
        const reports = reportsRes.status === 1 && reportsRes.data ? reportsRes.data : null
        const salesCount = salesRes.pagination?.totalItems ?? 0

        setLowStockProducts(alertsKpi?.products?.slice(0, 4) ?? [])
        setStats({
            salesToday: Number(reports?.totalSales ?? salesCount) || 0,
            revenueToday: Number(reports?.totalRevenue ?? 0) || 0,
            lowStockCount: alertsKpi?.count ?? 0,
            activeCustomers: customerCount,
        })

        // /kpis/top-products → { product: { name }, units, revenue } (strings).
        if (topP.status === 1 && Array.isArray(topP.data)) {
            setTopProducts((topP.data as { product?: { name?: string }; units: string | number; revenue: string | number }[])
                .map(p => ({ name: p.product?.name ?? 'Producto', quantity: Number(p.units) || 0, revenue: Number(p.revenue) || 0 })))
        }

        if (svpm.status === 1 && svpm.data) {
            setSalesDelta((svpm.data as SalesVsPrevMonth).delta_percentage)
        }
        setLoading(false)
    }, [api, period, salesVsPrevMonth, topProductsKpiCall, stockAlerts])

    useEffect(() => { load() }, [load])

    const ingresosDelta = salesDelta !== null
        ? `${salesDelta >= 0 ? '+' : ''}${salesDelta.toFixed(1)}% vs mes anterior`
        : 'ventas del período'

    return (
        <div>
            {/* Encabezado */}
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Dashboard</h1>
                    <p className="mt-0.5 text-[13px] capitalize text-muted-foreground">Sucursal Centro · {todayLabel}</p>
                </div>
                <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="today">Hoy</SelectItem>
                        <SelectItem value="week">Esta semana</SelectItem>
                        <SelectItem value="month">Este mes</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* KPIs */}
            <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="Ventas hoy"
                    value={loading ? <Skeleton className="h-7 w-16" /> : stats.salesToday}
                    icon={<ShoppingCart />}
                    delta={loading ? undefined : 'operaciones de hoy'}
                />
                <StatCard
                    label="Ingresos del día"
                    value={loading ? <Skeleton className="h-7 w-28" /> : formatCurrency(stats.revenueToday)}
                    delta={loading ? undefined : ingresosDelta}
                    deltaDirection={salesDelta === null ? 'muted' : salesDelta >= 0 ? 'up' : 'down'}
                />
                <StatCard
                    label="Stock bajo"
                    value={loading ? <Skeleton className="h-7 w-12" /> : stats.lowStockCount}
                    delta={loading ? undefined : stats.lowStockCount === 0 ? 'todo en orden' : 'por reponer'}
                    deltaDirection={stats.lowStockCount === 0 ? 'muted' : 'down'}
                />
                <StatCard
                    label="Clientes activos"
                    value={loading ? <Skeleton className="h-7 w-16" /> : stats.activeCustomers}
                    delta={loading ? undefined : 'este mes'}
                />
            </div>

            {/* Paneles */}
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[3fr_2fr]">
                <Card>
                    <CardHeader><CardTitle>Top productos vendidos</CardTitle></CardHeader>
                    <CardContent className="flex flex-col gap-3 pt-0">
                        {loading ? (
                            [...Array(4)].map((_, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <Skeleton className="h-[22px] w-[22px] rounded-sm" />
                                    <Skeleton className="h-4 flex-1" />
                                    <Skeleton className="h-4 w-16" />
                                </div>
                            ))
                        ) : topProducts.length === 0 ? (
                            <EmptyState icon={ShoppingCart} title="Sin ventas en el período" description="Las ventas registradas alimentarán este ranking." className="py-6" />
                        ) : (
                            topProducts.map((p, i) => (
                                <div key={p.name} className="flex items-center gap-3">
                                    <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-sm bg-secondary text-xs font-semibold tabular-nums text-muted-foreground">{i + 1}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-[13px] font-medium">{p.name}</p>
                                        <p className="text-xs text-muted-foreground">{p.quantity} vendidos</p>
                                    </div>
                                    <strong className="text-[13px] font-semibold tabular-nums">{formatCurrency(p.revenue)}</strong>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-0">
                        <div className="flex items-center justify-between">
                            <CardTitle>Alertas de stock</CardTitle>
                            <Button size="sm" variant="ghost" onClick={() => router.push('/stock')}>Ver stock</Button>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                        {loading ? (
                            <div className="flex flex-col">
                                {[...Array(4)].map((_, i) => <Skeleton key={i} className="my-2 h-9 w-full" />)}
                            </div>
                        ) : lowStockProducts.length === 0 ? (
                            <EmptyState icon={Package} title="Stock saludable" description="No hay productos por debajo del mínimo." className="py-6" />
                        ) : (
                            <div className="flex flex-col">
                                {lowStockProducts.map((p, i, arr) => (
                                    <div key={p.id} className={`flex items-center gap-3 py-[9px] ${i < arr.length - 1 ? 'border-b border-border' : ''}`}>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-[13px] font-medium">{p.name}</p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">Mínimo: {p.min_stock_alert} unidades</p>
                                        </div>
                                        <StockBadge quantity={p.total_stock} minAlert={p.min_stock_alert} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
