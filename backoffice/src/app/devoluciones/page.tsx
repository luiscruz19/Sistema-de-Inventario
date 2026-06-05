'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/use-api'
import { toast } from '@/hooks/use-toast'
import { DataTable, type Column } from '@/components/common/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { getRequestHeaders } from '@/utils/request-headers'
import { Plus, Eye, CheckCircle, XCircle, RotateCcw } from 'lucide-react'
import type { Pagination } from '@/types'

const API_BASE = '/inventario/api'

async function patchRequest(path: string) {
    const headers = getRequestHeaders()
    const res = await fetch(`${API_BASE}${path}`, { method: 'PATCH', headers: headers as Record<string, string> })
    return res.json()
}

type CreditNoteStatus = 'pending' | 'applied' | 'cancelled'

type CreditNoteItem = {
    id: number
    description: string
    quantity: number
    unit_price: number
    tax_rate: number
    subtotal: number
}

type CreditNote = {
    id: number
    number: string
    sale_id?: number
    reason: string
    status: CreditNoteStatus
    subtotal: number
    tax_amount: number
    total: number
    refund_method: string
    notes?: string
    created_by: number
    applied_at?: string
    cancelled_at?: string
    createdAt: string
    items?: CreditNoteItem[]
}

const statusMap: Record<CreditNoteStatus, { label: string; variant: 'default' | 'destructive' | 'secondary' }> = {
    pending: { label: 'Pendiente', variant: 'default' },
    applied: { label: 'Aplicada', variant: 'secondary' },
    cancelled: { label: 'Cancelada', variant: 'destructive' },
}

const refundMethodMap: Record<string, string> = {
    cash: 'Efectivo', credit_card: 'Tarjeta', transfer: 'Transferencia', store_credit: 'Crédito en cuenta', none: 'Sin reembolso',
}

const emptyItem = { description: '', quantity: 1, unit_price: 0, tax_rate: 0, subtotal: 0 }

export default function DevolucionesPage() {
    const api = useApi()
    const [notes, setNotes] = useState<CreditNote[]>([])
    const [pagination, setPagination] = useState<Pagination>({ totalItems: 0, totalPages: 0, currentPage: 1, perPage: 20 })
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [showDetail, setShowDetail] = useState(false)
    const [selected, setSelected] = useState<CreditNote | null>(null)
    const [saving, setSaving] = useState(false)

    // Formulario
    const [form, setForm] = useState({ reason: '', sale_id: '', refund_method: 'none', notes: '' })
    const [items, setItems] = useState([{ ...emptyItem }])

    const fetchNotes = useCallback(async (page = 1) => {
        setLoading(true)
        const res = await api.get<{ data: CreditNote[]; pagination: Pagination }>('/credit-notes', { page: String(page) })
        if (res.status > 0 && res.data) {
            setNotes(res.data.data || [])
            if (res.data.pagination) setPagination(res.data.pagination)
        } else {
            toast({ title: 'Error', description: 'No se pudieron cargar las notas de crédito', variant: 'destructive' })
        }
        setLoading(false)
    }, [api])

    useEffect(() => { fetchNotes() }, [fetchNotes])

    const addItem = () => setItems(prev => [...prev, { ...emptyItem }])
    const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))
    const updateItem = (i: number, field: string, value: string | number) => {
        setItems(prev => prev.map((item, idx) => {
            if (idx !== i) return item
            const updated = { ...item, [field]: value }
            updated.subtotal = Number(updated.quantity) * Number(updated.unit_price)
            return updated
        }))
    }

    const total = items.reduce((s, it) => s + it.subtotal + it.subtotal * (Number(it.tax_rate) / 100), 0)

    const createNote = async () => {
        if (!form.reason || items.length === 0 || items.some(it => !it.description || !it.unit_price)) {
            toast({ title: 'Completá todos los campos requeridos', variant: 'destructive' })
            return
        }
        setSaving(true)
        const res = await api.post<CreditNote>('/credit-notes', {
            reason: form.reason,
            sale_id: form.sale_id ? Number(form.sale_id) : undefined,
            refund_method: form.refund_method,
            notes: form.notes || undefined,
            items,
        })
        if (res.status > 0) {
            toast({ title: 'Nota de crédito creada', description: `${(res.data as CreditNote).number}` })
            setShowCreate(false)
            setForm({ reason: '', sale_id: '', refund_method: 'none', notes: '' })
            setItems([{ ...emptyItem }])
            fetchNotes()
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
        setSaving(false)
    }

    const applyNote = async (id: number) => {
        const res = await patchRequest(`/credit-notes/${id}/apply`)
        if (res.status > 0) { toast({ title: 'Nota de crédito aplicada' }); fetchNotes(); setShowDetail(false) }
        else toast({ title: 'Error', description: res.message, variant: 'destructive' })
    }

    const cancelNote = async (id: number) => {
        if (!confirm('¿Cancelar esta nota de crédito?')) return
        const res = await patchRequest(`/credit-notes/${id}/cancel`)
        if (res.status > 0) { toast({ title: 'Nota de crédito cancelada' }); fetchNotes(); setShowDetail(false) }
        else toast({ title: 'Error', description: res.message, variant: 'destructive' })
    }

    const openDetail = (note: CreditNote) => { setSelected(note); setShowDetail(true) }

    const columns: Column<CreditNote>[] = [
        { key: 'number', header: 'Número', render: (v) => <span className="font-mono font-semibold">{String(v)}</span> },
        { key: 'reason', header: 'Motivo', render: (v) => <span className="truncate max-w-[200px] block text-sm">{String(v)}</span> },
        { key: 'status', header: 'Estado', render: (_, row) => <Badge variant={statusMap[row.status]?.variant}>{statusMap[row.status]?.label}</Badge> },
        { key: 'refund_method', header: 'Forma', render: (v) => refundMethodMap[String(v)] || String(v) },
        { key: 'total', header: 'Total', render: (v) => <span className="font-semibold">{formatCurrency(Number(v))}</span> },
        { key: 'createdAt', header: 'Fecha', render: (v) => formatDateTime(String(v)) },
    ]

    const actions = [
        { icon: Eye, label: 'Ver', onClick: openDetail },
    ]

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold flex items-center gap-2"><RotateCcw className="h-5 w-5" /> Notas de crédito</h1>
                    <p className="text-sm text-gray-500 mt-0.5">Devoluciones y ajustes de ventas</p>
                </div>
                <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4 mr-1" /> Nueva devolución</Button>
            </div>

            <DataTable data={notes} columns={columns} actions={actions} loading={loading} pagination={pagination} onPageChange={fetchNotes} />

            {/* Modal crear nota de crédito */}
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Nueva nota de crédito</DialogTitle></DialogHeader>
                    <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label>Motivo *</Label>
                                <Input value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Ej: Producto defectuoso, error de cobro..." />
                            </div>
                            <div>
                                <Label>N° Venta original (opcional)</Label>
                                <Input type="number" value={form.sale_id} onChange={e => setForm(f => ({ ...f, sale_id: e.target.value }))} placeholder="ID de la venta" />
                            </div>
                            <div>
                                <Label>Forma de reembolso</Label>
                                <Select value={form.refund_method} onValueChange={v => setForm(f => ({ ...f, refund_method: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(refundMethodMap).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Separator />
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label>Ítems *</Label>
                                <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3.5 w-3.5 mr-1" /> Agregar ítem</Button>
                            </div>
                            <div className="space-y-2">
                                {items.map((item, i) => (
                                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                                        <Input className="col-span-4" placeholder="Descripción" value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                                        <Input className="col-span-2" type="number" min={0.001} step={0.001} placeholder="Cant." value={item.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                                        <Input className="col-span-2" type="number" min={0} placeholder="P. unitario" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} />
                                        <Input className="col-span-2" type="number" min={0} max={100} placeholder="IVA%" value={item.tax_rate} onChange={e => updateItem(i, 'tax_rate', e.target.value)} />
                                        <span className="col-span-1 text-sm font-medium text-right">{formatCurrency(item.subtotal)}</span>
                                        {items.length > 1 && <button onClick={() => removeItem(i)} className="col-span-1 text-gray-300 hover:text-red-500"><XCircle className="h-4 w-4" /></button>}
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end mt-3">
                                <span className="text-sm font-semibold">Total: {formatCurrency(total)}</span>
                            </div>
                        </div>

                        <div>
                            <Label>Notas internas</Label>
                            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Observaciones..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
                        <Button onClick={createNote} disabled={saving}>{saving ? 'Creando...' : 'Crear nota de crédito'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal detalle */}
            <Dialog open={showDetail} onOpenChange={setShowDetail}>
                <DialogContent className="max-w-lg">
                    {selected && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <span className="font-mono">{selected.number}</span>
                                    <Badge variant={statusMap[selected.status]?.variant}>{statusMap[selected.status]?.label}</Badge>
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-3 pt-2">
                                <p className="text-sm"><span className="font-medium">Motivo:</span> {selected.reason}</p>
                                {selected.sale_id && <p className="text-sm"><span className="font-medium">Venta:</span> #{selected.sale_id}</p>}
                                <p className="text-sm"><span className="font-medium">Reembolso:</span> {refundMethodMap[selected.refund_method]}</p>
                                <Separator />
                                {selected.items && selected.items.length > 0 && (
                                    <div>
                                        <p className="font-medium text-sm mb-2">Ítems:</p>
                                        {selected.items.map(it => (
                                            <div key={it.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                                                <span>{it.description} x{it.quantity}</span>
                                                <span className="font-medium">{formatCurrency(it.subtotal)}</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between text-sm font-semibold mt-2">
                                            <span>Total</span>
                                            <span>{formatCurrency(Number(selected.total))}</span>
                                        </div>
                                    </div>
                                )}
                                {selected.notes && <p className="text-xs text-gray-400">{selected.notes}</p>}
                            </div>
                            {selected.status === 'pending' && (
                                <DialogFooter className="gap-2">
                                    <Button variant="outline" size="sm" onClick={() => cancelNote(selected.id)} className="text-red-500 hover:text-red-700">
                                        <XCircle className="h-4 w-4 mr-1" /> Cancelar NC
                                    </Button>
                                    <Button size="sm" onClick={() => applyNote(selected.id)}>
                                        <CheckCircle className="h-4 w-4 mr-1" /> Aplicar
                                    </Button>
                                </DialogFooter>
                            )}
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
