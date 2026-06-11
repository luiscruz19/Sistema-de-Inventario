'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/use-api'
import { toast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { StockBadge } from '@/components/common/StockBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { Pagination } from '@/components/common/Pagination'
import { PageHead } from '@/components/common/PageHead'
import { ProductThumb } from '@/components/common/ProductThumb'
import { useScreenActions } from '@/components/command/screen-actions'
import { formatCurrency } from '@/lib/utils'
import { Plus, Pencil, Trash2, Search, PackageX } from 'lucide-react'
import type { Product, Category, Pagination as PaginationType } from '@/types'

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

const stockOf = (p: Product): number | null => {
    if (!p.track_stock) return null
    return p.stockEntries?.reduce((acc, e) => acc + Number(e.quantity) - Number(e.reserved_quantity), 0) ?? null
}

export default function ProductosPage() {
    const api = useApi()
    const [products, setProducts] = useState<Product[]>([])
    const [categories, setCategories] = useState<Category[]>([])
    const [pagination, setPagination] = useState<PaginationType>({ totalItems: 0, totalPages: 0, currentPage: 1, perPage: 20 })
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [catFilter, setCatFilter] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<Product | null>(null)
    const [form, setForm] = useState<ProductForm>(emptyForm)
    const [saving, setSaving] = useState(false)

    const fetchProducts = useCallback(async (page = 1) => {
        setLoading(true)
        const params: Record<string, string> = { page: String(page), limit: '20' }
        if (search) params.search = search
        if (catFilter) params.category_id = catFilter
        const res = await api.get<Product[]>('/products', params)
        if (res.status === 1 && res.data) {
            setProducts(Array.isArray(res.data) ? res.data : [])
            if (res.pagination) setPagination(res.pagination)
        }
        setLoading(false)
    }, [api, search, catFilter])

    useEffect(() => { fetchProducts(1) }, [fetchProducts])

    useEffect(() => {
        api.get<Category[]>('/categories').then(res => {
            if (res.status === 1 && Array.isArray(res.data)) setCategories(res.data)
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
        const res = editing ? await api.put(`/products/${editing.id}`, body) : await api.post('/products', body)
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
        if (!confirm('¿Eliminar producto?')) return
        const res = await api.del(`/products/${id}`)
        if (res.status === 1) { toast({ title: 'Producto eliminado', variant: 'success' }); fetchProducts(pagination.currentPage) }
        else toast({ title: 'Error', description: res.message, variant: 'destructive' })
    }

    const addVariant = () => setForm(f => ({ ...f, variants: [...f.variants, { name: '', sku: '', barcode: '', cost_price: '', sale_price: '', active: true }] }))
    const removeVariant = (idx: number) => setForm(f => ({ ...f, variants: f.variants.filter((_, i) => i !== idx) }))
    const updateVariant = (idx: number, field: string, value: string | boolean) => setForm(f => ({
        ...f, variants: f.variants.map((v, i) => i === idx ? { ...v, [field]: value } : v),
    }))

    useScreenActions({
        primary: { label: 'Nuevo producto', icon: Plus, run: openCreate },
        search: () => document.getElementById('productos-search')?.focus(),
        searchLabel: 'Buscar productos',
    }, [])

    return (
        <div>
            <PageHead title="Productos" sub={`${pagination.totalItems} ${pagination.totalItems === 1 ? 'producto' : 'productos'}`}>
                <Button onClick={openCreate}><Plus className="mr-2 h-[15px] w-[15px]" /> Nuevo producto</Button>
            </PageHead>

            <div className="mb-3.5 flex flex-wrap gap-2.5">
                <div className="relative w-full max-w-[320px] flex-1 min-w-[220px]">
                    <Search className="absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-muted-foreground" />
                    <Input id="productos-search" className="pl-9" placeholder="Buscar por nombre o SKU..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="w-[200px]">
                    <Select value={catFilter || '__all__'} onValueChange={v => setCatFilter(v === '__all__' ? '' : v)}>
                        <SelectTrigger><SelectValue placeholder="Todas las categorías" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">Todas las categorías</SelectItem>
                            {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {loading ? (
                <div className="h-64 animate-pulse rounded-xl border bg-muted/30" />
            ) : products.length === 0 ? (
                <EmptyState icon={PackageX} title="Sin resultados" description="No hay productos que coincidan con el filtro." action={<Button size="sm" onClick={openCreate}>Nuevo producto</Button>} />
            ) : (
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Producto</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Categoría</TableHead>
                                <TableHead>Precio</TableHead>
                                <TableHead>Stock</TableHead>
                                <TableHead className="w-px text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.map(p => {
                                const stock = stockOf(p)
                                return (
                                    <TableRow key={p.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <ProductThumb src={p.image_url} />
                                                <div className="min-w-0">
                                                    <p className="font-medium">{p.name}</p>
                                                    {p.variants && p.variants.length > 0 && <p className="text-xs text-muted-foreground">{p.variants.length} variantes</p>}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs tabular-nums text-muted-foreground">{p.sku || '—'}</TableCell>
                                        <TableCell>{p.category?.name ? <Badge variant="secondary">{p.category.name}</Badge> : <span className="text-muted-foreground">—</span>}</TableCell>
                                        <TableCell className="tabular-nums">{formatCurrency(p.sale_price)}</TableCell>
                                        <TableCell>{stock === null ? <span className="text-sm text-muted-foreground">No controla</span> : <StockBadge quantity={stock} minAlert={p.min_stock_alert} />}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {!loading && products.length > 0 && (
                <div className="mt-3.5">
                    <Pagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} totalItems={pagination.totalItems} perPage={pagination.perPage} onPageChange={fetchProducts} />
                </div>
            )}

            {/* Modal de producto */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
                        <DialogDescription>Completá los datos del producto.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label className="mb-1.5 block" required>Nombre</Label>
                                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
                            </div>
                            <div><Label className="mb-1.5 block">SKU</Label><Input value={form.sku} onChange={(e) => setForm(f => ({ ...f, sku: e.target.value }))} /></div>
                            <div><Label className="mb-1.5 block">Código de barras</Label><Input value={form.barcode} onChange={(e) => setForm(f => ({ ...f, barcode: e.target.value }))} /></div>
                            <div>
                                <Label className="mb-1.5 block">Categoría</Label>
                                <Select value={form.category_id || '__none__'} onValueChange={(v) => setForm(f => ({ ...f, category_id: v === '__none__' ? '' : v }))}>
                                    <SelectTrigger><SelectValue placeholder="Sin categoría" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">Sin categoría</SelectItem>
                                        {categories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="mb-1.5 block">Unidad</Label>
                                <Select value={form.unit} onValueChange={(v) => setForm(f => ({ ...f, unit: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="UN">Unidad</SelectItem>
                                        <SelectItem value="KG">Kilogramo</SelectItem>
                                        <SelectItem value="LT">Litro</SelectItem>
                                        <SelectItem value="MT">Metro</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div><Label className="mb-1.5 block">Costo</Label><Input type="number" min={0} step={0.01} value={form.cost_price} onChange={(e) => setForm(f => ({ ...f, cost_price: e.target.value }))} /></div>
                            <div><Label className="mb-1.5 block" required>Precio de venta</Label><Input type="number" min={0} step={0.01} value={form.sale_price} onChange={(e) => setForm(f => ({ ...f, sale_price: e.target.value }))} /></div>
                            <div><Label className="mb-1.5 block">IVA (%)</Label><Input type="number" min={0} step={0.01} value={form.tax_rate} onChange={(e) => setForm(f => ({ ...f, tax_rate: e.target.value }))} /></div>
                            <div><Label className="mb-1.5 block">Alerta stock mínimo</Label><Input type="number" min={0} value={form.min_stock_alert} onChange={(e) => setForm(f => ({ ...f, min_stock_alert: e.target.value }))} /></div>
                            <div className="col-span-2">
                                <Label className="mb-1.5 block">Descripción</Label>
                                <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
                            </div>
                            <div className="col-span-2"><Label className="mb-1.5 block">URL de imagen</Label><Input value={form.image_url} onChange={(e) => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." /></div>
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
                            <div className="mb-3 flex items-center justify-between">
                                <Label className="text-base">Variantes</Label>
                                <Button variant="outline" size="sm" onClick={addVariant}><Plus className="mr-1 h-3 w-3" /> Agregar</Button>
                            </div>
                            {form.variants.length === 0 ? (
                                <p className="text-sm text-muted-foreground">Sin variantes (producto simple)</p>
                            ) : (
                                <div className="space-y-3">
                                    {form.variants.map((v, idx) => (
                                        <div key={idx} className="grid grid-cols-6 items-end gap-2 rounded-lg bg-muted p-3">
                                            <div className="col-span-2"><Label className="text-xs">Nombre</Label><Input value={v.name} onChange={(e) => updateVariant(idx, 'name', e.target.value)} className="mt-1 h-8 text-sm" /></div>
                                            <div><Label className="text-xs">SKU</Label><Input value={v.sku} onChange={(e) => updateVariant(idx, 'sku', e.target.value)} className="mt-1 h-8 text-sm" /></div>
                                            <div><Label className="text-xs">Costo</Label><Input type="number" value={v.cost_price} onChange={(e) => updateVariant(idx, 'cost_price', e.target.value)} className="mt-1 h-8 text-sm" /></div>
                                            <div><Label className="text-xs">Precio</Label><Input type="number" value={v.sale_price} onChange={(e) => updateVariant(idx, 'sale_price', e.target.value)} className="mt-1 h-8 text-sm" /></div>
                                            <div className="flex items-center gap-2">
                                                <Checkbox checked={v.active} onCheckedChange={(c) => updateVariant(idx, 'active', !!c)} />
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeVariant(idx)}><Trash2 className="h-3 w-3" /></Button>
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
