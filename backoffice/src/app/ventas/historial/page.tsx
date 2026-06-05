'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/use-api'
import { toast } from '@/hooks/use-toast'
import { DataTable, type Column } from '@/components/common/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Eye, XCircle, FileText } from 'lucide-react'
import Link from 'next/link'
import type { Sale, SaleItem, Pagination } from '@/types'

const statusMap: Record<string, { label: string; variant: 'success' | 'destructive' | 'warning' }> = {
    completed: { label: 'Completada', variant: 'success' },
    cancelled: { label: 'Cancelada', variant: 'destructive' },
    refunded: { label: 'Reembolsada', variant: 'warning' },
}

const methodMap: Record<string, string> = {
    cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia', mercadopago: 'MercadoPago', mixed: 'Mixto', credit: 'Credito',
}

export default function HistorialVentasPage() {
    const api = useApi()
    const [sales, setSales] = useState<Sale[]>([])
    const [pagination, setPagination] = useState<Pagination>({ totalItems: 0, totalPages: 0, currentPage: 1, perPage: 20 })
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [methodFilter, setMethodFilter] = useState('')
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
    const [detailItems, setDetailItems] = useState<SaleItem[]>([])

    const fetchSales = useCallback(async (page = 1) => {
        setLoading(true)
        const params: Record<string, string> = { page: String(page), limit: '20' }
        if (search) params.search = search
        if (dateFrom) params.date_from = dateFrom
        if (dateTo) params.date_to = dateTo
        if (statusFilter) params.status = statusFilter
        if (methodFilter) params.payment_method = methodFilter
        const res = await api.get<Sale[]>('/sales', params)
        if (res.status === 1 && res.data) {
            setSales(Array.isArray(res.data) ? res.data : [])
            if (res.pagination) setPagination(res.pagination)
        }
        setLoading(false)
    }, [api, search, dateFrom, dateTo, statusFilter, methodFilter])

    useEffect(() => { fetchSales() }, [fetchSales])

    const viewDetail = async (sale: Sale) => {
        const res = await api.get<Sale>(`/sales/${sale.id}`)
        if (res.status === 1 && res.data) {
            setSelectedSale(res.data)
            setDetailItems(res.data.items || [])
        }
    }

    const cancelSale = async (saleId: number) => {
        const res = await api.put(`/sales/${saleId}`, { status: 'cancelled' })
        if (res.status === 1) {
            toast({ title: 'Venta cancelada', variant: 'success' })
            fetchSales(pagination.currentPage)
            setSelectedSale(null)
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    const columns: Column<Sale>[] = [
        { key: 'sale_number', label: 'Nro', sortable: true, render: (v) => <span className="font-medium">{v as string || '-'}</span> },
        { key: 'createdAt', label: 'Fecha', sortable: true, render: (v) => v ? formatDateTime(v as string) : '-' },
        { key: 'customer', label: 'Cliente', render: (_, row) => row.customer?.name || 'Consumidor final' },
        { key: 'items', label: 'Items', render: (_, row) => row.items?.length || '-' },
        { key: 'total', label: 'Total', sortable: true, render: (v) => <span className="font-semibold">{formatCurrency(v as number)}</span> },
        { key: 'payment_method', label: 'Pago', render: (v) => methodMap[v as string] || v },
        { key: 'status', label: 'Estado', render: (v) => {
            const s = statusMap[v as string]
            return s ? <Badge variant={s.variant}>{s.label}</Badge> : <Badge variant="secondary">{v as string}</Badge>
        }},
    ]

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">Historial de Ventas</h1>

            <div className="flex flex-wrap gap-3 mb-4">
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
            </div>

            <DataTable
                data={sales}
                columns={columns}
                pagination={pagination}
                onPageChange={(p) => fetchSales(p)}
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Buscar por numero de venta..."
                filters={[
                    { key: 'status', label: 'Estado', options: [
                        { value: 'completed', label: 'Completada' },
                        { value: 'cancelled', label: 'Cancelada' },
                        { value: 'refunded', label: 'Reembolsada' },
                    ]},
                    { key: 'method', label: 'Metodo', options: [
                        { value: 'cash', label: 'Efectivo' },
                        { value: 'card', label: 'Tarjeta' },
                        { value: 'transfer', label: 'Transferencia' },
                        { value: 'mercadopago', label: 'MercadoPago' },
                        { value: 'mixed', label: 'Mixto' },
                    ]},
                ]}
                filterValues={{ status: statusFilter, method: methodFilter }}
                onFilterChange={(k, v) => { if (k === 'status') setStatusFilter(v); if (k === 'method') setMethodFilter(v) }}
                isLoading={loading}
                emptyMessage="No se encontraron ventas"
                actions={(row) => (
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => viewDetail(row)}>
                            <Eye className="h-4 w-4" />
                        </Button>
                        {row.status === 'completed' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => cancelSale(row.id)}>
                                <XCircle className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                )}
            />

            {/* Sale detail modal */}
            <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Detalle de venta {selectedSale?.sale_number}</DialogTitle>
                        <DialogDescription>Informacion completa de la venta</DialogDescription>
                    </DialogHeader>
                    {selectedSale && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><span className="text-gray-500">Fecha:</span> {selectedSale.createdAt ? formatDateTime(selectedSale.createdAt) : '-'}</div>
                                <div><span className="text-gray-500">Cliente:</span> {selectedSale.customer?.name || 'Consumidor final'}</div>
                                <div><span className="text-gray-500">Metodo:</span> {methodMap[selectedSale.payment_method] || selectedSale.payment_method}</div>
                                <div><span className="text-gray-500">Estado:</span> {statusMap[selectedSale.status]?.label || selectedSale.status}</div>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                <p className="font-medium text-sm">Items</p>
                                {detailItems.map((item) => (
                                    <div key={item.id} className="flex justify-between text-sm">
                                        <span>{item.product?.name || `Producto #${item.product_id}`} x{item.quantity}</span>
                                        <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                                    </div>
                                ))}
                            </div>
                            <Separator />
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>{formatCurrency(selectedSale.subtotal)}</span></div>
                                {selectedSale.discount_amount > 0 && <div className="flex justify-between text-green-600"><span>Descuento</span><span>-{formatCurrency(selectedSale.discount_amount)}</span></div>}
                                <div className="flex justify-between"><span className="text-gray-500">Impuestos</span><span>{formatCurrency(selectedSale.tax_amount)}</span></div>
                                <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{formatCurrency(selectedSale.total)}</span></div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="flex gap-2">
                        {selectedSale?.status === 'completed' && (
                            <Link href={`/inventario/facturacion/emitir?sale_id=${selectedSale.id}`}>
                                <Button variant="outline" onClick={() => setSelectedSale(null)}>
                                    <FileText className="h-4 w-4 mr-2" /> Emitir factura
                                </Button>
                            </Link>
                        )}
                        <Button variant="outline" onClick={() => setSelectedSale(null)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
