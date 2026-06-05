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
import { Plus, Pencil, Trash2, Building } from 'lucide-react'
import type { Pagination } from '@/types'

type BankAccountType = 'corriente' | 'caja_ahorro' | 'virtual'

type BankAccount = {
    id: number
    name: string
    bank: string
    type: BankAccountType
    currency: string
    cbu: string
    alias: string
    initial_balance: number
    calculated_balance?: number
    active: boolean
    createdAt: string
}

type BankAccountForm = {
    name: string
    bank: string
    type: BankAccountType
    currency: string
    cbu: string
    alias: string
    initial_balance: string
}

const emptyForm: BankAccountForm = {
    name: '',
    bank: '',
    type: 'corriente',
    currency: 'ARS',
    cbu: '',
    alias: '',
    initial_balance: '0',
}

const typeMap: Record<BankAccountType, string> = {
    corriente: 'Cuenta corriente',
    caja_ahorro: 'Caja de ahorro',
    virtual: 'Cuenta virtual',
}

export default function CuentasBancariasPage() {
    const api = useApi()
    const [accounts, setAccounts] = useState<BankAccount[]>([])
    const [pagination, setPagination] = useState<Pagination>({ totalItems: 0, totalPages: 0, currentPage: 1, perPage: 20 })
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<BankAccount | null>(null)
    const [form, setForm] = useState<BankAccountForm>(emptyForm)
    const [saving, setSaving] = useState(false)

    const fetchAccounts = useCallback(async (page = 1) => {
        setLoading(true)
        const res = await api.get<BankAccount[]>('/bank-accounts', { page: String(page), limit: '20' })
        if (res.status === 1 && res.data) {
            setAccounts(Array.isArray(res.data) ? res.data : [])
            if (res.pagination) setPagination(res.pagination)
        }
        setLoading(false)
    }, [api])

    useEffect(() => { fetchAccounts() }, [fetchAccounts])

    const openCreate = () => {
        setEditing(null)
        setForm(emptyForm)
        setShowModal(true)
    }

    const openEdit = (acc: BankAccount) => {
        setEditing(acc)
        setForm({
            name: acc.name,
            bank: acc.bank,
            type: acc.type,
            currency: acc.currency,
            cbu: acc.cbu || '',
            alias: acc.alias || '',
            initial_balance: String(acc.initial_balance),
        })
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!form.name.trim() || !form.bank.trim()) {
            toast({ title: 'Nombre y banco son obligatorios', variant: 'destructive' })
            return
        }
        setSaving(true)
        const body = { ...form, initial_balance: parseFloat(form.initial_balance) || 0 }
        const res = editing
            ? await api.put(`/bank-accounts/${editing.id}`, body)
            : await api.post('/bank-accounts', body)
        if (res.status === 1) {
            toast({ title: editing ? 'Cuenta actualizada' : 'Cuenta creada', variant: 'success' })
            setShowModal(false)
            fetchAccounts(pagination.currentPage)
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
        setSaving(false)
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Eliminar esta cuenta bancaria?')) return
        const res = await api.del(`/bank-accounts/${id}`)
        if (res.status === 1) {
            toast({ title: 'Cuenta eliminada', variant: 'success' })
            fetchAccounts(pagination.currentPage)
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    const columns: Column<BankAccount>[] = [
        {
            key: 'name',
            label: 'Nombre',
            render: (v) => <span className="font-medium">{v as string}</span>,
        },
        {
            key: 'bank',
            label: 'Banco',
            render: (v) => <span className="text-sm">{v as string}</span>,
        },
        {
            key: 'type',
            label: 'Tipo',
            render: (v) => <Badge variant="secondary">{typeMap[v as BankAccountType] || v as string}</Badge>,
        },
        {
            key: 'currency',
            label: 'Moneda',
            render: (v) => <span className="font-mono text-sm">{v as string}</span>,
        },
        {
            key: 'cbu',
            label: 'CBU / Alias',
            render: (_, row) => (
                <div className="text-sm">
                    {row.cbu && <div className="font-mono text-xs text-gray-500">{row.cbu}</div>}
                    {row.alias && <div className="text-gray-600">{row.alias}</div>}
                    {!row.cbu && !row.alias && '-'}
                </div>
            ),
        },
        {
            key: 'calculated_balance',
            label: 'Saldo',
            render: (v, row) => {
                const balance = (v as number) ?? row.initial_balance
                return (
                    <span className={`font-semibold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(balance)}
                    </span>
                )
            },
        },
    ]

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Building className="h-6 w-6" /> Cuentas bancarias
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">Gestion de cuentas bancarias y virtuales</p>
                </div>
                <Button onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-2" /> Nueva cuenta
                </Button>
            </div>

            <DataTable
                data={accounts}
                columns={columns}
                pagination={pagination}
                onPageChange={(p) => fetchAccounts(p)}
                isLoading={loading}
                emptyMessage="No se encontraron cuentas bancarias"
                actions={(row) => (
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDelete(row.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            />

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Editar cuenta' : 'Nueva cuenta bancaria'}</DialogTitle>
                        <DialogDescription>Datos de la cuenta</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Label>Nombre *</Label>
                            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" autoFocus placeholder="Ej: Cuenta operativa Banco Nacion" />
                        </div>
                        <div>
                            <Label>Banco *</Label>
                            <Input value={form.bank} onChange={(e) => setForm(f => ({ ...f, bank: e.target.value }))} className="mt-1" placeholder="Ej: Banco Nacion" />
                        </div>
                        <div>
                            <Label>Tipo</Label>
                            <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v as BankAccountType }))}>
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="corriente">Cuenta corriente</SelectItem>
                                    <SelectItem value="caja_ahorro">Caja de ahorro</SelectItem>
                                    <SelectItem value="virtual">Cuenta virtual</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Moneda</Label>
                            <Select value={form.currency} onValueChange={(v) => setForm(f => ({ ...f, currency: v }))}>
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ARS">ARS (Pesos)</SelectItem>
                                    <SelectItem value="USD">USD (Dolares)</SelectItem>
                                    <SelectItem value="EUR">EUR (Euros)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Saldo inicial</Label>
                            <Input type="number" value={form.initial_balance} onChange={(e) => setForm(f => ({ ...f, initial_balance: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                            <Label>CBU</Label>
                            <Input value={form.cbu} onChange={(e) => setForm(f => ({ ...f, cbu: e.target.value }))} className="mt-1 font-mono" placeholder="22 digitos" />
                        </div>
                        <div>
                            <Label>Alias</Label>
                            <Input value={form.alias} onChange={(e) => setForm(f => ({ ...f, alias: e.target.value }))} className="mt-1" placeholder="alias.de.la.cuenta" />
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
