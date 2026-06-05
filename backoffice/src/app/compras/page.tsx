'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/use-api'
import { toast } from '@/hooks/use-toast'
import { DataTable, type Column } from '@/components/common/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { Plus, Eye, Send, Check, XCircle } from 'lucide-react'
import Link from 'next/link'
import type { PurchaseOrder, PurchaseOrderItem, Supplier, Pagination } from '@/types'

const statusMap: Record<string, { label: string; variant: 'secondary' | 'default' | 'warning' | 'success' | 'destructive' }> = {
    draft: { label: 'Borrador', variant: 'secondary' },
    sent: { label: 'Enviada', variant: 'default' },
    partial: { label: 'Parcial', variant: 'warning' },
    received: { label: 'Recibida', variant: 'success' },
    cancelled: { label: 'Cancelada', variant: 'destructive' },
}

export default function ComprasPage() {
    const api = useApi()
    const [orders, setOrders] = useState<PurchaseOrder[]>([])
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [pagination, setPagination] = useState<Pagination>({ totalItems: 0, totalPages: 0, currentPage: 1, perPage: 20 })
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('')
    const [supplierFilter, setSupplierFilter] = useState('')
    const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [showReceiveModal, setShowReceiveModal] = useState(false)
    const [receiveItems, setReceiveItems] = useState<{ id: number; quantity_received: string }[]>([])

    useEffect(() => {
        api.get<Supplier[]>('/suppliers', { limit: '200' }).then(res => {
            if (res.status === 1 && res.data) setSuppliers(Array.isArray(res.data) ? res.data : [])
        })
    }, [api])

    const fetchOrders = useCallback(async (page = 1) => {
        setLoading(true)
        const params: Record<string, string> = { page: String(page), limit: '20' }
        if (statusFilter) params.status = statusFilter
        if (supplierFilter) params.supplier_id = supplierFilter
        const res = await api.get<PurchaseOrder[]>('/purchase-orders', params)
        if (res.status === 1 && res.data) {
            setOrders(Array.isArray(res.data) ? res.data : [])
            if (res.pagination) setPagination(res.pagination)
        }
        setLoading(false)
    }, [api, statusFilter, supplierFilter])

    useEffect(() => { fetchOrders() }, [fetchOrders])

    const viewDetail = async (order: PurchaseOrder) => {
        const res = await api.get<PurchaseOrder>(`/purchase-orders/${order.id}`)
        if (res.status === 1 && res.data) { setSelectedOrder(res.data); setShowDetailModal(true) }
    }

    const sendOrder = async (id: number) => {
        const res = await api.put(`/purchase-orders/${id}`, { status: 'sent' })
        if (res.status === 1) { toast({ title: 'Orden enviada', variant: 'success' }); fetchOrders(pagination.currentPage) }
        else toast({ title: 'Error', description: res.message, variant: 'destructive' })
    }

    const cancelOrder = async (id: number) => {
        const res = await api.put(`/purchase-orders/${id}`, { status: 'cancelled' })
        if (res.status === 1) { toast({ title: 'Orden cancelada', variant: 'success' }); fetchOrders(pagination.currentPage) }
        else toast({ title: 'Error', description: res.message, variant: 'destructive' })
    }

    const openReceive = (order: PurchaseOrder) => {
        setSelectedOrder(order)
        setReceiveItems((order.items || []).map(i => ({ id: i.id, quantity_received: String(i.quantity_ordered - i.quantity_received) })))
        setShowReceiveModal(true)
    }

    const handleReceive = async () => {
        if (!selectedOrder) return
        const res = await api.put(`/purchase-orders/${selectedOrder.id}`, {
            status: 'received',
            items: receiveItems.map(i => ({ id: i.id, quantity_received: Number(i.quantity_received) })),
        })
        if (res.status === 1) {
            toast({ title: 'Orden recibida', variant: 'success' })
            setShowReceiveModal(false); fetchOrders(pagination.currentPage)
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    const columns: Column<PurchaseOrder>[] = [
        { key: 'order_number', label: 'Nro', sortable: true, render: (v, row) => <span className="font-medium font-mono">{(v as string) || `OC-${row.id}`}</span> },
        { key: 'supplier', label: 'Proveedor', render: (_, row) => row.supplier?.name || '-' },
        { key: 'branch', label: 'Sucursal', render: (_, row) => row.branch?.name || '-' },
        { key: 'total', label: 'Total', sortable: true, render: (v) => <span className="font-semibold">{formatCurrency(v as number)}</span> },
        { key: 'status', label: 'Estado', render: (v) => {
            const s = statusMap[v as string]
            return s ? <Badge variant={s.variant}>{s.label}</Badge> : <Badge>{v as string}</Badge>
        }},
        { key: 'expected_date', label: 'Fecha esperada', render: (v) => v ? formatDate(v as string) : '-' },
    ]

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Ordenes de Compra</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Pedidos a proveedores y recepcion de mercaderia</p>
                </div>
                <Link href="/inventario/compras/nueva">
                    <Button><Plus className="h-4 w-4 mr-2" /> Nueva orden</Button>
                </Link>
            </div>

            <DataTable
                data={orders} columns={columns} pagination={pagination}
                onPageChange={(p) => fetchOrders(p)} isLoading={loading} emptyMessage="No se encontraron ordenes"
                filters={[
                    { key: 'status', label: 'Estado', options: Object.entries(statusMap).map(([k, v]) => ({ value: k, label: v.label })) },
                    { key: 'supplier', label: 'Proveedor', options: suppliers.map(s => ({ value: String(s.id), label: s.name })) },
                ]}
                filterValues={{ status: statusFilter, supplier: supplierFilter }}
                onFilterChange={(k, v) => { if (k === 'status') setStatusFilter(v); if (k === 'supplier') setSupplierFilter(v) }}
                actions={(row) => (
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => viewDetail(row)}><Eye className="h-4 w-4" /></Button>
                        {row.status === 'draft' && <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" onClick={() => sendOrder(row.id)}><Send className="h-4 w-4" /></Button>}
                        {(row.status === 'sent' || row.status === 'partial') && <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={() => openReceive(row)}><Check className="h-4 w-4" /></Button>}
                        {(row.status === 'draft' || row.status === 'sent') && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => cancelOrder(row.id)}><XCircle className="h-4 w-4" /></Button>}
                    </div>
                )}
            />

            {/* Detail modal */}
            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader><DialogTitle>Orden {selectedOrder?.order_number || `OC-${selectedOrder?.id}`}</DialogTitle><DialogDescription>Detalle de la orden</DialogDescription></DialogHeader>
                    {selectedOrder && (
                        <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                                <div><span className="text-muted-foreground">Proveedor:</span> {selectedOrder.supplier?.name}</div>
                                <div><span className="text-muted-foreground">Sucursal:</span> {selectedOrder.branch?.name}</div>
                                <div><span className="text-muted-foreground">Estado:</span> {statusMap[selectedOrder.status]?.label}</div>
                                <div><span className="text-muted-foreground">Fecha:</span> {selectedOrder.createdAt ? formatDateTime(selectedOrder.createdAt) : '-'}</div>
                            </div>
                            <Separator />
                            <div className="space-y-2">
                                {selectedOrder.items?.map(item => (
                                    <div key={item.id} className="flex justify-between">
                                        <div>
                                            <span>{item.product?.name || `#${item.product_id}`}</span>
                                            <span className="text-muted-foreground ml-2">x{item.quantity_ordered} ({item.quantity_received} recibidos)</span>
                                        </div>
                                        <span className="font-medium">{formatCurrency(item.subtotal)}</span>
                                    </div>
                                ))}
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold text-base"><span>Total</span><span>{formatCurrency(selectedOrder.total)}</span></div>
                        </div>
                    )}
                    <DialogFooter><Button variant="outline" onClick={() => setShowDetailModal(false)}>Cerrar</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Receive modal */}
            <Dialog open={showReceiveModal} onOpenChange={setShowReceiveModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>Recibir orden</DialogTitle><DialogDescription>Ingresa las cantidades recibidas</DialogDescription></DialogHeader>
                    <div className="space-y-3">
                        {selectedOrder?.items?.map((item, idx) => (
                            <div key={item.id} className="flex items-center gap-3">
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{item.product?.name}</p>
                                    <p className="text-xs text-muted-foreground">Pedido: {item.quantity_ordered} / Ya recibido: {item.quantity_received}</p>
                                </div>
                                <div className="w-24">
                                    <Input type="number" min={0} value={receiveItems[idx]?.quantity_received || ''} onChange={(e) => setReceiveItems(prev => prev.map((ri, i) => i === idx ? { ...ri, quantity_received: e.target.value } : ri))} className="h-8" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowReceiveModal(false)}>Cancelar</Button>
                        <Button variant="success" onClick={handleReceive}><Check className="h-4 w-4 mr-1" /> Confirmar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
