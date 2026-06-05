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
import { Eye, ShoppingBag, PackageCheck } from 'lucide-react'
import type { Pagination } from '@/types'

type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'

type MarketplaceOrderItem = {
    id: number
    external_item_id: string
    title: string
    quantity: number
    unit_price: number
    subtotal: number
}

type MarketplaceOrder = {
    id: number
    connection_id: number
    connection?: { name: string; platform: string }
    external_order_id: string
    buyer_name: string
    buyer_email?: string
    total: number
    status: OrderStatus
    internal_sale_id?: number
    items?: MarketplaceOrderItem[]
    createdAt: string
}

const statusMap: Record<OrderStatus, { label: string; variant: 'warning' | 'success' | 'secondary' | 'destructive' }> = {
    pending: { label: 'Pendiente', variant: 'warning' },
    confirmed: { label: 'Confirmada', variant: 'success' },
    shipped: { label: 'Enviada', variant: 'secondary' },
    delivered: { label: 'Entregada', variant: 'success' },
    cancelled: { label: 'Cancelada', variant: 'destructive' },
    refunded: { label: 'Reembolsada', variant: 'destructive' },
}

export default function MarketplaceOrdenesPage() {
    const api = useApi()
    const [orders, setOrders] = useState<MarketplaceOrder[]>([])
    const [connections, setConnections] = useState<{ id: number; name: string }[]>([])
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
        if (statusFilter) params.status = statusFilter
        const res = await api.get<MarketplaceOrder[]>('/marketplace-orders', params)
        if (res.status === 1 && res.data) {
            setOrders(Array.isArray(res.data) ? res.data : [])
            if (res.pagination) setPagination(res.pagination)
        }
        setLoading(false)
    }, [api, connectionFilter, statusFilter])

    const fetchConnections = useCallback(async () => {
        const res = await api.get<{ id: number; name: string }[]>('/marketplace-connections', { limit: '100' })
        if (res.status === 1 && res.data) setConnections(Array.isArray(res.data) ? res.data : [])
    }, [api])

    useEffect(() => { fetchOrders() }, [fetchOrders])
    useEffect(() => { fetchConnections() }, [fetchConnections])

    const viewDetail = async (order: MarketplaceOrder) => {
        const res = await api.get<MarketplaceOrder>(`/marketplace-orders/${order.id}`)
        if (res.status === 1 && res.data) setSelectedOrder(res.data)
        else setSelectedOrder(order)
        setShowDetail(true)
    }

    const updateStatus = async (id: number, status: OrderStatus) => {
        const res = await api.put(`/marketplace-orders/${id}`, { status })
        if (res.status === 1) {
            toast({ title: 'Estado actualizado', variant: 'success' })
            fetchOrders(pagination.currentPage)
            if (selectedOrder?.id === id) setSelectedOrder(prev => prev ? { ...prev, status } : null)
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    const generateInternalSale = async (id: number) => {
        if (!confirm('Generar venta interna a partir de esta orden?')) return
        const res = await api.post(`/marketplace-orders/${id}/generate-sale`, {})
        if (res.status === 1) {
            toast({ title: 'Venta interna generada', variant: 'success' })
            fetchOrders(pagination.currentPage)
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    const columns: Column<MarketplaceOrder>[] = [
        {
            key: 'connection',
            label: 'Marketplace',
            render: (_, row) => <span className="text-sm font-medium">{row.connection?.name || `#${row.connection_id}`}</span>,
        },
        {
            key: 'external_order_id',
            label: 'N° Orden',
            render: (v) => <span className="font-mono text-sm font-semibold">{v as string}</span>,
        },
        {
            key: 'buyer_name',
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
            key: 'status',
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
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ShoppingBag className="h-6 w-6" /> Ordenes de marketplace
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">Pedidos recibidos de canales externos</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
                <Select value={connectionFilter} onValueChange={setConnectionFilter}>
                    <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Todas las conexiones" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="">Todas las conexiones</SelectItem>
                        {connections.map(c => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="">Todos los estados</SelectItem>
                        <SelectItem value="pending">Pendiente</SelectItem>
                        <SelectItem value="confirmed">Confirmada</SelectItem>
                        <SelectItem value="shipped">Enviada</SelectItem>
                        <SelectItem value="delivered">Entregada</SelectItem>
                        <SelectItem value="cancelled">Cancelada</SelectItem>
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
                        {!row.internal_sale_id && row.status === 'confirmed' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-600" title="Generar venta interna" onClick={() => generateInternalSale(row.id)}>
                                <PackageCheck className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                )}
            />

            {/* Modal detalle */}
            <Dialog open={showDetail} onOpenChange={setShowDetail}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            Orden {selectedOrder?.external_order_id}
                            {selectedOrder && (
                                <Badge variant={statusMap[selectedOrder.status]?.variant}>
                                    {statusMap[selectedOrder.status]?.label}
                                </Badge>
                            )}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedOrder?.connection?.name} — {selectedOrder?.buyer_name}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedOrder && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div><span className="text-gray-500">Comprador:</span> {selectedOrder.buyer_name}</div>
                                {selectedOrder.buyer_email && (
                                    <div><span className="text-gray-500">Email:</span> {selectedOrder.buyer_email}</div>
                                )}
                                <div><span className="text-gray-500">Fecha:</span> {formatDateTime(selectedOrder.createdAt)}</div>
                                {selectedOrder.internal_sale_id && (
                                    <div><span className="text-gray-500">Venta interna:</span> #{selectedOrder.internal_sale_id}</div>
                                )}
                            </div>

                            {selectedOrder.items && selectedOrder.items.length > 0 && (
                                <>
                                    <Separator />
                                    <div>
                                        <p className="font-medium text-sm mb-2">Items</p>
                                        {selectedOrder.items.map((item) => (
                                            <div key={item.id} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                                                <span>{item.title} x{item.quantity}</span>
                                                <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between font-bold mt-2 pt-2">
                                            <span>Total</span>
                                            <span>{formatCurrency(selectedOrder.total)}</span>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* Acciones de estado */}
                            {selectedOrder.status === 'pending' && (
                                <>
                                    <Separator />
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => updateStatus(selectedOrder.id, 'confirmed')}>
                                            Confirmar orden
                                        </Button>
                                        <Button size="sm" variant="outline" className="text-red-500" onClick={() => updateStatus(selectedOrder.id, 'cancelled')}>
                                            Cancelar
                                        </Button>
                                    </div>
                                </>
                            )}
                            {selectedOrder.status === 'confirmed' && (
                                <>
                                    <Separator />
                                    <div className="flex gap-2">
                                        <Button size="sm" onClick={() => updateStatus(selectedOrder.id, 'shipped')}>
                                            Marcar como enviada
                                        </Button>
                                        {!selectedOrder.internal_sale_id && (
                                            <Button size="sm" variant="outline" onClick={() => generateInternalSale(selectedOrder.id)}>
                                                <PackageCheck className="h-4 w-4 mr-1" /> Generar venta interna
                                            </Button>
                                        )}
                                    </div>
                                </>
                            )}
                            {selectedOrder.status === 'shipped' && (
                                <>
                                    <Separator />
                                    <Button size="sm" onClick={() => updateStatus(selectedOrder.id, 'delivered')}>
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
