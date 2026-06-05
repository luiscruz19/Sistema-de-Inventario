'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/use-api'
import { toast } from '@/hooks/use-toast'
import { DataTable, type Column } from '@/components/common/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDateTime } from '@/lib/utils'
import { Plus, Hash, Upload } from 'lucide-react'
import type { Pagination } from '@/types'

type SerialStatus = 'available' | 'sold' | 'returned' | 'decommissioned'

type Serial = {
    id: number
    serial_number: string
    product_id: number
    product?: { name: string }
    batch_id?: number
    batch?: { batch_number: string }
    status: SerialStatus
    customer_id?: number
    customer?: { name: string }
    sold_at?: string
    createdAt: string
}

type SerialForm = {
    serial_number: string
    product_id: string
    batch_id: string
}

const emptyForm: SerialForm = { serial_number: '', product_id: '', batch_id: '' }

const statusMap: Record<SerialStatus, { label: string; variant: 'success' | 'secondary' | 'warning' | 'destructive' }> = {
    available: { label: 'Disponible', variant: 'success' },
    sold: { label: 'Vendido', variant: 'secondary' },
    returned: { label: 'Devuelto', variant: 'warning' },
    decommissioned: { label: 'Baja', variant: 'destructive' },
}

export default function NumerosSeriesPage() {
    const api = useApi()
    const [serials, setSerials] = useState<Serial[]>([])
    const [pagination, setPagination] = useState<Pagination>({ totalItems: 0, totalPages: 0, currentPage: 1, perPage: 20 })
    const [loading, setLoading] = useState(true)
    const [productFilter, setProductFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [showBulkModal, setShowBulkModal] = useState(false)
    const [form, setForm] = useState<SerialForm>(emptyForm)
    const [bulkProductId, setBulkProductId] = useState('')
    const [bulkBatchId, setBulkBatchId] = useState('')
    const [bulkSerials, setBulkSerials] = useState('')
    const [saving, setSaving] = useState(false)

    const fetchSerials = useCallback(async (page = 1) => {
        setLoading(true)
        const params: Record<string, string> = { page: String(page), limit: '20' }
        if (productFilter) params.product_id = productFilter
        if (statusFilter) params.status = statusFilter
        const res = await api.get<Serial[]>('/serials', params)
        if (res.status === 1 && res.data) {
            setSerials(Array.isArray(res.data) ? res.data : [])
            if (res.pagination) setPagination(res.pagination)
        }
        setLoading(false)
    }, [api, productFilter, statusFilter])

    useEffect(() => { fetchSerials() }, [fetchSerials])

    const handleSave = async () => {
        if (!form.serial_number.trim() || !form.product_id) {
            toast({ title: 'N° de serie y producto son obligatorios', variant: 'destructive' })
            return
        }
        setSaving(true)
        const res = await api.post('/serials', {
            serial_number: form.serial_number,
            product_id: Number(form.product_id),
            batch_id: form.batch_id ? Number(form.batch_id) : undefined,
        })
        if (res.status === 1) {
            toast({ title: 'Serie creada', variant: 'success' })
            setShowModal(false)
            setForm(emptyForm)
            fetchSerials(pagination.currentPage)
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
        setSaving(false)
    }

    const handleBulkSave = async () => {
        if (!bulkProductId || !bulkSerials.trim()) {
            toast({ title: 'Producto y lista de series son obligatorios', variant: 'destructive' })
            return
        }
        const serialList = bulkSerials.split('\n').map(s => s.trim()).filter(Boolean)
        if (serialList.length === 0) {
            toast({ title: 'Ingresa al menos una serie', variant: 'destructive' })
            return
        }
        setSaving(true)
        const res = await api.post('/serials/bulk', {
            product_id: Number(bulkProductId),
            batch_id: bulkBatchId ? Number(bulkBatchId) : undefined,
            serials: serialList,
        })
        if (res.status === 1) {
            toast({ title: `${serialList.length} series cargadas`, variant: 'success' })
            setShowBulkModal(false)
            setBulkSerials('')
            setBulkProductId('')
            setBulkBatchId('')
            fetchSerials(pagination.currentPage)
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
        setSaving(false)
    }

    const columns: Column<Serial>[] = [
        {
            key: 'serial_number',
            label: 'N° Serie',
            render: (v) => <span className="font-mono font-semibold text-sm">{v as string}</span>,
        },
        {
            key: 'product',
            label: 'Producto',
            render: (_, row) => <span className="font-medium">{row.product?.name || `#${row.product_id}`}</span>,
        },
        {
            key: 'batch',
            label: 'Lote',
            render: (_, row) => <span className="text-sm text-gray-500">{row.batch?.batch_number || '-'}</span>,
        },
        {
            key: 'status',
            label: 'Estado',
            render: (v) => {
                const s = statusMap[v as SerialStatus]
                return s ? <Badge variant={s.variant}>{s.label}</Badge> : <Badge variant="secondary">{v as string}</Badge>
            },
        },
        {
            key: 'customer',
            label: 'Cliente',
            render: (_, row) => <span className="text-sm">{row.customer?.name || '-'}</span>,
        },
        {
            key: 'sold_at',
            label: 'Fecha venta',
            render: (v) => v ? <span className="text-sm">{formatDateTime(v as string)}</span> : <span className="text-gray-400 text-sm">-</span>,
        },
    ]

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Hash className="h-6 w-6" /> Numeros de serie
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">Trazabilidad por numero de serie individual</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowBulkModal(true)}>
                        <Upload className="h-4 w-4 mr-2" /> Carga masiva
                    </Button>
                    <Button onClick={() => { setForm(emptyForm); setShowModal(true) }}>
                        <Plus className="h-4 w-4 mr-2" /> Nueva serie
                    </Button>
                </div>
            </div>

            <div className="flex gap-3 mb-4">
                <Input
                    placeholder="Filtrar por ID de producto..."
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    className="w-[220px]"
                />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="">Todos los estados</SelectItem>
                        <SelectItem value="available">Disponible</SelectItem>
                        <SelectItem value="sold">Vendido</SelectItem>
                        <SelectItem value="returned">Devuelto</SelectItem>
                        <SelectItem value="decommissioned">Baja</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <DataTable
                data={serials}
                columns={columns}
                pagination={pagination}
                onPageChange={(p) => fetchSerials(p)}
                isLoading={loading}
                emptyMessage="No se encontraron series"
            />

            {/* Modal individual */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nueva serie</DialogTitle>
                        <DialogDescription>Registra un numero de serie individual</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>N° de serie *</Label>
                            <Input value={form.serial_number} onChange={(e) => setForm(f => ({ ...f, serial_number: e.target.value }))} className="mt-1" autoFocus placeholder="Ej: SN-2026-00001" />
                        </div>
                        <div>
                            <Label>ID Producto *</Label>
                            <Input type="number" value={form.product_id} onChange={(e) => setForm(f => ({ ...f, product_id: e.target.value }))} className="mt-1" placeholder="ID del producto" />
                        </div>
                        <div>
                            <Label>ID Lote</Label>
                            <Input type="number" value={form.batch_id} onChange={(e) => setForm(f => ({ ...f, batch_id: e.target.value }))} className="mt-1" placeholder="Opcional" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Crear serie'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal carga masiva */}
            <Dialog open={showBulkModal} onOpenChange={setShowBulkModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Carga masiva de series</DialogTitle>
                        <DialogDescription>Una serie por linea</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>ID Producto *</Label>
                            <Input type="number" value={bulkProductId} onChange={(e) => setBulkProductId(e.target.value)} className="mt-1" placeholder="ID del producto" autoFocus />
                        </div>
                        <div>
                            <Label>ID Lote</Label>
                            <Input type="number" value={bulkBatchId} onChange={(e) => setBulkBatchId(e.target.value)} className="mt-1" placeholder="Opcional" />
                        </div>
                        <div>
                            <Label>Series (una por linea) *</Label>
                            <Textarea
                                value={bulkSerials}
                                onChange={(e) => setBulkSerials(e.target.value)}
                                className="mt-1 font-mono text-sm"
                                rows={8}
                                placeholder={"SN-0001\nSN-0002\nSN-0003"}
                            />
                            <p className="text-xs text-gray-400 mt-1">
                                {bulkSerials.split('\n').filter(s => s.trim()).length} series detectadas
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBulkModal(false)}>Cancelar</Button>
                        <Button onClick={handleBulkSave} disabled={saving}>{saving ? 'Cargando...' : 'Cargar series'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
