'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/use-api'
import { toast } from '@/hooks/use-toast'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { EmptyState } from '@/components/common/EmptyState'
import { Pagination as PaginationCtl } from '@/components/common/Pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { PageHead } from '@/components/common/PageHead'
import { useScreenActions } from '@/components/command/screen-actions'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { Plus, Eye, Send, Check, XCircle, Truck } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { PurchaseOrder, Supplier, Pagination } from '@/types'

const statusMap: Record<string, { label: string; variant: 'secondary' | 'default' | 'warning' | 'success' | 'destructive' }> = {
    draft: { label: 'Borrador', variant: 'secondary' },
    sent: { label: 'Enviada', variant: 'default' },
    partial: { label: 'Parcial', variant: 'warning' },
    received: { label: 'Recibida', variant: 'success' },
    cancelled: { label: 'Cancelada', variant: 'destructive' },
}

export default function ComprasPage() {
    const api = useApi()
    const router = useRouter()
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

    useScreenActions({
        primary: { label: 'Nueva orden', icon: Plus, run: () => router.push('/compras/nueva') },
    }, [])

    return (
        <div>
            <PageHead title="Compras" sub={`${pagination.totalItems} ${pagination.totalItems === 1 ? 'orden de compra' : 'órdenes de compra'}`}>
                <Link href="/compras/nueva">
                    <Button><Plus className="mr-2 h-[15px] w-[15px]" /> Nueva orden</Button>
                </Link>
            </PageHead>

            <div className="mb-3.5 flex flex-wrap gap-2.5">
                <div className="w-[200px]">
                    <Select value={statusFilter || '__all__'} onValueChange={v => setStatusFilter(v === '__all__' ? '' : v)}>
                        <SelectTrigger><SelectValue placeholder="Todos los estados" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">Todos los estados</SelectItem>
                            {Object.entries(statusMap).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="w-[220px]">
                    <Select value={supplierFilter || '__all__'} onValueChange={v => setSupplierFilter(v === '__all__' ? '' : v)}>
                        <SelectTrigger><SelectValue placeholder="Todos los proveedores" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">Todos los proveedores</SelectItem>
                            {suppliers.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {loading ? (
                <div className="h-64 animate-pulse rounded-xl border bg-muted/30" />
            ) : orders.length === 0 ? (
                <EmptyState icon={Truck} title="Sin órdenes" description="No hay órdenes de compra que coincidan con el filtro." />
            ) : (
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Orden</TableHead>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Proveedor</TableHead>
                                <TableHead>Ítems</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="w-px text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.map(o => {
                                const s = statusMap[o.status]
                                return (
                                    <TableRow key={o.id}>
                                        <TableCell className="font-mono text-xs font-medium tabular-nums">{o.order_number || `OC-${o.id}`}</TableCell>
                                        <TableCell className="tabular-nums text-muted-foreground">{o.createdAt ? formatDate(o.createdAt) : '—'}</TableCell>
                                        <TableCell>{o.supplier?.name || '—'}</TableCell>
                                        <TableCell className="tabular-nums">{o.items?.length ?? '—'}</TableCell>
                                        <TableCell className="tabular-nums">{formatCurrency(o.total)}</TableCell>
                                        <TableCell>{s ? <Badge variant={s.variant}>{s.label}</Badge> : <Badge>{o.status}</Badge>}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Ver detalle" onClick={() => viewDetail(o)}><Eye className="h-4 w-4" /></Button>
                                                {o.status === 'draft' && <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" title="Enviar" onClick={() => sendOrder(o.id)}><Send className="h-4 w-4" /></Button>}
                                                {(o.status === 'sent' || o.status === 'partial') && <Button variant="ghost" size="icon" className="h-8 w-8 text-success" title="Recibir" onClick={() => openReceive(o)}><Check className="h-4 w-4" /></Button>}
                                                {(o.status === 'draft' || o.status === 'sent') && <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Cancelar" onClick={() => cancelOrder(o.id)}><XCircle className="h-4 w-4" /></Button>}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {!loading && orders.length > 0 && (
                <div className="mt-3.5">
                    <PaginationCtl currentPage={pagination.currentPage} totalPages={pagination.totalPages} totalItems={pagination.totalItems} perPage={pagination.perPage} onPageChange={fetchOrders} />
                </div>
            )}

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
