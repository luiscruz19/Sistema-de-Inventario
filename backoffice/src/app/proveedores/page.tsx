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
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { Supplier, Pagination } from '@/types'

type SupplierForm = { name: string; tax_id: string; email: string; phone: string; address: string; contact_person: string; payment_terms: string; notes: string; active: boolean }
const emptyForm: SupplierForm = { name: '', tax_id: '', email: '', phone: '', address: '', contact_person: '', payment_terms: '', notes: '', active: true }

export default function ProveedoresPage() {
    const api = useApi()
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [pagination, setPagination] = useState<Pagination>({ totalItems: 0, totalPages: 0, currentPage: 1, perPage: 20 })
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<Supplier | null>(null)
    const [form, setForm] = useState<SupplierForm>(emptyForm)

    const fetchSuppliers = useCallback(async (page = 1) => {
        setLoading(true)
        const params: Record<string, string> = { page: String(page), limit: '20' }
        if (search) params.search = search
        const res = await api.get<Supplier[]>('/suppliers', params)
        if (res.status === 1 && res.data) {
            setSuppliers(Array.isArray(res.data) ? res.data : [])
            if (res.pagination) setPagination(res.pagination)
        }
        setLoading(false)
    }, [api, search])

    useEffect(() => { fetchSuppliers() }, [fetchSuppliers])

    const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
    const openEdit = (s: Supplier) => {
        setEditing(s)
        setForm({ name: s.name, tax_id: s.tax_id || '', email: s.email || '', phone: s.phone || '', address: s.address || '', contact_person: s.contact_person || '', payment_terms: s.payment_terms || '', notes: s.notes || '', active: s.active })
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!form.name.trim()) { toast({ title: 'El nombre es obligatorio', variant: 'destructive' }); return }
        const res = editing ? await api.put(`/suppliers/${editing.id}`, form) : await api.post('/suppliers', form)
        if (res.status === 1) {
            toast({ title: editing ? 'Proveedor actualizado' : 'Proveedor creado', variant: 'success' })
            setShowModal(false); fetchSuppliers(pagination.currentPage)
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Eliminar proveedor?')) return
        const res = await api.del(`/suppliers/${id}`)
        if (res.status === 1) { toast({ title: 'Proveedor eliminado', variant: 'success' }); fetchSuppliers(pagination.currentPage) }
        else toast({ title: 'Error', description: res.message, variant: 'destructive' })
    }

    const columns: Column<Supplier>[] = [
        { key: 'name', label: 'Nombre', sortable: true, render: (v) => <span className="font-medium">{v as string}</span> },
        { key: 'tax_id', label: 'CUIT', render: (v) => <span className="font-mono text-xs">{(v as string) || '-'}</span> },
        { key: 'contact_person', label: 'Contacto', render: (v) => (v as string) || '-' },
        { key: 'email', label: 'Email', render: (v) => v ? <span className="text-primary-600">{v as string}</span> : '-' },
        { key: 'phone', label: 'Telefono', render: (v) => (v as string) || '-' },
        { key: 'payment_terms', label: 'Cond. pago', render: (v) => (v as string) || '-' },
        { key: 'active', label: 'Estado', render: (v) => <Badge variant={v ? 'success' : 'secondary'}>{v ? 'Activo' : 'Inactivo'}</Badge> },
    ]

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Proveedores</h1>
                <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Nuevo proveedor</Button>
            </div>

            <DataTable
                data={suppliers} columns={columns} pagination={pagination}
                onPageChange={(p) => fetchSuppliers(p)} searchValue={search} onSearchChange={setSearch}
                searchPlaceholder="Buscar por nombre, CUIT o email..." isLoading={loading} emptyMessage="No se encontraron proveedores"
                actions={(row) => (
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDelete(row.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                )}
            />

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
                        <DialogDescription>Datos del proveedor</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2"><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" autoFocus /></div>
                        <div><Label>CUIT</Label><Input value={form.tax_id} onChange={(e) => setForm(f => ({ ...f, tax_id: e.target.value }))} className="mt-1" /></div>
                        <div><Label>Persona de contacto</Label><Input value={form.contact_person} onChange={(e) => setForm(f => ({ ...f, contact_person: e.target.value }))} className="mt-1" /></div>
                        <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1" /></div>
                        <div><Label>Telefono</Label><Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" /></div>
                        <div className="col-span-2"><Label>Direccion</Label><Input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} className="mt-1" /></div>
                        <div><Label>Condiciones de pago</Label><Input value={form.payment_terms} onChange={(e) => setForm(f => ({ ...f, payment_terms: e.target.value }))} className="mt-1" placeholder="ej: 30 dias" /></div>
                        <div className="flex items-end pb-1"><label className="flex items-center gap-2 text-sm"><Checkbox checked={form.active} onCheckedChange={(v) => setForm(f => ({ ...f, active: !!v }))} /> Activo</label></div>
                        <div className="col-span-2"><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" rows={2} /></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
                        <Button onClick={handleSave}>Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
