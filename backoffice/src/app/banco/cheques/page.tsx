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

type ChequeStatus = 'pendiente' | 'cobrado' | 'rechazado' | 'anulado'
type ChequeType = 'propios' | 'terceros'

type Cheque = {
    id: number
    numero: string
    bank: string
    type: ChequeType
    librador?: string
    beneficiario?: string
    amount: number
    issue_date: string
    payment_date: string
    status: ChequeStatus
    notes?: string
    createdAt: string
}

type ChequeForm = {
    numero: string
    bank: string
    type: ChequeType
    librador: string
    beneficiario: string
    amount: string
    issue_date: string
    payment_date: string
    notes: string
}

const emptyForm: ChequeForm = {
    numero: '',
    bank: '',
    type: 'propios',
    librador: '',
    beneficiario: '',
    amount: '',
    issue_date: new Date().toISOString().split('T')[0],
    payment_date: '',
    notes: '',
}

const statusMap: Record<ChequeStatus, { label: string; variant: 'warning' | 'success' | 'destructive' | 'secondary' }> = {
    pendiente: { label: 'Pendiente', variant: 'warning' },
    cobrado: { label: 'Cobrado', variant: 'success' },
    rechazado: { label: 'Rechazado', variant: 'destructive' },
    anulado: { label: 'Anulado', variant: 'secondary' },
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
        if (statusFilter) params.status = statusFilter
        const res = await api.get<Cheque[]>('/cheques', params)
        if (res.status === 1 && res.data) {
            setCheques(Array.isArray(res.data) ? res.data : [])
            if (res.pagination) setPagination(res.pagination)
        }
        setLoading(false)
    }, [api, statusFilter])

    useEffect(() => { fetchCheques() }, [fetchCheques])

    const handleSave = async () => {
        if (!form.numero.trim() || !form.bank.trim() || !form.amount || !form.payment_date) {
            toast({ title: 'N°, banco, monto y fecha de cobro son obligatorios', variant: 'destructive' })
            return
        }
        setSaving(true)
        const res = await api.post('/cheques', {
            ...form,
            amount: parseFloat(form.amount),
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

    const updateStatus = async (id: number, status: ChequeStatus) => {
        const label = status === 'cobrado' ? 'Cobrar' : 'Rechazar'
        if (!confirm(`${label} este cheque?`)) return
        const res = await api.put(`/cheques/${id}`, { status })
        if (res.status === 1) {
            toast({ title: `Cheque ${status}`, variant: 'success' })
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
            key: 'bank',
            label: 'Banco',
            render: (v) => <span className="text-sm">{v as string}</span>,
        },
        {
            key: 'type',
            label: 'Tipo',
            render: (v) => (
                <Badge variant="outline">
                    {v === 'propios' ? 'Propio' : 'Tercero'}
                </Badge>
            ),
        },
        {
            key: 'amount',
            label: 'Monto',
            sortable: true,
            render: (v) => <span className="font-semibold">{formatCurrency(v as number)}</span>,
        },
        {
            key: 'payment_date',
            label: 'Fecha cobro',
            sortable: true,
            render: (v) => <span className="text-sm">{v as string}</span>,
        },
        {
            key: 'status',
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
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Receipt className="h-6 w-6" /> Cheques
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">Cheques propios y de terceros</p>
                </div>
                <Button onClick={() => { setForm(emptyForm); setShowModal(true) }}>
                    <Plus className="h-4 w-4 mr-2" /> Nuevo cheque
                </Button>
            </div>

            <div className="flex gap-3 mb-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="">Todos los estados</SelectItem>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="cobrado">Cobrado</SelectItem>
                        <SelectItem value="rechazado">Rechazado</SelectItem>
                        <SelectItem value="anulado">Anulado</SelectItem>
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
                        {row.status === 'pendiente' && (
                            <>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:text-green-800" title="Cobrar" onClick={() => updateStatus(row.id, 'cobrado')}>
                                    <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" title="Rechazar" onClick={() => updateStatus(row.id, 'rechazado')}>
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
                            <Input value={form.bank} onChange={(e) => setForm(f => ({ ...f, bank: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                            <Label>Tipo</Label>
                            <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v as ChequeType }))}>
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="propios">Propios</SelectItem>
                                    <SelectItem value="terceros">Terceros</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Monto *</Label>
                            <Input type="number" min={0.01} step={0.01} value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                            <Label>Librador</Label>
                            <Input value={form.librador} onChange={(e) => setForm(f => ({ ...f, librador: e.target.value }))} className="mt-1" placeholder="Quien emite el cheque" />
                        </div>
                        <div>
                            <Label>Beneficiario</Label>
                            <Input value={form.beneficiario} onChange={(e) => setForm(f => ({ ...f, beneficiario: e.target.value }))} className="mt-1" placeholder="A quien se le paga" />
                        </div>
                        <div>
                            <Label>Fecha emision</Label>
                            <Input type="date" value={form.issue_date} onChange={(e) => setForm(f => ({ ...f, issue_date: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                            <Label>Fecha cobro *</Label>
                            <Input type="date" value={form.payment_date} onChange={(e) => setForm(f => ({ ...f, payment_date: e.target.value }))} className="mt-1" />
                        </div>
                        <div className="col-span-2">
                            <Label>Notas</Label>
                            <Input value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" />
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
