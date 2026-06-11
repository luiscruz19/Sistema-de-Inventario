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

type BankAccountType = 'corriente' | 'caja_ahorro' | 'cuenta_sueldo' | 'inversion'

type BankAccount = {
    id: number
    nombre: string
    banco: string
    numero_cuenta: string | null
    cbu_cvu: string | null
    tipo: BankAccountType
    moneda: string
    saldo_inicial: number | string
    activa: boolean
    createdAt: string
}

type BankAccountForm = {
    nombre: string
    banco: string
    numero_cuenta: string
    tipo: BankAccountType
    moneda: string
    cbu_cvu: string
    saldo_inicial: string
}

const emptyForm: BankAccountForm = {
    nombre: '',
    banco: '',
    numero_cuenta: '',
    tipo: 'corriente',
    moneda: 'ARS',
    cbu_cvu: '',
    saldo_inicial: '0',
}

const typeMap: Record<BankAccountType, string> = {
    corriente: 'Cuenta corriente',
    caja_ahorro: 'Caja de ahorro',
    cuenta_sueldo: 'Cuenta sueldo',
    inversion: 'Inversion',
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
            nombre: acc.nombre,
            banco: acc.banco,
            numero_cuenta: acc.numero_cuenta || '',
            tipo: acc.tipo,
            moneda: acc.moneda,
            cbu_cvu: acc.cbu_cvu || '',
            saldo_inicial: String(acc.saldo_inicial),
        })
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!form.nombre.trim() || !form.banco.trim()) {
            toast({ title: 'Nombre y banco son obligatorios', variant: 'destructive' })
            return
        }
        setSaving(true)
        const body = {
            nombre: form.nombre,
            banco: form.banco,
            numero_cuenta: form.numero_cuenta || null,
            cbu_cvu: form.cbu_cvu || null,
            tipo: form.tipo,
            moneda: form.moneda,
            saldo_inicial: parseFloat(form.saldo_inicial) || 0,
        }
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
            key: 'nombre',
            label: 'Nombre',
            render: (v) => <span className="font-medium">{v as string}</span>,
        },
        {
            key: 'banco',
            label: 'Banco',
            render: (v) => <span className="text-sm">{v as string}</span>,
        },
        {
            key: 'tipo',
            label: 'Tipo',
            render: (v) => <Badge variant="secondary">{typeMap[v as BankAccountType] || v as string}</Badge>,
        },
        {
            key: 'moneda',
            label: 'Moneda',
            render: (v) => <span className="font-mono text-sm">{v as string}</span>,
        },
        {
            key: 'cbu_cvu',
            label: 'CBU / Cuenta',
            render: (_, row) => (
                <div className="text-sm">
                    {row.cbu_cvu && <div className="font-mono text-xs text-muted-foreground">{row.cbu_cvu}</div>}
                    {row.numero_cuenta && <div className="text-muted-foreground">{row.numero_cuenta}</div>}
                    {!row.cbu_cvu && !row.numero_cuenta && '-'}
                </div>
            ),
        },
        {
            key: 'saldo_inicial',
            label: 'Saldo',
            render: (v) => {
                const balance = Number(v) || 0
                return (
                    <span className={`font-semibold ${balance >= 0 ? 'text-success' : 'text-destructive'}`}>
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
                    <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                        <Building className="h-6 w-6" /> Cuentas bancarias
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Gestion de cuentas bancarias y virtuales</p>
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
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/80" onClick={() => handleDelete(row.id)}>
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
                            <Input value={form.nombre} onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))} className="mt-1" autoFocus placeholder="Ej: Cuenta operativa Banco Nacion" />
                        </div>
                        <div>
                            <Label>Banco *</Label>
                            <Input value={form.banco} onChange={(e) => setForm(f => ({ ...f, banco: e.target.value }))} className="mt-1" placeholder="Ej: Banco Nacion" />
                        </div>
                        <div>
                            <Label>Tipo</Label>
                            <Select value={form.tipo} onValueChange={(v) => setForm(f => ({ ...f, tipo: v as BankAccountType }))}>
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="corriente">Cuenta corriente</SelectItem>
                                    <SelectItem value="caja_ahorro">Caja de ahorro</SelectItem>
                                    <SelectItem value="cuenta_sueldo">Cuenta sueldo</SelectItem>
                                    <SelectItem value="inversion">Inversion</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Moneda</Label>
                            <Select value={form.moneda} onValueChange={(v) => setForm(f => ({ ...f, moneda: v }))}>
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
                            <Input type="number" value={form.saldo_inicial} onChange={(e) => setForm(f => ({ ...f, saldo_inicial: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                            <Label>CBU / CVU</Label>
                            <Input value={form.cbu_cvu} onChange={(e) => setForm(f => ({ ...f, cbu_cvu: e.target.value }))} className="mt-1 font-mono" placeholder="22 digitos" />
                        </div>
                        <div>
                            <Label>Numero de cuenta</Label>
                            <Input value={form.numero_cuenta} onChange={(e) => setForm(f => ({ ...f, numero_cuenta: e.target.value }))} className="mt-1" placeholder="Ej: 123-456/7" />
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
