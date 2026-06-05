'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/use-api'
import { toast } from '@/hooks/use-toast'
import { DataTable, type Column } from '@/components/common/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'
import { Plus, Pencil, Trash2, DollarSign } from 'lucide-react'
import type { PriceList, PriceListItem, Product, Pagination } from '@/types'

const typeMap: Record<string, string> = { retail: 'Minorista', wholesale: 'Mayorista', special: 'Especial' }

interface PriceItemForm { product_id: string; price: string }

export default function ListasPrecioPage() {
    const api = useApi()
    const [lists, setLists] = useState<PriceList[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [pagination, setPagination] = useState<Pagination>({ totalItems: 0, totalPages: 0, currentPage: 1, perPage: 20 })
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<PriceList | null>(null)
    const [form, setForm] = useState({ name: '', type: 'retail', active: true })
    const [showItemsModal, setShowItemsModal] = useState(false)
    const [selectedList, setSelectedList] = useState<PriceList | null>(null)
    const [listItems, setListItems] = useState<PriceItemForm[]>([])

    useEffect(() => {
        api.get<Product[]>('/products', { limit: '500', active: 'true' }).then(res => {
            if (res.status === 1 && res.data) setProducts(Array.isArray(res.data) ? res.data : [])
        })
    }, [api])

    const fetchLists = useCallback(async (page = 1) => {
        setLoading(true)
        const res = await api.get<PriceList[]>('/price-lists', { page: String(page), limit: '20' })
        if (res.status === 1 && res.data) {
            setLists(Array.isArray(res.data) ? res.data : [])
            if (res.pagination) setPagination(res.pagination)
        }
        setLoading(false)
    }, [api])

    useEffect(() => { fetchLists() }, [fetchLists])

    const openCreate = () => { setEditing(null); setForm({ name: '', type: 'retail', active: true }); setShowModal(true) }
    const openEdit = (list: PriceList) => {
        setEditing(list); setForm({ name: list.name, type: list.type, active: list.active }); setShowModal(true)
    }

    const handleSave = async () => {
        if (!form.name.trim()) { toast({ title: 'El nombre es obligatorio', variant: 'destructive' }); return }
        const res = editing ? await api.put(`/price-lists/${editing.id}`, form) : await api.post('/price-lists', form)
        if (res.status === 1) {
            toast({ title: editing ? 'Lista actualizada' : 'Lista creada', variant: 'success' })
            setShowModal(false); fetchLists(pagination.currentPage)
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Eliminar lista de precios?')) return
        const res = await api.del(`/price-lists/${id}`)
        if (res.status === 1) { toast({ title: 'Lista eliminada', variant: 'success' }); fetchLists(pagination.currentPage) }
        else toast({ title: 'Error', description: res.message, variant: 'destructive' })
    }

    const openItems = async (list: PriceList) => {
        const res = await api.get<PriceList>(`/price-lists/${list.id}`)
        if (res.status === 1 && res.data) {
            setSelectedList(res.data)
            setListItems((res.data.items || []).map(i => ({ product_id: String(i.product_id), price: String(i.price) })))
            setShowItemsModal(true)
        }
    }

    const addPriceItem = () => setListItems([...listItems, { product_id: '', price: '' }])
    const removePriceItem = (idx: number) => setListItems(listItems.filter((_, i) => i !== idx))

    const saveItems = async () => {
        if (!selectedList) return
        const res = await api.put(`/price-lists/${selectedList.id}`, {
            items: listItems.filter(i => i.product_id && i.price).map(i => ({
                product_id: Number(i.product_id), price: Number(i.price),
            })),
        })
        if (res.status === 1) {
            toast({ title: 'Precios actualizados', variant: 'success' })
            setShowItemsModal(false); fetchLists(pagination.currentPage)
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    const columns: Column<PriceList>[] = [
        { key: 'name', label: 'Nombre', sortable: true, render: (v) => <span className="font-medium">{v as string}</span> },
        { key: 'type', label: 'Tipo', render: (v) => <Badge variant={v === 'wholesale' ? 'default' : v === 'special' ? 'warning' : 'secondary'}>{typeMap[v as string] || v}</Badge> },
        { key: 'items', label: 'Productos', render: (_, row) => row.items?.length || 0 },
        { key: 'active', label: 'Estado', render: (v) => <Badge variant={v ? 'success' : 'secondary'}>{v ? 'Activa' : 'Inactiva'}</Badge> },
    ]

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Listas de precio</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Precios diferenciados por canal o cliente</p>
                </div>
                <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Nueva lista</Button>
            </div>

            <DataTable
                data={lists} columns={columns} pagination={pagination} onPageChange={(p) => fetchLists(p)}
                isLoading={loading} emptyMessage="No hay listas de precio"
                actions={(row) => (
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openItems(row)} title="Gestionar precios"><DollarSign className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/80" onClick={() => handleDelete(row.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                )}
            />

            {/* Create/Edit list */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>{editing ? 'Editar lista' : 'Nueva lista de precios'}</DialogTitle><DialogDescription>Datos de la lista</DialogDescription></DialogHeader>
                    <div className="space-y-4">
                        <div><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" autoFocus /></div>
                        <div>
                            <Label>Tipo</Label>
                            <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v }))}>
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="retail">Minorista</SelectItem>
                                    <SelectItem value="wholesale">Mayorista</SelectItem>
                                    <SelectItem value="special">Especial</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.active} onCheckedChange={(v) => setForm(f => ({ ...f, active: !!v }))} /> Activa</label>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button><Button onClick={handleSave}>Guardar</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manage prices */}
            <Dialog open={showItemsModal} onOpenChange={setShowItemsModal}>
                <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Precios - {selectedList?.name}</DialogTitle><DialogDescription>Define los precios para cada producto</DialogDescription></DialogHeader>
                    <div className="space-y-3">
                        {listItems.map((item, idx) => (
                            <div key={idx} className="flex items-end gap-2">
                                <div className="flex-1">
                                    <Label className="text-xs">Producto</Label>
                                    <Select value={item.product_id} onValueChange={(v) => setListItems(prev => prev.map((it, i) => i === idx ? { ...it, product_id: v } : it))}>
                                        <SelectTrigger className="mt-1 h-8"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                        <SelectContent>{products.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name} ({formatCurrency(p.sale_price)})</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="w-32">
                                    <Label className="text-xs">Precio</Label>
                                    <Input type="number" min={0} step={0.01} value={item.price} onChange={(e) => setListItems(prev => prev.map((it, i) => i === idx ? { ...it, price: e.target.value } : it))} className="mt-1 h-8" />
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removePriceItem(idx)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addPriceItem}><Plus className="h-3 w-3 mr-1" /> Agregar producto</Button>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowItemsModal(false)}>Cancelar</Button>
                        <Button onClick={saveItems}>Guardar precios</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
