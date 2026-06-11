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
import { formatCurrency } from '@/lib/utils'
import { Plus, CheckCircle, XCircle, Receipt } from 'lucide-react'
import type { Pagination } from '@/types'

type ChequeStatus = 'en_cartera' | 'depositado' | 'cobrado' | 'rechazado' | 'anulado' | 'endosado'
type ChequeType = 'emitido' | 'recibido'

type Cheque = {
    id: number
    numero: string
    banco: string
    tipo: ChequeType
    emisor?: string
    beneficiario?: string
    monto: number
    fecha_emision: string
    fecha_vencimiento: string
    estado: ChequeStatus
    observaciones?: string
    createdAt: string
}

type ChequeForm = {
    numero: string
    banco: string
    tipo: ChequeType
    emisor: string
    beneficiario: string
    monto: string
    fecha_emision: string
    fecha_vencimiento: string
    observaciones: string
}

const emptyForm: ChequeForm = {
    numero: '',
    banco: '',
    tipo: 'emitido',
    emisor: '',
    beneficiario: '',
    monto: '',
    fecha_emision: new Date().toISOString().split('T')[0],
    fecha_vencimiento: '',
    observaciones: '',
}

const statusMap: Record<ChequeStatus, { label: string; variant: 'warning' | 'success' | 'destructive' | 'secondary' }> = {
    en_cartera: { label: 'En cartera', variant: 'warning' },
    depositado: { label: 'Depositado', variant: 'secondary' },
    cobrado: { label: 'Cobrado', variant: 'success' },
    rechazado: { label: 'Rechazado', variant: 'destructive' },
    anulado: { label: 'Anulado', variant: 'secondary' },
    endosado: { label: 'Endosado', variant: 'secondary' },
}

export default function ChequesPage() {
    const api = useApi()
    const [cheques, setCheques] = useState<Cheque[]>([])
    const [pagination, setPagination] = useState<Pagination>({ totalItems: 0, totalPages: 0, currentPage: 1, perPage: 20 })
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState<ChequeForm>(emptyForm)
    const [saving, setSaving] = useState(false)

    const fetchCheques = useCallback(async (page = 1) => {
        setLoading(true)
        const params: Record<string, string> = { page: String(page), limit: '20' }
        if (statusFilter) params.estado = statusFilter
        const res = await api.get<Cheque[]>('/cheques', params)
        if (res.status === 1 && res.data) {
            setCheques(Array.isArray(res.data) ? res.data : [])
            if (res.pagination) setPagination(res.pagination)
        }
        setLoading(false)
    }, [api, statusFilter])

    useEffect(() => { fetchCheques() }, [fetchCheques])

    const handleSave = async () => {
        if (!form.numero.trim() || !form.banco.trim() || !form.monto || !form.fecha_vencimiento) {
            toast({ title: 'N°, banco, monto y fecha de vencimiento son obligatorios', variant: 'destructive' })
            return
        }
        setSaving(true)
        const res = await api.post('/cheques', {
            tipo: form.tipo,
            numero: form.numero,
            banco: form.banco,
            monto: parseFloat(form.monto),
            fecha_emision: form.fecha_emision,
            fecha_vencimiento: form.fecha_vencimiento,
            beneficiario: form.beneficiario || undefined,
            emisor: form.emisor || undefined,
            observaciones: form.observaciones || undefined,
        })
        if (res.status === 1) {
            toast({ title: 'Cheque registrado', variant: 'success' })
            setShowModal(false)
            setForm(emptyForm)
            fetchCheques(pagination.currentPage)
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
        setSaving(false)
    }

    const updateStatus = async (id: number, action: 'cobrar' | 'rechazar') => {
        const label = action === 'cobrar' ? 'Cobrar' : 'Rechazar'
        if (!confirm(`${label} este cheque?`)) return
        const res = await api.patch(`/cheques/${id}/${action}`)
        if (res.status === 1) {
            toast({ title: action === 'cobrar' ? 'Cheque cobrado' : 'Cheque rechazado', variant: 'success' })
            fetchCheques(pagination.currentPage)
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    const columns: Column<Cheque>[] = [
        {
            key: 'numero',
            label: 'N°',
            render: (v) => <span className="font-mono font-semibold text-sm">{v as string}</span>,
        },
        {
            key: 'banco',
            label: 'Banco',
            render: (v) => <span className="text-sm">{v as string}</span>,
        },
        {
            key: 'tipo',
            label: 'Tipo',
            render: (v) => (
                <Badge variant="outline">
                    {v === 'emitido' ? 'Emitido' : 'Recibido'}
                </Badge>
            ),
        },
        {
            key: 'monto',
            label: 'Monto',
            sortable: true,
            render: (v) => <span className="font-semibold">{formatCurrency(Number(v))}</span>,
        },
        {
            key: 'fecha_vencimiento',
            label: 'Vencimiento',
            sortable: true,
            render: (v) => <span className="text-sm">{v as string}</span>,
        },
        {
            key: 'estado',
            label: 'Estado',
            render: (v) => {
                const s = statusMap[v as ChequeStatus]
                return s ? <Badge variant={s.variant}>{s.label}</Badge> : <Badge variant="secondary">{v as string}</Badge>
            },
        },
    ]

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                        <Receipt className="h-6 w-6" /> Cheques
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Cheques propios y de terceros</p>
                </div>
                <Button onClick={() => { setForm(emptyForm); setShowModal(true) }}>
                    <Plus className="h-4 w-4 mr-2" /> Nuevo cheque
                </Button>
            </div>

            <div className="flex gap-3 mb-4">
                <Select value={statusFilter || '__all__'} onValueChange={(v) => setStatusFilter(v === '__all__' ? '' : v)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__all__">Todos los estados</SelectItem>
                        <SelectItem value="en_cartera">En cartera</SelectItem>
                        <SelectItem value="depositado">Depositado</SelectItem>
                        <SelectItem value="cobrado">Cobrado</SelectItem>
                        <SelectItem value="rechazado">Rechazado</SelectItem>
                        <SelectItem value="anulado">Anulado</SelectItem>
                        <SelectItem value="endosado">Endosado</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <DataTable
                data={cheques}
                columns={columns}
                pagination={pagination}
                onPageChange={(p) => fetchCheques(p)}
                isLoading={loading}
                emptyMessage="No se encontraron cheques"
                actions={(row) => (
                    <div className="flex gap-1">
                        {(row.estado === 'en_cartera' || row.estado === 'depositado') && (
                            <>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-success hover:text-success" title="Cobrar" onClick={() => updateStatus(row.id, 'cobrar')}>
                                    <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/80" title="Rechazar" onClick={() => updateStatus(row.id, 'rechazar')}>
                                    <XCircle className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                    </div>
                )}
            />

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Nuevo cheque</DialogTitle>
                        <DialogDescription>Registra un cheque propio o de tercero</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>N° de cheque *</Label>
                            <Input value={form.numero} onChange={(e) => setForm(f => ({ ...f, numero: e.target.value }))} className="mt-1 font-mono" autoFocus />
                        </div>
                        <div>
                            <Label>Banco *</Label>
                            <Input value={form.banco} onChange={(e) => setForm(f => ({ ...f, banco: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                            <Label>Tipo</Label>
                            <Select value={form.tipo} onValueChange={(v) => setForm(f => ({ ...f, tipo: v as ChequeType }))}>
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="emitido">Emitido</SelectItem>
                                    <SelectItem value="recibido">Recibido</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Monto *</Label>
                            <Input type="number" min={0.01} step={0.01} value={form.monto} onChange={(e) => setForm(f => ({ ...f, monto: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                            <Label>Emisor</Label>
                            <Input value={form.emisor} onChange={(e) => setForm(f => ({ ...f, emisor: e.target.value }))} className="mt-1" placeholder="Quien emite el cheque" />
                        </div>
                        <div>
                            <Label>Beneficiario</Label>
                            <Input value={form.beneficiario} onChange={(e) => setForm(f => ({ ...f, beneficiario: e.target.value }))} className="mt-1" placeholder="A quien se le paga" />
                        </div>
                        <div>
                            <Label>Fecha emision</Label>
                            <Input type="date" value={form.fecha_emision} onChange={(e) => setForm(f => ({ ...f, fecha_emision: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                            <Label>Fecha vencimiento *</Label>
                            <Input type="date" value={form.fecha_vencimiento} onChange={(e) => setForm(f => ({ ...f, fecha_vencimiento: e.target.value }))} className="mt-1" />
                        </div>
                        <div className="col-span-2">
                            <Label>Observaciones</Label>
                            <Input value={form.observaciones} onChange={(e) => setForm(f => ({ ...f, observaciones: e.target.value }))} className="mt-1" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
