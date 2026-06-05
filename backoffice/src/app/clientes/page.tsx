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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'
import { Plus, Pencil, Trash2, Eye, History } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Customer, Sale, Pagination } from '@/types'

type CustomerForm = { name: string; tax_id: string; email: string; phone: string; address: string; type: string; discount_percentage: string; credit_limit: string; notes: string; active: boolean }
const emptyForm: CustomerForm = { name: '', tax_id: '', email: '', phone: '', address: '', type: 'regular', discount_percentage: '0', credit_limit: '0', notes: '', active: true }

export default function ClientesPage() {
    const api = useApi()
    const router = useRouter()
    const [customers, setCustomers] = useState<Customer[]>([])
    const [pagination, setPagination] = useState<Pagination>({ totalItems: 0, totalPages: 0, currentPage: 1, perPage: 20 })
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<Customer | null>(null)
    const [form, setForm] = useState<CustomerForm>(emptyForm)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [customerSales, setCustomerSales] = useState<Sale[]>([])

    const fetchCustomers = useCallback(async (page = 1) => {
        setLoading(true)
        const params: Record<string, string> = { page: String(page), limit: '20' }
        if (search) params.search = search
        if (typeFilter) params.type = typeFilter
        const res = await api.get<Customer[]>('/customers', params)
        if (res.status === 1 && res.data) {
            setCustomers(Array.isArray(res.data) ? res.data : [])
            if (res.pagination) setPagination(res.pagination)
        }
        setLoading(false)
    }, [api, search, typeFilter])

    useEffect(() => { fetchCustomers() }, [fetchCustomers])

    const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
    const openEdit = (c: Customer) => {
        setEditing(c)
        setForm({ name: c.name, tax_id: c.tax_id || '', email: c.email || '', phone: c.phone || '', address: c.address || '', type: c.type, discount_percentage: String(c.discount_percentage), credit_limit: String(c.credit_limit), notes: c.notes || '', active: c.active })
        setShowModal(true)
    }

    const viewDetail = async (c: Customer) => {
        setSelectedCustomer(c)
        const res = await api.get<Sale[]>('/sales', { customer_id: String(c.id), limit: '10' })
        if (res.status === 1 && res.data) setCustomerSales(Array.isArray(res.data) ? res.data : [])
        setShowDetailModal(true)
    }

    const handleSave = async () => {
        if (!form.name.trim()) { toast({ title: 'El nombre es obligatorio', variant: 'destructive' }); return }
        const body = { ...form, discount_percentage: parseFloat(form.discount_percentage) || 0, credit_limit: parseFloat(form.credit_limit) || 0 }
        const res = editing ? await api.put(`/customers/${editing.id}`, body) : await api.post('/customers', body)
        if (res.status === 1) {
            toast({ title: editing ? 'Cliente actualizado' : 'Cliente creado', variant: 'success' })
            setShowModal(false); fetchCustomers(pagination.currentPage)
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Eliminar cliente?')) return
        const res = await api.del(`/customers/${id}`)
        if (res.status === 1) { toast({ title: 'Cliente eliminado', variant: 'success' }); fetchCustomers(pagination.currentPage) }
        else toast({ title: 'Error', description: res.message, variant: 'destructive' })
    }

    const columns: Column<Customer>[] = [
        { key: 'name', label: 'Nombre', sortable: true, render: (v) => <span className="font-medium">{v as string}</span> },
        { key: 'tax_id', label: 'CUIT', render: (v) => <span className="font-mono text-xs">{(v as string) || '-'}</span> },
        { key: 'type', label: 'Tipo', render: (v) => <Badge variant={v === 'wholesale' ? 'default' : 'secondary'}>{v === 'wholesale' ? 'Mayorista' : 'Minorista'}</Badge> },
        { key: 'email', label: 'Email', render: (v) => v ? <span className="text-primary-600 text-sm">{v as string}</span> : '-' },
        { key: 'phone', label: 'Telefono', render: (v) => (v as string) || '-' },
        { key: 'balance', label: 'Saldo', sortable: true, render: (v) => {
            const n = v as number
            return <span className={n > 0 ? 'text-red-600 font-semibold' : n < 0 ? 'text-green-600 font-semibold' : ''}>{formatCurrency(n)}</span>
        }},
        { key: 'active', label: 'Estado', render: (v) => <Badge variant={v ? 'success' : 'secondary'}>{v ? 'Activo' : 'Inactivo'}</Badge> },
    ]

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Clientes</h1>
                <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Nuevo cliente</Button>
            </div>

            <DataTable
                data={customers} columns={columns} pagination={pagination}
                onPageChange={(p) => fetchCustomers(p)} searchValue={search} onSearchChange={setSearch}
                searchPlaceholder="Buscar por nombre, CUIT, email..."
                filters={[{ key: 'type', label: 'Tipo', options: [{ value: 'regular', label: 'Minorista' }, { value: 'wholesale', label: 'Mayorista' }] }]}
                filterValues={{ type: typeFilter }}
                onFilterChange={(k, v) => { if (k === 'type') setTypeFilter(v) }}
                isLoading={loading} emptyMessage="No se encontraron clientes"
                actions={(row) => (
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => viewDetail(row)}><Eye className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Cuenta corriente" onClick={() => router.push(`/clientes/${row.id}`)}><History className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDelete(row.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                )}
            />

            {/* Create/Edit Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader><DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle><DialogDescription>Datos del cliente</DialogDescription></DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2"><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" autoFocus /></div>
                        <div><Label>CUIT</Label><Input value={form.tax_id} onChange={(e) => setForm(f => ({ ...f, tax_id: e.target.value }))} className="mt-1" /></div>
                        <div>
                            <Label>Tipo</Label>
                            <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="regular">Minorista</SelectItem>
                                    <SelectItem value="wholesale">Mayorista</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1" /></div>
                        <div><Label>Telefono</Label><Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" /></div>
                        <div className="col-span-2"><Label>Direccion</Label><Input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} className="mt-1" /></div>
                        <div><Label>Descuento (%)</Label><Input type="number" min={0} max={100} value={form.discount_percentage} onChange={(e) => setForm(f => ({ ...f, discount_percentage: e.target.value }))} className="mt-1" /></div>
                        <div><Label>Limite de credito</Label><Input type="number" min={0} value={form.credit_limit} onChange={(e) => setForm(f => ({ ...f, credit_limit: e.target.value }))} className="mt-1" /></div>
                        <div className="col-span-2 flex items-center gap-2"><Checkbox checked={form.active} onCheckedChange={(v) => setForm(f => ({ ...f, active: !!v }))} /><Label>Activo</Label></div>
                        <div className="col-span-2"><Label>Notas</Label><Textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" rows={2} /></div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button><Button onClick={handleSave}>Guardar</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Detail Modal */}
            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader><DialogTitle>{selectedCustomer?.name}</DialogTitle><DialogDescription>Detalle del cliente</DialogDescription></DialogHeader>
                    {selectedCustomer && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div><span className="text-gray-500">CUIT:</span> {selectedCustomer.tax_id || '-'}</div>
                                <div><span className="text-gray-500">Tipo:</span> {selectedCustomer.type === 'wholesale' ? 'Mayorista' : 'Minorista'}</div>
                                <div><span className="text-gray-500">Email:</span> {selectedCustomer.email || '-'}</div>
                                <div><span className="text-gray-500">Telefono:</span> {selectedCustomer.phone || '-'}</div>
                                <div><span className="text-gray-500">Saldo:</span> <span className={selectedCustomer.balance > 0 ? 'text-red-600 font-semibold' : ''}>{formatCurrency(selectedCustomer.balance)}</span></div>
                                <div><span className="text-gray-500">Limite credito:</span> {formatCurrency(selectedCustomer.credit_limit)}</div>
                            </div>
                            <Separator />
                            <div>
                                <p className="font-medium text-sm mb-2">Ultimas compras</p>
                                {customerSales.length === 0 ? (
                                    <p className="text-xs text-gray-400">Sin compras registradas</p>
                                ) : (
                                    <div className="space-y-2">
                                        {customerSales.map(sale => (
                                            <div key={sale.id} className="flex justify-between text-sm">
                                                <span>{sale.sale_number || `#${sale.id}`}</span>
                                                <span className="font-medium">{formatCurrency(sale.total)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <DialogFooter><Button variant="outline" onClick={() => setShowDetailModal(false)}>Cerrar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
