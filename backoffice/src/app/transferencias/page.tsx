'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/use-api'
import { toast } from '@/hooks/use-toast'
import { DataTable, type Column } from '@/components/common/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { ProductPicker } from '@/components/common/ProductPicker'
import { formatDateTime } from '@/lib/utils'
import { Plus, Eye, Trash2, Check, ArrowRight } from 'lucide-react'
import type { StockTransfer, StockTransferItem, Branch, Pagination } from '@/types'

const statusMap: Record<string, { label: string; variant: 'warning' | 'default' | 'success' | 'destructive' }> = {
    pending: { label: 'Pendiente', variant: 'warning' },
    in_transit: { label: 'En transito', variant: 'default' },
    received: { label: 'Recibida', variant: 'success' },
    cancelled: { label: 'Cancelada', variant: 'destructive' },
}

interface TransferItemForm { product_id: string; variant_id: string; quantity_sent: string }

export default function TransferenciasPage() {
    const api = useApi()
    const [transfers, setTransfers] = useState<StockTransfer[]>([])
    const [branches, setBranches] = useState<Branch[]>([])
    const [pagination, setPagination] = useState<Pagination>({ totalItems: 0, totalPages: 0, currentPage: 1, perPage: 20 })
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [showReceiveModal, setShowReceiveModal] = useState(false)
    const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null)
    const [createForm, setCreateForm] = useState({ from_branch_id: '', to_branch_id: '', notes: '', items: [] as TransferItemForm[] })
    const [receiveItems, setReceiveItems] = useState<{ id: number; quantity_received: string }[]>([])

    useEffect(() => {
        api.get<Branch[]>('/branches').then((br) => {
            if (br.status === 1 && br.data) setBranches(Array.isArray(br.data) ? br.data : [])
        })
    }, [api])

    const fetchTransfers = useCallback(async (page = 1) => {
        setLoading(true)
        const params: Record<string, string> = { page: String(page), limit: '20' }
        if (statusFilter) params.status = statusFilter
        const res = await api.get<StockTransfer[]>('/transfers', params)
        if (res.status === 1 && res.data) {
            setTransfers(Array.isArray(res.data) ? res.data : [])
            if (res.pagination) setPagination(res.pagination)
        }
        setLoading(false)
    }, [api, statusFilter])

    useEffect(() => { fetchTransfers() }, [fetchTransfers])

    const viewDetail = async (transfer: StockTransfer) => {
        const res = await api.get<StockTransfer>(`/transfers/${transfer.id}`)
        if (res.status === 1 && res.data) { setSelectedTransfer(res.data); setShowDetailModal(true) }
    }

    const openReceive = async (transfer: StockTransfer) => {
        const res = await api.get<StockTransfer>(`/transfers/${transfer.id}`)
        if (res.status === 1 && res.data) {
            setSelectedTransfer(res.data)
            setReceiveItems((res.data.items || []).map(i => ({ id: i.id, quantity_received: String(i.quantity_sent) })))
            setShowReceiveModal(true)
        }
    }

    const handleCreate = async () => {
        if (!createForm.from_branch_id || !createForm.to_branch_id || createForm.items.length === 0) {
            toast({ title: 'Completa todos los campos', variant: 'destructive' }); return
        }
        const res = await api.post('/transfers', {
            from_branch_id: Number(createForm.from_branch_id),
            to_branch_id: Number(createForm.to_branch_id),
            notes: createForm.notes,
            items: createForm.items.map(i => ({
                product_id: Number(i.product_id),
                variant_id: i.variant_id ? Number(i.variant_id) : null,
                quantity: Number(i.quantity_sent),
            })),
        })
        if (res.status === 1) {
            toast({ title: 'Transferencia creada', variant: 'success' })
            setShowCreateModal(false)
            setCreateForm({ from_branch_id: '', to_branch_id: '', notes: '', items: [] })
            fetchTransfers()
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    const handleReceive = async () => {
        if (!selectedTransfer) return
        const res = await api.put(`/transfers/${selectedTransfer.id}`, {
            status: 'received',
            items: receiveItems.map(i => ({ id: i.id, quantity_received: Number(i.quantity_received) })),
        })
        if (res.status === 1) {
            toast({ title: 'Transferencia recibida', variant: 'success' })
            setShowReceiveModal(false)
            fetchTransfers(pagination.currentPage)
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    const cancelTransfer = async (id: number) => {
        const res = await api.put(`/transfers/${id}`, { status: 'cancelled' })
        if (res.status === 1) { toast({ title: 'Transferencia cancelada', variant: 'success' }); fetchTransfers(pagination.currentPage) }
        else toast({ title: 'Error', description: res.message, variant: 'destructive' })
    }

    const addItem = () => setCreateForm(f => ({ ...f, items: [...f.items, { product_id: '', variant_id: '', quantity_sent: '1' }] }))
    const removeItem = (idx: number) => setCreateForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))

    const columns: Column<StockTransfer>[] = [
        { key: 'id', label: '#', render: (v) => <span className="font-mono">T-{v as number}</span> },
        { key: 'fromBranch', label: 'Origen', render: (_, row) => row.fromBranch?.name || '-' },
        { key: 'toBranch', label: 'Destino', render: (_, row) => row.toBranch?.name || '-' },
        { key: 'status', label: 'Estado', render: (v) => {
            const s = statusMap[v as string]
            return s ? <Badge variant={s.variant}>{s.label}</Badge> : <Badge>{v as string}</Badge>
        }},
        { key: 'items', label: 'Items', render: (_, row) => row.items?.length || '-' },
        { key: 'createdAt', label: 'Fecha', render: (v) => v ? formatDateTime(v as string) : '-' },
    ]

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Transferencias entre sucursales</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Movimientos de stock entre depositos</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}><Plus className="h-4 w-4 mr-2" /> Nueva transferencia</Button>
            </div>

            <DataTable
                data={transfers}
                columns={columns}
                pagination={pagination}
                onPageChange={(p) => fetchTransfers(p)}
                filters={[
                    { key: 'status', label: 'Estado', options: Object.entries(statusMap).map(([k, v]) => ({ value: k, label: v.label })) },
                ]}
                filterValues={{ status: statusFilter }}
                onFilterChange={(k, v) => { if (k === 'status') setStatusFilter(v) }}
                isLoading={loading}
                emptyMessage="Sin transferencias"
                actions={(row) => (
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => viewDetail(row)}><Eye className="h-4 w-4" /></Button>
                        {(row.status === 'pending' || row.status === 'in_transit') && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={() => openReceive(row)}><Check className="h-4 w-4" /></Button>
                        )}
                        {row.status === 'pending' && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => cancelTransfer(row.id)}><Trash2 className="h-4 w-4" /></Button>
                        )}
                    </div>
                )}
            />

            {/* Create Transfer Modal */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Nueva transferencia</DialogTitle>
                        <DialogDescription>Selecciona sucursales y productos</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex-1">
                                <Label>Origen</Label>
                                <Select value={createForm.from_branch_id} onValueChange={(v) => setCreateForm(f => ({ ...f, from_branch_id: v }))}>
                                    <SelectTrigger className="mt-1"><SelectValue placeholder="Sucursal origen" /></SelectTrigger>
                                    <SelectContent>{branches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground mt-6" />
                            <div className="flex-1">
                                <Label>Destino</Label>
                                <Select value={createForm.to_branch_id} onValueChange={(v) => setCreateForm(f => ({ ...f, to_branch_id: v }))}>
                                    <SelectTrigger className="mt-1"><SelectValue placeholder="Sucursal destino" /></SelectTrigger>
                                    <SelectContent>{branches.filter(b => String(b.id) !== createForm.from_branch_id).map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        <Separator />
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label>Productos</Label>
                                <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Agregar</Button>
                            </div>
                            {createForm.items.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">Agrega productos a la transferencia</p>
                            ) : (
                                <div className="space-y-2">
                                    {createForm.items.map((item, idx) => (
                                        <div key={idx} className="flex items-end gap-2 p-3 bg-muted rounded-lg">
                                            <div className="flex-1">
                                                <Label className="mb-1 block text-xs">Producto</Label>
                                                <ProductPicker onChange={(p) => setCreateForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, product_id: p ? String(p.id) : '' } : it) }))} />
                                            </div>
                                            <div className="w-24">
                                                <Label className="text-xs">Cantidad</Label>
                                                <Input type="number" min={1} value={item.quantity_sent} onChange={(e) => setCreateForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, quantity_sent: e.target.value } : it) }))} className="mt-1 h-8" />
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(idx)}><Trash2 className="h-3 w-3" /></Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
                        <Button onClick={handleCreate}>Crear transferencia</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Detail Modal */}
            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Transferencia T-{selectedTransfer?.id}</DialogTitle>
                        <DialogDescription>Detalle de la transferencia</DialogDescription>
                    </DialogHeader>
                    {selectedTransfer && (
                        <div className="space-y-3 text-sm">
                            <div className="grid grid-cols-2 gap-2">
                                <div><span className="text-muted-foreground">Origen:</span> {selectedTransfer.fromBranch?.name}</div>
                                <div><span className="text-muted-foreground">Destino:</span> {selectedTransfer.toBranch?.name}</div>
                                <div><span className="text-muted-foreground">Estado:</span> {statusMap[selectedTransfer.status]?.label}</div>
                                <div><span className="text-muted-foreground">Fecha:</span> {selectedTransfer.createdAt ? formatDateTime(selectedTransfer.createdAt) : '-'}</div>
                            </div>
                            {selectedTransfer.notes && <p className="text-muted-foreground">Notas: {selectedTransfer.notes}</p>}
                            <Separator />
                            <div className="space-y-2">
                                {selectedTransfer.items?.map(item => (
                                    <div key={item.id} className="flex justify-between">
                                        <span>{item.product?.name} {item.variant ? `(${item.variant.name})` : ''}</span>
                                        <span>Enviado: {item.quantity_sent} / Recibido: {item.quantity_received}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <DialogFooter><Button variant="outline" onClick={() => setShowDetailModal(false)}>Cerrar</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Receive Modal */}
            <Dialog open={showReceiveModal} onOpenChange={setShowReceiveModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Recibir transferencia</DialogTitle>
                        <DialogDescription>Ingresa las cantidades recibidas</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        {selectedTransfer?.items?.map((item, idx) => (
                            <div key={item.id} className="flex items-center justify-between gap-3">
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{item.product?.name}</p>
                                    <p className="text-xs text-muted-foreground">Enviado: {item.quantity_sent}</p>
                                </div>
                                <div className="w-24">
                                    <Input
                                        type="number"
                                        min={0}
                                        max={item.quantity_sent}
                                        value={receiveItems[idx]?.quantity_received || ''}
                                        onChange={(e) => setReceiveItems(prev => prev.map((ri, i) => i === idx ? { ...ri, quantity_received: e.target.value } : ri))}
                                        className="h-8"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowReceiveModal(false)}>Cancelar</Button>
                        <Button variant="success" onClick={handleReceive}><Check className="h-4 w-4 mr-1" /> Confirmar recepcion</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
