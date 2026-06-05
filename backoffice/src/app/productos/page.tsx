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
import { Plus, Pencil, Trash2, Package } from 'lucide-react'
import type { Product, ProductVariant, Category, Pagination } from '@/types'

type ProductForm = {
    name: string; sku: string; barcode: string; description: string; category_id: string;
    unit: string; cost_price: string; sale_price: string; tax_rate: string; min_stock_alert: string;
    image_url: string; track_stock: boolean; active: boolean;
    variants: { id?: number; name: string; sku: string; barcode: string; cost_price: string; sale_price: string; active: boolean }[];
}

const emptyForm: ProductForm = {
    name: '', sku: '', barcode: '', description: '', category_id: '', unit: 'UN',
    cost_price: '', sale_price: '', tax_rate: '21', min_stock_alert: '5',
    image_url: '', track_stock: true, active: true, variants: [],
}

export default function ProductosPage() {
    const api = useApi()
    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [pagination, setPagination] = useState<Pagination>({ totalItems: 0, totalPages: 0, currentPage: 1, perPage: 20 })
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [catFilter, setCatFilter] = useState('')
    const [activeFilter, setActiveFilter] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<Product | null>(null)
    const [form, setForm] = useState<ProductForm>(emptyForm)
    const [saving, setSaving] = useState(false)

    const fetchProducts = useCallback(async (page = 1) => {
        setLoading(true)
        const params: Record<string, string> = { page: String(page), limit: '20' }
        if (search) params.search = search
        if (catFilter) params.category_id = catFilter
        if (activeFilter) params.active = activeFilter
        const res = await api.get<Product[]>('/products', params)
        if (res.status === 1 && res.data) {
            setProducts(Array.isArray(res.data) ? res.data : [])
            if (res.pagination) setPagination(res.pagination)
        }
        setLoading(false)
    }, [api, search, catFilter, activeFilter])

    useEffect(() => { fetchProducts() }, [fetchProducts])

    useEffect(() => {
        api.get<Category[]>('/categories').then(res => {
            if (res.status === 1 && res.data) setCategories(Array.isArray(res.data) ? res.data : [])
        })
    }, [api])

    const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }

    const openEdit = (product: Product) => {
        setEditing(product)
        setForm({
            name: product.name, sku: product.sku || '', barcode: product.barcode || '',
            description: product.description || '', category_id: product.category_id ? String(product.category_id) : '',
            unit: product.unit, cost_price: String(product.cost_price), sale_price: String(product.sale_price),
            tax_rate: String(product.tax_rate), min_stock_alert: String(product.min_stock_alert),
            image_url: product.image_url || '', track_stock: product.track_stock, active: product.active,
            variants: (product.variants || []).map(v => ({
                id: v.id, name: v.name, sku: v.sku || '', barcode: v.barcode || '',
                cost_price: v.cost_price != null ? String(v.cost_price) : '', sale_price: v.sale_price != null ? String(v.sale_price) : '',
                active: v.active,
            })),
        })
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!form.name.trim()) { toast({ title: 'El nombre es obligatorio', variant: 'destructive' }); return }
        setSaving(true)
        const body = {
            ...form,
            category_id: form.category_id ? Number(form.category_id) : null,
            cost_price: parseFloat(form.cost_price) || 0,
            sale_price: parseFloat(form.sale_price) || 0,
            tax_rate: parseFloat(form.tax_rate) || 21,
            min_stock_alert: parseInt(form.min_stock_alert) || 0,
            variants: form.variants.map(v => ({
                ...v,
                cost_price: v.cost_price ? parseFloat(v.cost_price) : null,
                sale_price: v.sale_price ? parseFloat(v.sale_price) : null,
            })),
        }
        const res = editing
            ? await api.put(`/products/${editing.id}`, body)
            : await api.post('/products', body)
        setSaving(false)
        if (res.status === 1) {
            toast({ title: editing ? 'Producto actualizado' : 'Producto creado', variant: 'success' })
            setShowModal(false)
            fetchProducts(pagination.currentPage)
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Eliminar producto?')) return
        const res = await api.del(`/products/${id}`)
        if (res.status === 1) { toast({ title: 'Producto eliminado', variant: 'success' }); fetchProducts(pagination.currentPage) }
        else toast({ title: 'Error', description: res.message, variant: 'destructive' })
    }

    const addVariant = () => setForm(f => ({ ...f, variants: [...f.variants, { name: '', sku: '', barcode: '', cost_price: '', sale_price: '', active: true }] }))
    const removeVariant = (idx: number) => setForm(f => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) }))
    const updateVariant = (idx: number, field: string, value: string | boolean) => setForm(f => ({
        ...f, variants: f.variants.map((v, i) => i === idx ? { ...v, [field]: value } : v),
    }))

    const columns: Column<Product>[] = [
        { key: 'name', label: 'Producto', sortable: true, render: (_, row) => (
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center"><Package className="h-4 w-4 text-gray-400" /></div>
                <div>
                    <p className="font-medium">{row.name}</p>
                    {row.variants && row.variants.length > 0 && <p className="text-xs text-gray-400">{row.variants.length} variantes</p>}
                </div>
            </div>
        )},
        { key: 'sku', label: 'SKU', render: (v) => <span className="text-gray-500 font-mono text-xs">{(v as string) || '-'}</span> },
        { key: 'category', label: 'Categoria', render: (_, row) => row.category?.name || '-' },
        { key: 'sale_price', label: 'Precio', sortable: true, render: (v) => <span className="font-semibold">{formatCurrency(v as number)}</span> },
        { key: 'cost_price', label: 'Costo', sortable: true, render: (v) => <span className="text-gray-500">{formatCurrency(v as number)}</span> },
        { key: 'active', label: 'Estado', render: (v) => <Badge variant={v ? 'success' : 'secondary'}>{v ? 'Activo' : 'Inactivo'}</Badge> },
    ]

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Productos</h1>
                <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Nuevo producto</Button>
            </div>

            <DataTable
                data={products}
                columns={columns}
                pagination={pagination}
                onPageChange={(p) => fetchProducts(p)}
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Buscar por nombre, SKU o codigo de barras..."
                filters={[
                    { key: 'category', label: 'Categoria', options: categories.map(c => ({ value: String(c.id), label: c.name })) },
                    { key: 'active', label: 'Estado', options: [{ value: 'true', label: 'Activos' }, { value: 'false', label: 'Inactivos' }] },
                ]}
                filterValues={{ category: catFilter, active: activeFilter }}
                onFilterChange={(k, v) => { if (k === 'category') setCatFilter(v); if (k === 'active') setActiveFilter(v) }}
                isLoading={loading}
                emptyMessage="No se encontraron productos"
                actions={(row) => (
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDelete(row.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                )}
            />

            {/* Product modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
                        <DialogDescription>Completa los datos del producto</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label>Nombre *</Label>
                                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
                            </div>
                            <div><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm(f => ({ ...f, sku: e.target.value }))} className="mt-1" /></div>
                            <div><Label>Codigo de barras</Label><Input value={form.barcode} onChange={(e) => setForm(f => ({ ...f, barcode: e.target.value }))} className="mt-1" /></div>
                            <div>
                                <Label>Categoria</Label>
                                <Select value={form.category_id} onValueChange={(v) => setForm(f => ({ ...f, category_id: v === '__none__' ? '' : v }))}>
                                    <SelectTrigger className="mt-1"><SelectValue placeholder="Sin categoria" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">Sin categoria</SelectItem>
                                        {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Unidad</Label>
                                <Select value={form.unit} onValueChange={(v) => setForm(f => ({ ...f, unit: v }))}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="UN">Unidad</SelectItem>
                                        <SelectItem value="KG">Kilogramo</SelectItem>
                                        <SelectItem value="LT">Litro</SelectItem>
                                        <SelectItem value="MT">Metro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div><Label>Costo</Label><Input type="number" min={0} step={0.01} value={form.cost_price} onChange={(e) => setForm(f => ({ ...f, cost_price: e.target.value }))} className="mt-1" /></div>
                            <div><Label>Precio de venta</Label><Input type="number" min={0} step={0.01} value={form.sale_price} onChange={(e) => setForm(f => ({ ...f, sale_price: e.target.value }))} className="mt-1" /></div>
                            <div><Label>IVA (%)</Label><Input type="number" min={0} step={0.01} value={form.tax_rate} onChange={(e) => setForm(f => ({ ...f, tax_rate: e.target.value }))} className="mt-1" /></div>
                            <div><Label>Alerta stock minimo</Label><Input type="number" min={0} value={form.min_stock_alert} onChange={(e) => setForm(f => ({ ...f, min_stock_alert: e.target.value }))} className="mt-1" /></div>
                            <div className="col-span-2">
                                <Label>Descripcion</Label>
                                <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="mt-1" rows={2} />
                            </div>
                            <div className="col-span-2"><Label>URL de imagen</Label><Input value={form.image_url} onChange={(e) => setForm(f => ({ ...f, image_url: e.target.value }))} className="mt-1" placeholder="https://..." /></div>
                        </div>
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox checked={form.track_stock} onCheckedChange={(v) => setForm(f => ({ ...f, track_stock: !!v }))} /> Controlar stock
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <Checkbox checked={form.active} onCheckedChange={(v) => setForm(f => ({ ...f, active: !!v }))} /> Activo
                            </label>
                        </div>

                        <Separator />
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <Label className="text-base">Variantes</Label>
                                <Button variant="outline" size="sm" onClick={addVariant}><Plus className="h-3 w-3 mr-1" /> Agregar</Button>
                            </div>
                            {form.variants.length === 0 ? (
                                <p className="text-sm text-gray-400">Sin variantes (producto simple)</p>
                            ) : (
                                <div className="space-y-3">
                                    {form.variants.map((v, idx) => (
                                        <div key={idx} className="grid grid-cols-6 gap-2 items-end p-3 bg-gray-50 rounded-lg">
                                            <div className="col-span-2"><Label className="text-xs">Nombre</Label><Input value={v.name} onChange={(e) => updateVariant(idx, 'name', e.target.value)} className="mt-1 h-8 text-sm" /></div>
                                            <div><Label className="text-xs">SKU</Label><Input value={v.sku} onChange={(e) => updateVariant(idx, 'sku', e.target.value)} className="mt-1 h-8 text-sm" /></div>
                                            <div><Label className="text-xs">Costo</Label><Input type="number" value={v.cost_price} onChange={(e) => updateVariant(idx, 'cost_price', e.target.value)} className="mt-1 h-8 text-sm" /></div>
                                            <div><Label className="text-xs">Precio</Label><Input type="number" value={v.sale_price} onChange={(e) => updateVariant(idx, 'sale_price', e.target.value)} className="mt-1 h-8 text-sm" /></div>
                                            <div className="flex items-center gap-2">
                                                <Checkbox checked={v.active} onCheckedChange={(c) => updateVariant(idx, 'active', !!c)} />
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => removeVariant(idx)}><Trash2 className="h-3 w-3" /></Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
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
