'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/use-api'
import { toast } from '@/hooks/use-toast'
import { DataTable, type Column } from '@/components/common/DataTable'
import { StockBadge } from '@/components/common/StockBadge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatCurrency } from '@/lib/utils'
import { SlidersHorizontal } from 'lucide-react'
import type { Stock, Branch, Product, Pagination } from '@/types'

export default function StockPage() {
    const api = useApi()
    const [stockEntries, setStockEntries] = useState<Stock[]>([])
    const [branches, setBranches] = useState<Branch[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [pagination, setPagination] = useState<Pagination>({ totalItems: 0, totalPages: 0, currentPage: 1, perPage: 20 })
    const [loading, setLoading] = useState(true)
    const [branchFilter, setBranchFilter] = useState('')
    const [search, setSearch] = useState('')
    const [showAdjustModal, setShowAdjustModal] = useState(false)
    const [adjustForm, setAdjustForm] = useState({ product_id: '', variant_id: '', branch_id: '', quantity: '', notes: '' })

    useEffect(() => {
        Promise.all([
            api.get<Branch[]>('/branches'),
            api.get<Product[]>('/products', { limit: '500', active: 'true' }),
        ]).then(([branchRes, prodRes]) => {
            if (branchRes.status === 1 && branchRes.data) setBranches(Array.isArray(branchRes.data) ? branchRes.data : [])
            if (prodRes.status === 1 && prodRes.data) setProducts(Array.isArray(prodRes.data) ? prodRes.data : [])
        })
    }, [api])

    const fetchStock = useCallback(async (page = 1) => {
        setLoading(true)
        const params: Record<string, string> = { page: String(page), limit: '20' }
        if (branchFilter) params.branch_id = branchFilter
        if (search) params.search = search
        const res = await api.get<Stock[]>('/stock', params)
        if (res.status === 1 && res.data) {
            setStockEntries(Array.isArray(res.data) ? res.data : [])
            if (res.pagination) setPagination(res.pagination)
        }
        setLoading(false)
    }, [api, branchFilter, search])

    useEffect(() => { fetchStock() }, [fetchStock])

    const handleAdjust = async () => {
        if (!adjustForm.product_id || !adjustForm.branch_id || !adjustForm.quantity) {
            toast({ title: 'Completa todos los campos', variant: 'destructive' }); return
        }
        const res = await api.post('/stock/adjust', {
            product_id: Number(adjustForm.product_id),
            variant_id: adjustForm.variant_id ? Number(adjustForm.variant_id) : null,
            branch_id: Number(adjustForm.branch_id),
            quantity: Number(adjustForm.quantity),
            notes: adjustForm.notes,
        })
        if (res.status === 1) {
            toast({ title: 'Stock ajustado', variant: 'success' })
            setShowAdjustModal(false)
            setAdjustForm({ product_id: '', variant_id: '', branch_id: '', quantity: '', notes: '' })
            fetchStock(pagination.currentPage)
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    const columns: Column<Stock>[] = [
        { key: 'product', label: 'Producto', render: (_, row) => (
            <div>
                <p className="font-medium">{row.product?.name || `#${row.product_id}`}</p>
                {row.product?.sku && <p className="text-xs text-muted-foreground font-mono">{row.product.sku}</p>}
            </div>
        )},
        { key: 'variant', label: 'Variante', render: (_, row) => row.variant?.name || '-' },
        { key: 'branch', label: 'Sucursal', render: (_, row) => row.branch?.name || '-' },
        { key: 'quantity', label: 'Stock', sortable: true, render: (v) => <span className="font-semibold">{v as number}</span> },
        { key: 'reserved_quantity', label: 'Reservado', render: (v) => v as number || 0 },
        { key: 'available', label: 'Disponible', render: (_, row) => {
            const avail = row.quantity - row.reserved_quantity
            return <span className={avail <= 0 ? 'text-destructive font-semibold' : 'font-semibold'}>{avail}</span>
        }},
        { key: 'alert', label: 'Alerta', render: (_, row) => (
            <StockBadge quantity={row.quantity} minAlert={row.product?.min_stock_alert ?? 0} reserved={row.reserved_quantity} />
        )},
    ]

    const selectedProduct = products.find(p => String(p.id) === adjustForm.product_id)

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Stock por sucursal</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Existencias actuales y ajustes de inventario</p>
                </div>
                <Button onClick={() => setShowAdjustModal(true)}>
                    <SlidersHorizontal className="h-4 w-4 mr-2" /> Ajustar stock
                </Button>
            </div>

            {branches.length > 1 && (
                <Tabs value={branchFilter || 'all'} onValueChange={(v) => setBranchFilter(v === 'all' ? '' : v)} className="mb-4">
                    <TabsList>
                        <TabsTrigger value="all">Todas</TabsTrigger>
                        {branches.map(b => <TabsTrigger key={b.id} value={String(b.id)}>{b.name}</TabsTrigger>)}
                    </TabsList>
                </Tabs>
            )}

            <DataTable
                data={stockEntries}
                columns={columns}
                pagination={pagination}
                onPageChange={(p) => fetchStock(p)}
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Buscar producto..."
                isLoading={loading}
                emptyMessage="Sin registros de stock"
            />

            {/* Adjust modal */}
            <Dialog open={showAdjustModal} onOpenChange={setShowAdjustModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ajustar stock</DialogTitle>
                        <DialogDescription>Valores positivos suman stock, negativos restan</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Producto *</Label>
                            <Select value={adjustForm.product_id} onValueChange={(v) => setAdjustForm(f => ({ ...f, product_id: v, variant_id: '' }))}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
                                <SelectContent>
                                    {products.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        {selectedProduct?.variants && selectedProduct.variants.length > 0 && (
                            <div>
                                <Label>Variante</Label>
                                <Select value={adjustForm.variant_id} onValueChange={(v) => setAdjustForm(f => ({ ...f, variant_id: v === '__none__' ? '' : v }))}>
                                    <SelectTrigger className="mt-1"><SelectValue placeholder="Sin variante" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">Sin variante</SelectItem>
                                        {selectedProduct.variants.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div>
                            <Label>Sucursal *</Label>
                            <Select value={adjustForm.branch_id} onValueChange={(v) => setAdjustForm(f => ({ ...f, branch_id: v }))}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar sucursal" /></SelectTrigger>
                                <SelectContent>
                                    {branches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div><Label>Cantidad (+ o -) *</Label><Input type="number" value={adjustForm.quantity} onChange={(e) => setAdjustForm(f => ({ ...f, quantity: e.target.value }))} className="mt-1" placeholder="ej: 10 o -5" /></div>
                        <div><Label>Motivo</Label><Textarea value={adjustForm.notes} onChange={(e) => setAdjustForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" rows={2} placeholder="Motivo del ajuste..." /></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAdjustModal(false)}>Cancelar</Button>
                        <Button onClick={handleAdjust}>Ajustar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
