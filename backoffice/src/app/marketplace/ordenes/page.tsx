'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/use-api'
import { toast } from '@/hooks/use-toast'
import { DataTable, type Column } from '@/components/common/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Eye, ShoppingBag } from 'lucide-react'
import type { Pagination } from '@/types'

type OrderStatus = 'pendiente' | 'pagado' | 'enviado' | 'entregado' | 'cancelado'

type MarketplaceConnectionRef = {
    id?: number
    nombre: string
    marketplace?: string
}

type MarketplaceOrder = {
    id: number
    connection_id: number
    connection?: MarketplaceConnectionRef
    marketplace_order_id: string
    buyer_nombre: string
    buyer_email?: string
    buyer_telefono?: string
    total: number
    moneda?: string
    estado: OrderStatus
    sale_id?: number
    createdAt: string
}

const statusMap: Record<OrderStatus, { label: string; variant: 'warning' | 'success' | 'secondary' | 'destructive' }> = {
    pendiente: { label: 'Pendiente', variant: 'warning' },
    pagado: { label: 'Pagada', variant: 'success' },
    enviado: { label: 'Enviada', variant: 'secondary' },
    entregado: { label: 'Entregada', variant: 'success' },
    cancelado: { label: 'Cancelada', variant: 'destructive' },
}

export default function MarketplaceOrdenesPage() {
    const api = useApi()
    const [orders, setOrders] = useState<MarketplaceOrder[]>([])
    const [connections, setConnections] = useState<{ id: number; nombre: string }[]>([])
    const [pagination, setPagination] = useState<Pagination>({ totalItems: 0, totalPages: 0, currentPage: 1, perPage: 20 })
    const [loading, setLoading] = useState(true)
    const [connectionFilter, setConnectionFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [selectedOrder, setSelectedOrder] = useState<MarketplaceOrder | null>(null)
    const [showDetail, setShowDetail] = useState(false)

    const fetchOrders = useCallback(async (page = 1) => {
        setLoading(true)
        const params: Record<string, string> = { page: String(page), limit: '20' }
        if (connectionFilter) params.connection_id = connectionFilter
        if (statusFilter) params.estado = statusFilter
        const res = await api.get<MarketplaceOrder[]>('/marketplace/orders', params)
        if (res.status === 1 && res.data) {
            setOrders(Array.isArray(res.data) ? res.data : [])
            if (res.pagination) setPagination(res.pagination)
        }
        setLoading(false)
    }, [api, connectionFilter, statusFilter])

    const fetchConnections = useCallback(async () => {
        const res = await api.get<{ id: number; nombre: string }[]>('/marketplace/connections', { limit: '100' })
        if (res.status === 1 && res.data) setConnections(Array.isArray(res.data) ? res.data : [])
    }, [api])

    useEffect(() => { fetchOrders() }, [fetchOrders])
    useEffect(() => { fetchConnections() }, [fetchConnections])

    const viewDetail = async (order: MarketplaceOrder) => {
        const res = await api.get<MarketplaceOrder>(`/marketplace/orders/${order.id}`)
        if (res.status === 1 && res.data) setSelectedOrder(res.data)
        else setSelectedOrder(order)
        setShowDetail(true)
    }

    const updateStatus = async (id: number, estado: OrderStatus) => {
        const res = await api.patch(`/marketplace/orders/${id}/status`, { estado })
        if (res.status === 1) {
            toast({ title: 'Estado actualizado', variant: 'success' })
            fetchOrders(pagination.currentPage)
            if (selectedOrder?.id === id) setSelectedOrder(prev => prev ? { ...prev, estado } : null)
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    const columns: Column<MarketplaceOrder>[] = [
        {
            key: 'connection',
            label: 'Marketplace',
            render: (_, row) => <span className="text-sm font-medium">{row.connection?.nombre || `#${row.connection_id}`}</span>,
        },
        {
            key: 'marketplace_order_id',
            label: 'N° Orden',
            render: (v) => <span className="font-mono text-sm font-semibold">{v as string}</span>,
        },
        {
            key: 'buyer_nombre',
            label: 'Comprador',
            render: (v) => <span className="text-sm">{v as string}</span>,
        },
        {
            key: 'total',
            label: 'Total',
            sortable: true,
            render: (v) => <span className="font-semibold">{formatCurrency(v as number)}</span>,
        },
        {
            key: 'estado',
            label: 'Estado',
            render: (v) => {
                const s = statusMap[v as OrderStatus]
                return s ? <Badge variant={s.variant}>{s.label}</Badge> : <Badge variant="secondary">{v as string}</Badge>
            },
        },
        {
            key: 'createdAt',
            label: 'Fecha',
            sortable: true,
            render: (v) => <span className="text-sm">{v ? formatDateTime(v as string) : '-'}</span>,
        },
    ]

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                        <ShoppingBag className="h-6 w-6" /> Ordenes de marketplace
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Pedidos recibidos de canales externos</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
                <Select value={connectionFilter || '__all__'} onValueChange={(v) => setConnectionFilter(v === '__all__' ? '' : v)}>
                    <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Todas las conexiones" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__all__">Todas las conexiones</SelectItem>
                        {connections.map(c => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={statusFilter || '__all__'} onValueChange={(v) => setStatusFilter(v === '__all__' ? '' : v)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__all__">Todos los estados</SelectItem>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="pagado">Pagada</SelectItem>
                        <SelectItem value="enviado">Enviada</SelectItem>
                        <SelectItem value="entregado">Entregada</SelectItem>
                        <SelectItem value="cancelado">Cancelada</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <DataTable
                data={orders}
                columns={columns}
                pagination={pagination}
                onPageChange={(p) => fetchOrders(p)}
                isLoading={loading}
                emptyMessage="No se encontraron ordenes"
                actions={(row) => (
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => viewDetail(row)}>
                            <Eye className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            />

            {/* Modal detalle */}
            <Dialog open={showDetail} onOpenChange={setShowDetail}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            Orden {selectedOrder?.marketplace_order_id}
                            {selectedOrder && (
                                <Badge variant={statusMap[selectedOrder.estado]?.variant}>
                                    {statusMap[selectedOrder.estado]?.label}
                                </Badge>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedOrder?.connection?.nombre} — {selectedOrder?.buyer_nombre}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><span className="text-muted-foreground">Comprador:</span> {selectedOrder.buyer_nombre}</div>
                                {selectedOrder.buyer_email && (
                                    <div><span className="text-muted-foreground">Email:</span> {selectedOrder.buyer_email}</div>
                                )}
                                {selectedOrder.buyer_telefono && (
                                    <div><span className="text-muted-foreground">Teléfono:</span> {selectedOrder.buyer_telefono}</div>
                                )}
                                <div><span className="text-muted-foreground">Fecha:</span> {formatDateTime(selectedOrder.createdAt)}</div>
                                {selectedOrder.sale_id && (
                                    <div><span className="text-muted-foreground">Venta interna:</span> #{selectedOrder.sale_id}</div>
                                )}
                            </div>

                            <Separator />
                            <div className="flex justify-between font-bold">
                                <span>Total</span>
                                <span>{formatCurrency(selectedOrder.total)}</span>
                            </div>

                            {/* Acciones de estado */}
                            {selectedOrder.estado === 'pendiente' && (
                                <>
                                    <Separator />
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => updateStatus(selectedOrder.id, 'pagado')}>
                                            Marcar como pagada
                                        </Button>
                                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => updateStatus(selectedOrder.id, 'cancelado')}>
                                            Cancelar
                                        </Button>
                                    </div>
                                </>
                            )}
                            {selectedOrder.estado === 'pagado' && (
                                <>
                                    <Separator />
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={() => updateStatus(selectedOrder.id, 'enviado')}>
                                            Marcar como enviada
                                        </Button>
                                    </div>
                                </>
                            )}
                            {selectedOrder.estado === 'enviado' && (
                                <>
                                    <Separator />
                                    <Button size="sm" onClick={() => updateStatus(selectedOrder.id, 'entregado')}>
                                        Marcar como entregada
                                    </Button>
                                </>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDetail(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
