'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/use-api'
import { toast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, BookOpen, ChevronRight } from 'lucide-react'

type AccountType = 'activo' | 'pasivo' | 'patrimonio' | 'resultado' | 'egreso'

type Account = {
    id: number
    code: string
    name: string
    type: AccountType
    parent_id?: number
    is_imputable: boolean
    children?: Account[]
    createdAt: string
}

type AccountForm = {
    code: string
    name: string
    type: AccountType
    parent_id: string
    is_imputable: boolean
}

const emptyForm: AccountForm = {
    code: '',
    name: '',
    type: 'activo',
    parent_id: '',
    is_imputable: true,
}

const typeMap: Record<AccountType, { label: string; color: string }> = {
    activo: { label: 'Activo', color: 'bg-blue-100 text-blue-700' },
    pasivo: { label: 'Pasivo', color: 'bg-red-100 text-red-700' },
    patrimonio: { label: 'Patrimonio', color: 'bg-purple-100 text-purple-700' },
    resultado: { label: 'Resultado', color: 'bg-green-100 text-green-700' },
    egreso: { label: 'Egreso', color: 'bg-orange-100 text-orange-700' },
}

function AccountRow({ account, depth, onEdit, onDelete }: { account: Account; depth: number; onEdit: (a: Account) => void; onDelete: (id: number) => void }) {
    const [expanded, setExpanded] = useState(depth < 1)
    const hasChildren = account.children && account.children.length > 0
    const typeInfo = typeMap[account.type]

    return (
        <>
            <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 px-4">
                    <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
                        {hasChildren ? (
                            <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600">
                                <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                            </button>
                        ) : (
                            <span className="w-4" />
                        )}
                        <span className="font-mono text-sm text-gray-500">{account.code}</span>
                    </div>
                </td>
                <td className="py-2 px-4">
                    <span className={`font-medium text-sm ${depth === 0 ? 'font-semibold' : ''}`}>{account.name}</span>
                </td>
                <td className="py-2 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeInfo.color}`}>
                        {typeInfo.label}
                    </span>
                </td>
                <td className="py-2 px-4 text-center">
                    {account.is_imputable ? (
                        <Badge variant="success">Si</Badge>
                    ) : (
                        <Badge variant="secondary">No</Badge>
                    )}
                </td>
                <td className="py-2 px-4">
                    <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(account)}>
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700" onClick={() => onDelete(account.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </td>
            </tr>
            {expanded && hasChildren && account.children!.map(child => (
                <AccountRow key={child.id} account={child} depth={depth + 1} onEdit={onEdit} onDelete={onDelete} />
            ))}
        </>
    )
}

export default function PlanCuentasPage() {
    const api = useApi()
    const [accounts, setAccounts] = useState<Account[]>([])
    const [flatAccounts, setFlatAccounts] = useState<Account[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<Account | null>(null)
    const [form, setForm] = useState<AccountForm>(emptyForm)
    const [saving, setSaving] = useState(false)

    const fetchAccounts = useCallback(async () => {
        setLoading(true)
        const res = await api.get<Account[]>('/accounts')
        if (res.status === 1 && res.data) {
            const data = Array.isArray(res.data) ? res.data : []
            setAccounts(data)
            // flat list for parent selector
            const flat: Account[] = []
            const flatten = (items: Account[]) => items.forEach(a => { flat.push(a); if (a.children) flatten(a.children) })
            flatten(data)
            setFlatAccounts(flat)
        }
        setLoading(false)
    }, [api])

    useEffect(() => { fetchAccounts() }, [fetchAccounts])

    const openCreate = () => {
        setEditing(null)
        setForm(emptyForm)
        setShowModal(true)
    }

    const openEdit = (acc: Account) => {
        setEditing(acc)
        setForm({
            code: acc.code,
            name: acc.name,
            type: acc.type,
            parent_id: acc.parent_id ? String(acc.parent_id) : '',
            is_imputable: acc.is_imputable,
        })
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!form.code.trim() || !form.name.trim()) {
            toast({ title: 'Codigo y nombre son obligatorios', variant: 'destructive' })
            return
        }
        setSaving(true)
        const body = {
            ...form,
            parent_id: form.parent_id ? Number(form.parent_id) : undefined,
        }
        const res = editing
            ? await api.put(`/accounts/${editing.id}`, body)
            : await api.post('/accounts', body)
        if (res.status === 1) {
            toast({ title: editing ? 'Cuenta actualizada' : 'Cuenta creada', variant: 'success' })
            setShowModal(false)
            fetchAccounts()
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
        setSaving(false)
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Eliminar esta cuenta?')) return
        const res = await api.del(`/accounts/${id}`)
        if (res.status === 1) {
            toast({ title: 'Cuenta eliminada', variant: 'success' })
            fetchAccounts()
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <BookOpen className="h-6 w-6" /> Plan de cuentas
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">Arbol de cuentas contables</p>
                </div>
                <Button onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-2" /> Nueva cuenta
                </Button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                {loading ? (
                    <div className="p-8 text-center text-gray-400">Cargando...</div>
                ) : accounts.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">No hay cuentas registradas</div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Codigo</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Nombre</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">Imputable</th>
                                <th className="py-3 px-4" />
                            </tr>
                        </thead>
                        <tbody>
                            {accounts.map(acc => (
                                <AccountRow key={acc.id} account={acc} depth={0} onEdit={openEdit} onDelete={handleDelete} />
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Editar cuenta' : 'Nueva cuenta'}</DialogTitle>
                        <DialogDescription>Datos de la cuenta contable</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Codigo *</Label>
                                <Input value={form.code} onChange={(e) => setForm(f => ({ ...f, code: e.target.value }))} className="mt-1 font-mono" placeholder="Ej: 1.1.01" autoFocus />
                            </div>
                            <div>
                                <Label>Tipo *</Label>
                                <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v as AccountType }))}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="activo">Activo</SelectItem>
                                        <SelectItem value="pasivo">Pasivo</SelectItem>
                                        <SelectItem value="patrimonio">Patrimonio</SelectItem>
                                        <SelectItem value="resultado">Resultado</SelectItem>
                                        <SelectItem value="egreso">Egreso</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label>Nombre *</Label>
                            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                            <Label>Cuenta padre</Label>
                            <Select value={form.parent_id} onValueChange={(v) => setForm(f => ({ ...f, parent_id: v }))}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Sin padre (cuenta raiz)" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Sin padre</SelectItem>
                                    {flatAccounts.filter(a => !editing || a.id !== editing.id).map(a => (
                                        <SelectItem key={a.id} value={String(a.id)}>
                                            {a.code} — {a.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="is_imputable"
                                checked={form.is_imputable}
                                onCheckedChange={(v) => setForm(f => ({ ...f, is_imputable: !!v }))}
                            />
                            <Label htmlFor="is_imputable">Es imputable (acepta asientos)</Label>
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
