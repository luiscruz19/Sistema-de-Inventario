'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Package, ShoppingCart } from 'lucide-react'
import type { Branch } from '@/types'

interface SalesReport { total_sales: number; total_revenue: number; avg_ticket: number; total_cost: number; margin: number; by_method: { method: string; count: number; amount: number }[]; by_branch: { branch: string; count: number; amount: number }[] }
interface ProductsReport { top_selling: { name: string; quantity: number; revenue: number }[]; least_selling: { name: string; quantity: number; revenue: number }[]; no_movement: { name: string; sku: string }[] }
interface MarginsReport { by_product: { name: string; cost: number; revenue: number; margin: number; margin_pct: number }[]; by_category: { name: string; cost: number; revenue: number; margin: number }[] }

export default function ReportesPage() {
    const api = useApi()
    const [branches, setBranches] = useState<Branch[]>([])
    const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0] })
    const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
    const [branchId, setBranchId] = useState('')
    const [salesReport, setSalesReport] = useState<SalesReport | null>(null)
    const [productsReport, setProductsReport] = useState<ProductsReport | null>(null)
    const [marginsReport, setMarginsReport] = useState<MarginsReport | null>(null)
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('ventas')

    useEffect(() => {
        api.get<Branch[]>('/branches').then(res => {
            if (res.status === 1 && res.data) setBranches(Array.isArray(res.data) ? res.data : [])
        })
    }, [api])

    const generateReport = useCallback(async () => {
        setLoading(true)
        const params: Record<string, string> = { date_from: dateFrom, date_to: dateTo }
        if (branchId) params.branch_id = branchId

        const [salesRes, prodsRes, marginsRes] = await Promise.all([
            api.get<SalesReport>('/reports', { ...params, type: 'by-period' }),
            api.get<ProductsReport>('/reports', { ...params, type: 'by-product' }),
            api.get<MarginsReport>('/reports', { ...params, type: 'margins' }),
        ])

        if (salesRes.status === 1 && salesRes.data) setSalesReport(salesRes.data)
        if (prodsRes.status === 1 && prodsRes.data) setProductsReport(prodsRes.data)
        if (marginsRes.status === 1 && marginsRes.data) setMarginsReport(marginsRes.data)
        setLoading(false)
    }, [api, dateFrom, dateTo, branchId])

    useEffect(() => { generateReport() }, [generateReport])

    const methodNames: Record<string, string> = { cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', mercadopago: 'MercadoPago', mixed: 'Mixto' }

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Reportes</h1>

            <div className="flex flex-wrap items-end gap-3 mb-6">
                <div>
                    <label className="text-xs text-gray-500">Desde</label>
                    <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
                </div>
                <div>
                    <label className="text-xs text-gray-500">Hasta</label>
                    <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
                </div>
                <Select value={branchId || '__all__'} onValueChange={(v) => setBranchId(v === '__all__' ? '' : v)}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Todas las sucursales" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__all__">Todas las sucursales</SelectItem>
                        {branches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button onClick={generateReport} disabled={loading}>
                    <BarChart3 className="h-4 w-4 mr-2" /> {loading ? 'Generando...' : 'Generar'}
                </Button>
            </div>

            {/* Summary cards */}
            {salesReport && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <Card><CardContent className="p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-lg bg-primary-50 flex items-center justify-center"><ShoppingCart className="h-5 w-5 text-primary-600" /></div>
                        <div><p className="text-xs text-gray-500">Total ventas</p><p className="text-xl font-bold">{salesReport.total_sales}</p></div>
                    </CardContent></Card>
                    <Card><CardContent className="p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-lg bg-green-50 flex items-center justify-center"><DollarSign className="h-5 w-5 text-green-600" /></div>
                        <div><p className="text-xs text-gray-500">Ingresos</p><p className="text-xl font-bold text-green-600">{formatCurrency(salesReport.total_revenue)}</p></div>
                    </CardContent></Card>
                    <Card><CardContent className="p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-blue-600" /></div>
                        <div><p className="text-xs text-gray-500">Ticket promedio</p><p className="text-xl font-bold">{formatCurrency(salesReport.avg_ticket)}</p></div>
                    </CardContent></Card>
                    <Card><CardContent className="p-5 flex items-center gap-4">
                        <div className="w-11 h-11 rounded-lg bg-purple-50 flex items-center justify-center"><TrendingUp className="h-5 w-5 text-purple-600" /></div>
                        <div><p className="text-xs text-gray-500">Margen</p><p className="text-xl font-bold text-purple-600">{formatCurrency(salesReport.margin)}</p></div>
                    </CardContent></Card>
                </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="ventas">Ventas</TabsTrigger>
                    <TabsTrigger value="productos">Productos</TabsTrigger>
                    <TabsTrigger value="margenes">Margenes</TabsTrigger>
                </TabsList>

                <TabsContent value="ventas" className="mt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader><CardTitle className="text-base">Ventas por metodo de pago</CardTitle></CardHeader>
                            <CardContent>
                                {salesReport?.by_method && salesReport.by_method.length > 0 ? (
                                    <div className="space-y-3">
                                        {salesReport.by_method.map(m => (
                                            <div key={m.method} className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-medium">{methodNames[m.method] || m.method}</span>
                                                    <span className="text-xs text-gray-400">({m.count} ventas)</span>
                                                </div>
                                                <span className="font-semibold">{formatCurrency(m.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-base">Ventas por sucursal</CardTitle></CardHeader>
                            <CardContent>
                                {salesReport?.by_branch && salesReport.by_branch.length > 0 ? (
                                    <div className="space-y-3">
                                        {salesReport.by_branch.map(b => (
                                            <div key={b.branch} className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-medium">{b.branch}</span>
                                                    <span className="text-xs text-gray-400">({b.count} ventas)</span>
                                                </div>
                                                <span className="font-semibold">{formatCurrency(b.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="productos" className="mt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-600" />Mas vendidos</CardTitle></CardHeader>
                            <CardContent>
                                {productsReport?.top_selling && productsReport.top_selling.length > 0 ? (
                                    <div className="space-y-3">
                                        {productsReport.top_selling.map((p, i) => (
                                            <div key={p.name} className="flex items-center gap-3">
                                                <span className="w-6 h-6 rounded-full bg-green-50 text-green-600 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                                                <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{p.name}</p><p className="text-xs text-gray-400">{p.quantity} uds</p></div>
                                                <span className="text-sm font-semibold">{formatCurrency(p.revenue)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-600" />Menos vendidos</CardTitle></CardHeader>
                            <CardContent>
                                {productsReport?.least_selling && productsReport.least_selling.length > 0 ? (
                                    <div className="space-y-3">
                                        {productsReport.least_selling.map((p) => (
                                            <div key={p.name} className="flex items-center justify-between">
                                                <div className="min-w-0"><p className="text-sm font-medium truncate">{p.name}</p><p className="text-xs text-gray-400">{p.quantity} uds</p></div>
                                                <span className="text-sm">{formatCurrency(p.revenue)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4 text-gray-400" />Sin movimiento</CardTitle></CardHeader>
                            <CardContent>
                                {productsReport?.no_movement && productsReport.no_movement.length > 0 ? (
                                    <div className="space-y-2">
                                        {productsReport.no_movement.map((p) => (
                                            <div key={p.name} className="text-sm"><span className="font-medium">{p.name}</span>{p.sku && <span className="text-xs text-gray-400 ml-2">{p.sku}</span>}</div>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="margenes" className="mt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader><CardTitle className="text-base">Margen por producto</CardTitle></CardHeader>
                            <CardContent>
                                {marginsReport?.by_product && marginsReport.by_product.length > 0 ? (
                                    <div className="space-y-3">
                                        {marginsReport.by_product.map(p => (
                                            <div key={p.name} className="flex items-center justify-between">
                                                <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{p.name}</p></div>
                                                <div className="text-right text-sm">
                                                    <span className="text-green-600 font-semibold">{formatCurrency(p.margin)}</span>
                                                    <span className="text-gray-400 ml-2">({p.margin_pct?.toFixed(1)}%)</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-base">Margen por categoria</CardTitle></CardHeader>
                            <CardContent>
                                {marginsReport?.by_category && marginsReport.by_category.length > 0 ? (
                                    <div className="space-y-3">
                                        {marginsReport.by_category.map(c => (
                                            <div key={c.name}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-sm font-medium">{c.name}</span>
                                                    <span className="text-sm font-semibold text-green-600">{formatCurrency(c.margin)}</span>
                                                </div>
                                                <div className="flex gap-4 text-xs text-gray-400">
                                                    <span>Costo: {formatCurrency(c.cost)}</span>
                                                    <span>Ingresos: {formatCurrency(c.revenue)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : <p className="text-sm text-gray-400 text-center py-4">Sin datos</p>}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
