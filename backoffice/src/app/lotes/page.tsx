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
import { formatDateTime } from '@/lib/utils'
import { Plus, Package2 } from 'lucide-react'
import type { Pagination } from '@/types'

type BatchStatus = 'ok' | 'expiring_soon' | 'expired'

type Batch = {
    id: number
    batch_number: string
    product_id: number
    product?: { name: string }
    variant_id?: number
    initial_quantity: number
    current_quantity: number
    expiration_date?: string
    manufacture_date?: string
    supplier?: string
    notes?: string
    createdAt: string
}

type BatchForm = {
    batch_number: string
    product_id: string
    variant_id: string
    initial_quantity: string
    expiration_date: string
    manufacture_date: string
    supplier: string
    notes: string
}

const emptyForm: BatchForm = {
    batch_number: '',
    product_id: '',
    variant_id: '',
    initial_quantity: '',
    expiration_date: '',
    manufacture_date: '',
    supplier: '',
    notes: '',
}

function getBatchStatus(batch: Batch): BatchStatus {
    if (!batch.expiration_date) return 'ok'
    const exp = new Date(batch.expiration_date)
    const now = new Date()
    const diffDays = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays < 0) return 'expired'
    if (diffDays < 30) return 'expiring_soon'
    return 'ok'
}

const statusMap: Record<BatchStatus, { label: string; variant: 'destructive' | 'warning' | 'success' }> = {
    expired: { label: 'Vencido', variant: 'destructive' },
    expiring_soon: { label: 'Próx. a vencer', variant: 'warning' },
    ok: { label: 'OK', variant: 'success' },
}

export default function LotesPage() {
    const api = useApi()
    const [batches, setBatches] = useState<Batch[]>([])
    const [pagination, setPagination] = useState<Pagination>({ totalItems: 0, totalPages: 0, currentPage: 1, perPage: 20 })
    const [loading, setLoading] = useState(true)
    const [productFilter, setProductFilter] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState<BatchForm>(emptyForm)
    const [saving, setSaving] = useState(false)

    const fetchBatches = useCallback(async (page = 1) => {
        setLoading(true)
        const params: Record<string, string> = { page: String(page), limit: '20' }
        if (productFilter) params.product_id = productFilter
        const res = await api.get<Batch[]>('/batches', params)
        if (res.status === 1 && res.data) {
            setBatches(Array.isArray(res.data) ? res.data : [])
            if (res.pagination) setPagination(res.pagination)
        }
        setLoading(false)
    }, [api, productFilter])

    useEffect(() => { fetchBatches() }, [fetchBatches])

    const handleSave = async () => {
        if (!form.batch_number.trim() || !form.product_id || !form.initial_quantity) {
            toast({ title: 'N° de lote, producto y cantidad son obligatorios', variant: 'destructive' })
            return
        }
        setSaving(true)
        const res = await api.post('/batches', {
            ...form,
            product_id: Number(form.product_id),
            variant_id: form.variant_id ? Number(form.variant_id) : undefined,
            initial_quantity: Number(form.initial_quantity),
            expiration_date: form.expiration_date || undefined,
            manufacture_date: form.manufacture_date || undefined,
        })
        if (res.status === 1) {
            toast({ title: 'Lote creado', variant: 'success' })
            setShowModal(false)
            setForm(emptyForm)
            fetchBatches(pagination.currentPage)
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
        setSaving(false)
    }

    const columns: Column<Batch>[] = [
        {
            key: 'batch_number',
            label: 'N° Lote',
            render: (v) => <span className="font-mono font-semibold text-sm">{v as string}</span>,
        },
        {
            key: 'product',
            label: 'Producto',
            render: (_, row) => <span className="font-medium">{row.product?.name || `#${row.product_id}`}</span>,
        },
        {
            key: 'current_quantity',
            label: 'Cant. actual / inicial',
            render: (_, row) => (
                <span className="text-sm">
                    <span className="font-semibold">{row.current_quantity}</span>
                    <span className="text-gray-400"> / {row.initial_quantity}</span>
                </span>
            ),
        },
        {
            key: 'expiration_date',
            label: 'Vencimiento',
            render: (v, row) => {
                if (!v) return <span className="text-gray-400 text-sm">-</span>
                const status = getBatchStatus(row)
                const s = statusMap[status]
                return (
                    <div className="flex items-center gap-2">
                        <span className="text-sm">{formatDateTime(v as string).split(' ')[0]}</span>
                        <Badge variant={s.variant}>{s.label}</Badge>
                    </div>
                )
            },
        },
        {
            key: 'supplier',
            label: 'Proveedor',
            render: (v) => <span className="text-sm text-gray-600">{(v as string) || '-'}</span>,
        },
    ]

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Package2 className="h-6 w-6" /> Lotes / Batches
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">Trazabilidad por lote de fabricacion</p>
                </div>
                <Button onClick={() => setShowModal(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Nuevo lote
                </Button>
            </div>

            <div className="flex gap-3 mb-4">
                <Input
                    placeholder="Filtrar por ID de producto..."
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    className="w-[220px]"
                />
            </div>

            <DataTable
                data={batches}
                columns={columns}
                pagination={pagination}
                onPageChange={(p) => fetchBatches(p)}
                isLoading={loading}
                emptyMessage="No se encontraron lotes"
            />

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Nuevo lote</DialogTitle>
                        <DialogDescription>Registra un nuevo lote de producto</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Label>N° de lote *</Label>
                            <Input value={form.batch_number} onChange={(e) => setForm(f => ({ ...f, batch_number: e.target.value }))} className="mt-1" autoFocus placeholder="Ej: LOT-2026-001" />
                        </div>
                        <div>
                            <Label>ID Producto *</Label>
                            <Input type="number" value={form.product_id} onChange={(e) => setForm(f => ({ ...f, product_id: e.target.value }))} className="mt-1" placeholder="ID del producto" />
                        </div>
                        <div>
                            <Label>ID Variante</Label>
                            <Input type="number" value={form.variant_id} onChange={(e) => setForm(f => ({ ...f, variant_id: e.target.value }))} className="mt-1" placeholder="Opcional" />
                        </div>
                        <div>
                            <Label>Cantidad inicial *</Label>
                            <Input type="number" min={1} value={form.initial_quantity} onChange={(e) => setForm(f => ({ ...f, initial_quantity: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                            <Label>Proveedor</Label>
                            <Input value={form.supplier} onChange={(e) => setForm(f => ({ ...f, supplier: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                            <Label>Fecha de fabricacion</Label>
                            <Input type="date" value={form.manufacture_date} onChange={(e) => setForm(f => ({ ...f, manufacture_date: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                            <Label>Fecha de vencimiento</Label>
                            <Input type="date" value={form.expiration_date} onChange={(e) => setForm(f => ({ ...f, expiration_date: e.target.value }))} className="mt-1" />
                        </div>
                        <div className="col-span-2">
                            <Label>Observaciones</Label>
                            <Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" rows={2} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Crear lote'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
