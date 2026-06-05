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
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Plus, ArrowUpDown } from 'lucide-react'
import type { Pagination } from '@/types'

type MovementType = 'credito' | 'debito'

type BankAccount = { id: number; name: string; bank: string }

type BankMovement = {
    id: number
    bank_account_id: number
    account?: BankAccount
    type: MovementType
    amount: number
    concept: string
    date: string
    reference?: string
    createdAt: string
}

type MovementForm = {
    bank_account_id: string
    type: MovementType
    amount: string
    concept: string
    date: string
    reference: string
}

const emptyForm: MovementForm = {
    bank_account_id: '',
    type: 'credito',
    amount: '',
    concept: '',
    date: new Date().toISOString().split('T')[0],
    reference: '',
}

export default function MovimientosBancariosPage() {
    const api = useApi()
    const [movements, setMovements] = useState<BankMovement[]>([])
    const [accounts, setAccounts] = useState<BankAccount[]>([])
    const [pagination, setPagination] = useState<Pagination>({ totalItems: 0, totalPages: 0, currentPage: 1, perPage: 20 })
    const [loading, setLoading] = useState(true)
    const [accountFilter, setAccountFilter] = useState('')
    const [typeFilter, setTypeFilter] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [form, setForm] = useState<MovementForm>(emptyForm)
    const [saving, setSaving] = useState(false)

    const fetchMovements = useCallback(async (page = 1) => {
        setLoading(true)
        const params: Record<string, string> = { page: String(page), limit: '20' }
        if (accountFilter) params.bank_account_id = accountFilter
        if (typeFilter) params.type = typeFilter
        if (dateFrom) params.date_from = dateFrom
        if (dateTo) params.date_to = dateTo
        const res = await api.get<BankMovement[]>('/bank-movements', params)
        if (res.status === 1 && res.data) {
            setMovements(Array.isArray(res.data) ? res.data : [])
            if (res.pagination) setPagination(res.pagination)
        }
        setLoading(false)
    }, [api, accountFilter, typeFilter, dateFrom, dateTo])

    const fetchAccounts = useCallback(async () => {
        const res = await api.get<BankAccount[]>('/bank-accounts', { limit: '100' })
        if (res.status === 1 && res.data) setAccounts(Array.isArray(res.data) ? res.data : [])
    }, [api])

    useEffect(() => { fetchMovements() }, [fetchMovements])
    useEffect(() => { fetchAccounts() }, [fetchAccounts])

    const handleSave = async () => {
        if (!form.bank_account_id || !form.amount || !form.concept.trim()) {
            toast({ title: 'Cuenta, monto y concepto son obligatorios', variant: 'destructive' })
            return
        }
        setSaving(true)
        const res = await api.post('/bank-movements', {
            ...form,
            bank_account_id: Number(form.bank_account_id),
            amount: parseFloat(form.amount),
        })
        if (res.status === 1) {
            toast({ title: 'Movimiento registrado', variant: 'success' })
            setShowModal(false)
            setForm(emptyForm)
            fetchMovements(pagination.currentPage)
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
        setSaving(false)
    }

    const columns: Column<BankMovement>[] = [
        {
            key: 'date',
            label: 'Fecha',
            sortable: true,
            render: (v) => <span className="text-sm">{v ? formatDateTime(v as string).split(' ')[0] : '-'}</span>,
        },
        {
            key: 'account',
            label: 'Cuenta',
            render: (_, row) => (
                <span className="text-sm font-medium">
                    {row.account ? `${row.account.name} (${row.account.bank})` : `#${row.bank_account_id}`}
                </span>
            ),
        },
        {
            key: 'type',
            label: 'Tipo',
            render: (v) => (
                <Badge variant={v === 'credito' ? 'success' : 'destructive'}>
                    {v === 'credito' ? 'Credito' : 'Debito'}
                </Badge>
            ),
        },
        {
            key: 'concept',
            label: 'Concepto',
            render: (v) => <span className="text-sm">{v as string}</span>,
        },
        {
            key: 'amount',
            label: 'Monto',
            sortable: true,
            render: (v, row) => (
                <span className={`font-semibold ${row.type === 'credito' ? 'text-green-600' : 'text-red-600'}`}>
                    {row.type === 'credito' ? '+' : '-'}{formatCurrency(v as number)}
                </span>
            ),
        },
    ]

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ArrowUpDown className="h-6 w-6" /> Movimientos bancarios
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">Creditos y debitos por cuenta</p>
                </div>
                <Button onClick={() => { setForm(emptyForm); setShowModal(true) }}>
                    <Plus className="h-4 w-4 mr-2" /> Nuevo movimiento
                </Button>
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
                <Select value={accountFilter} onValueChange={setAccountFilter}>
                    <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Todas las cuentas" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="">Todas las cuentas</SelectItem>
                        {accounts.map(a => (
                            <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="">Todos</SelectItem>
                        <SelectItem value="credito">Credito</SelectItem>
                        <SelectItem value="debito">Debito</SelectItem>
                    </SelectContent>
                </Select>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
            </div>

            <DataTable
                data={movements}
                columns={columns}
                pagination={pagination}
                onPageChange={(p) => fetchMovements(p)}
                isLoading={loading}
                emptyMessage="No se encontraron movimientos"
            />

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nuevo movimiento bancario</DialogTitle>
                        <DialogDescription>Registra un credito o debito</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Cuenta *</Label>
                            <Select value={form.bank_account_id} onValueChange={(v) => setForm(f => ({ ...f, bank_account_id: v }))}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar cuenta" /></SelectTrigger>
                                <SelectContent>
                                    {accounts.map(a => (
                                        <SelectItem key={a.id} value={String(a.id)}>{a.name} — {a.bank}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Tipo *</Label>
                                <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v as MovementType }))}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="credito">Credito (ingreso)</SelectItem>
                                        <SelectItem value="debito">Debito (egreso)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Monto *</Label>
                                <Input type="number" min={0.01} step={0.01} value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} className="mt-1" />
                            </div>
                        </div>
                        <div>
                            <Label>Concepto *</Label>
                            <Input value={form.concept} onChange={(e) => setForm(f => ({ ...f, concept: e.target.value }))} className="mt-1" placeholder="Descripcion del movimiento" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Fecha</Label>
                                <Input type="date" value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} className="mt-1" />
                            </div>
                            <div>
                                <Label>Referencia</Label>
                                <Input value={form.reference} onChange={(e) => setForm(f => ({ ...f, reference: e.target.value }))} className="mt-1" placeholder="N° comprobante" />
                            </div>
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
