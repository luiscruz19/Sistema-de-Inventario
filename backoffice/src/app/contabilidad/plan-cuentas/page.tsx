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
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { Plus, Pencil, Trash2, BookOpen, ChevronRight } from 'lucide-react'

type AccountType = 'activo' | 'pasivo' | 'patrimonio' | 'ingreso' | 'egreso' | 'costo'

type Account = {
    id: number
    codigo: string
    nombre: string
    tipo: AccountType
    parent_id?: number
    imputable: boolean
    children?: Account[]
    createdAt: string
}

type AccountForm = {
    codigo: string
    nombre: string
    tipo: AccountType
    parent_id: string
    imputable: boolean
}

const emptyForm: AccountForm = {
    codigo: '',
    nombre: '',
    tipo: 'activo',
    parent_id: '',
    imputable: true,
}

const typeMap: Record<AccountType, { label: string; color: string }> = {
    activo: { label: 'Activo', color: 'bg-primary/10 text-primary' },
    pasivo: { label: 'Pasivo', color: 'bg-destructive/10 text-destructive' },
    patrimonio: { label: 'Patrimonio', color: 'bg-primary/10 text-primary' },
    ingreso: { label: 'Ingreso', color: 'bg-success/10 text-success' },
    egreso: { label: 'Egreso', color: 'bg-warning/10 text-warning' },
    costo: { label: 'Costo', color: 'bg-muted text-muted-foreground' },
}

function AccountRow({ account, depth, onEdit, onDelete }: { account: Account; depth: number; onEdit: (a: Account) => void; onDelete: (id: number) => void }) {
    const [expanded, setExpanded] = useState(depth < 1)
    const hasChildren = account.children && account.children.length > 0
    const typeInfo = typeMap[account.tipo] ?? { label: account.tipo, color: 'bg-muted text-muted-foreground' }

    return (
        <>
            <tr className="border-b border-border hover:bg-muted">
                <td className="py-2 px-4">
                    <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
                        {hasChildren ? (
                            <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-muted-foreground">
                                <ChevronRight className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`} />
                            </button>
                        ) : (
                            <span className="w-4" />
                        )}
                        <span className="font-mono text-sm text-muted-foreground">{account.codigo}</span>
                    </div>
                </td>
                <td className="py-2 px-4">
                    <span className={`font-medium text-sm ${depth === 0 ? 'font-semibold' : ''}`}>{account.nombre}</span>
                </td>
                <td className="py-2 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeInfo.color}`}>
                        {typeInfo.label}
                    </span>
                </td>
                <td className="py-2 px-4 text-center">
                    {account.imputable ? (
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
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/80" onClick={() => onDelete(account.id)}>
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
        const res = await api.get<Account[]>('/chart-of-accounts')
        if (res.status === 1 && res.data) {
            const flat = Array.isArray(res.data) ? res.data : []
            setFlatAccounts(flat)
            // El backend devuelve una lista plana ordenada por codigo; armamos el arbol por parent_id
            const byId = new Map<number, Account>()
            flat.forEach(a => byId.set(a.id, { ...a, children: [] }))
            const roots: Account[] = []
            byId.forEach(a => {
                if (a.parent_id && byId.has(a.parent_id)) {
                    byId.get(a.parent_id)!.children!.push(a)
                } else {
                    roots.push(a)
                }
            })
            setAccounts(roots)
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
            codigo: acc.codigo,
            nombre: acc.nombre,
            tipo: acc.tipo,
            parent_id: acc.parent_id ? String(acc.parent_id) : '',
            imputable: acc.imputable,
        })
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!form.codigo.trim() || !form.nombre.trim()) {
            toast({ title: 'Codigo y nombre son obligatorios', variant: 'destructive' })
            return
        }
        setSaving(true)
        const body = {
            codigo: form.codigo,
            nombre: form.nombre,
            tipo: form.tipo,
            parent_id: form.parent_id ? Number(form.parent_id) : undefined,
            imputable: form.imputable,
        }
        const res = editing
            ? await api.put(`/chart-of-accounts/${editing.id}`, body)
            : await api.post('/chart-of-accounts', body)
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
        const res = await api.del(`/chart-of-accounts/${id}`)
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
                    <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                        <BookOpen className="h-6 w-6" /> Plan de cuentas
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Arbol de cuentas contables</p>
                </div>
                <Button onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-2" /> Nueva cuenta
                </Button>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm">
                {loading ? (
                    <div className="divide-y divide-border">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-4 py-3">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 flex-1 max-w-[200px]" />
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-12" />
                            </div>
                        ))}
                    </div>
                ) : accounts.length === 0 ? (
                    <EmptyState icon={BookOpen} title="No hay cuentas registradas" description="Crea tu plan de cuentas para empezar a registrar asientos." action={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Nueva cuenta</Button>} />
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border bg-muted">
                                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Codigo</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nombre</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo</th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Imputable</th>
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
                                <Input value={form.codigo} onChange={(e) => setForm(f => ({ ...f, codigo: e.target.value }))} className="mt-1 font-mono" placeholder="Ej: 1.1.01" autoFocus />
                            </div>
                            <div>
                                <Label>Tipo *</Label>
                                <Select value={form.tipo} onValueChange={(v) => setForm(f => ({ ...f, tipo: v as AccountType }))}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="activo">Activo</SelectItem>
                                        <SelectItem value="pasivo">Pasivo</SelectItem>
                                        <SelectItem value="patrimonio">Patrimonio</SelectItem>
                                        <SelectItem value="ingreso">Ingreso</SelectItem>
                                        <SelectItem value="egreso">Egreso</SelectItem>
                                        <SelectItem value="costo">Costo</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label>Nombre *</Label>
                            <Input value={form.nombre} onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                            <Label>Cuenta padre</Label>
                            <Select value={form.parent_id || '__none__'} onValueChange={(v) => setForm(f => ({ ...f, parent_id: v === '__none__' ? '' : v }))}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Sin padre (cuenta raiz)" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">Sin padre</SelectItem>
                                    {flatAccounts.filter(a => !editing || a.id !== editing.id).map(a => (
                                        <SelectItem key={a.id} value={String(a.id)}>
                                            {a.codigo} — {a.nombre}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2">
                            <Checkbox
                                id="is_imputable"
                                checked={form.imputable}
                                onCheckedChange={(v) => setForm(f => ({ ...f, imputable: !!v }))}
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
