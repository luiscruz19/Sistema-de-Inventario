'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/common/EmptyState'
import { StatCard } from '@/components/ui/stat-card'
import { PageHead } from '@/components/common/PageHead'
import { formatCurrency } from '@/lib/utils'
import { BarChart3, DollarSign, ShoppingCart, TrendingUp } from 'lucide-react'
import type { Branch } from '@/types'

// Formas reales que devuelve el microservicio de reportes (camelCase).
interface SalesReport {
    totalSales: number
    totalRevenue: number
    totalDiscount: number
    totalTax: number
    avgTicket: number
    byPaymentMethod: Record<string, { count: number; total: number }>
}
interface ProductRow {
    product_id: number
    total_quantity: string | number
    total_revenue: string | number
    sale_count: number
    product?: { name?: string; sku?: string }
}
interface MarginsReport {
    totalRevenue: number
    totalCost: number
    totalMargin: number
    marginPercentage: number
}

const METHOD_LABELS: Record<string, string> = {
    cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia',
    mercadopago: 'MercadoPago', credit: 'Crédito', mixed: 'Mixto',
}
const rank = 'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-sm bg-secondary text-xs font-semibold tabular-nums text-muted-foreground'

export default function ReportesPage() {
    const api = useApi()
    const [branches, setBranches] = useState<Branch[]>([])
    const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0] })
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
    const [branchId, setBranchId] = useState('')
    const [sales, setSales] = useState<SalesReport | null>(null)
    const [products, setProducts] = useState<ProductRow[]>([])
    const [margins, setMargins] = useState<MarginsReport | null>(null)
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('ventas')

    useEffect(() => {
        api.get<Branch[]>('/branches').then(res => {
            if (res.status === 1 && Array.isArray(res.data)) setBranches(res.data)
        })
    }, [api])

    const generateReport = useCallback(async () => {
        setLoading(true)
        const params: Record<string, string> = { date_from: dateFrom, date_to: dateTo }
        if (branchId) params.branch_id = branchId
        const [salesRes, prodsRes, marginsRes] = await Promise.all([
            api.get<SalesReport>('/reports', { ...params, type: 'by-period' }),
            api.get<ProductRow[]>('/reports', { ...params, type: 'by-product' }),
            api.get<MarginsReport>('/reports', { ...params, type: 'margins' }),
        ])
        setSales(salesRes.status === 1 && salesRes.data ? salesRes.data : null)
        setProducts(prodsRes.status === 1 && Array.isArray(prodsRes.data) ? prodsRes.data : [])
        setMargins(marginsRes.status === 1 && marginsRes.data ? marginsRes.data : null)
        setLoading(false)
    }, [api, dateFrom, dateTo, branchId])

    useEffect(() => { generateReport() }, [generateReport])

    const topProducts = [...products].sort((a, b) => Number(b.total_revenue) - Number(a.total_revenue))
    const methods = sales ? Object.entries(sales.byPaymentMethod || {}) : []

    return (
        <div>
            <PageHead title="Reportes" sub="Análisis del negocio · ventas, productos y márgenes" />

            <div className="mb-6 flex flex-wrap items-end gap-3">
                <div>
                    <label className="text-xs text-muted-foreground">Desde</label>
                    <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-[160px]" />
                </div>
                <div>
                    <label className="text-xs text-muted-foreground">Hasta</label>
                    <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-[160px]" />
                </div>
                <Select value={branchId || '__all__'} onValueChange={v => setBranchId(v === '__all__' ? '' : v)}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todas las sucursales" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__all__">Todas las sucursales</SelectItem>
                        {branches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button onClick={generateReport} disabled={loading}>
                    <BarChart3 className="mr-2 h-4 w-4" /> {loading ? 'Generando...' : 'Generar'}
                </Button>
            </div>

            {/* KPIs del período */}
            <div className="mb-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Total ventas" value={sales ? Number(sales.totalSales) : 0} icon={<ShoppingCart />} delta="operaciones" />
                <StatCard label="Ingresos" value={formatCurrency(Number(sales?.totalRevenue ?? 0))} icon={<DollarSign />} delta="del período" />
                <StatCard label="Ticket promedio" value={formatCurrency(Number(sales?.avgTicket ?? 0))} delta="por venta" />
                <StatCard label="Margen" value={`${Number(margins?.marginPercentage ?? 0).toFixed(1)}%`} icon={<TrendingUp />} delta={formatCurrency(Number(margins?.totalMargin ?? 0))} deltaDirection="up" />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="ventas">Ventas</TabsTrigger>
                    <TabsTrigger value="productos">Productos</TabsTrigger>
                    <TabsTrigger value="margenes">Márgenes</TabsTrigger>
                </TabsList>

                <TabsContent value="ventas" className="mt-4">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        <Card>
                            <CardHeader><CardTitle>Ventas por medio de pago</CardTitle></CardHeader>
                            <CardContent>
                                {methods.length === 0 ? (
                                    <EmptyState icon={BarChart3} title="Sin ventas" description="No hay ventas en el período seleccionado." className="py-6" />
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        {methods.map(([m, v]) => (
                                            <div key={m} className="flex items-center justify-between">
                                                <span className="text-sm font-medium">{METHOD_LABELS[m] ?? m} <span className="text-xs text-muted-foreground">({v.count} {v.count === 1 ? 'venta' : 'ventas'})</span></span>
                                                <strong className="text-[13px] font-semibold tabular-nums">{formatCurrency(Number(v.total))}</strong>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle>Detalle del período</CardTitle></CardHeader>
                            <CardContent className="flex flex-col gap-3">
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Ingresos</span><span className="tabular-nums">{formatCurrency(Number(sales?.totalRevenue ?? 0))}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Descuentos</span><span className="tabular-nums">{formatCurrency(Number(sales?.totalDiscount ?? 0))}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">IVA</span><span className="tabular-nums">{formatCurrency(Number(sales?.totalTax ?? 0))}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Ticket promedio</span><span className="tabular-nums">{formatCurrency(Number(sales?.avgTicket ?? 0))}</span></div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="productos" className="mt-4">
                    <Card>
                        <CardHeader><CardTitle>Productos más vendidos</CardTitle></CardHeader>
                        <CardContent>
                            {topProducts.length === 0 ? (
                                <EmptyState icon={ShoppingCart} title="Sin ventas en el período" description="Cuando registres ventas, aparecerán acá." className="py-6" />
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {topProducts.slice(0, 12).map((p, i) => (
                                        <div key={p.product_id} className="flex items-center gap-3">
                                            <span className={rank}>{i + 1}</span>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-[13px] font-medium">{p.product?.name ?? `#${p.product_id}`}</p>
                                                <p className="text-xs text-muted-foreground">{Number(p.total_quantity)} unidades · {p.sale_count} {p.sale_count === 1 ? 'venta' : 'ventas'}</p>
                                            </div>
                                            <strong className="text-[13px] font-semibold tabular-nums">{formatCurrency(Number(p.total_revenue))}</strong>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="margenes" className="mt-4">
                    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard label="Ingresos" value={formatCurrency(Number(margins?.totalRevenue ?? 0))} />
                        <StatCard label="Costo" value={formatCurrency(Number(margins?.totalCost ?? 0))} />
                        <StatCard label="Margen bruto" value={formatCurrency(Number(margins?.totalMargin ?? 0))} deltaDirection="up" delta="ganancia" />
                        <StatCard label="Margen %" value={`${Number(margins?.marginPercentage ?? 0).toFixed(1)}%`} icon={<TrendingUp />} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
