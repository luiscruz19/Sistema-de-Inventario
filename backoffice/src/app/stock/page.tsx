'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/use-api'
import { toast } from '@/hooks/use-toast'
import { DataTable, type Column } from '@/components/common/DataTable'
import { StockBadge } from '@/components/common/StockBadge'
import { ProductPicker } from '@/components/common/ProductPicker'
import { PageHead } from '@/components/common/PageHead'
import { StatCard } from '@/components/ui/stat-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useScreenActions } from '@/components/command/screen-actions'
import { formatCurrency } from '@/lib/utils'
import { SlidersHorizontal } from 'lucide-react'
import type { Stock, Branch, Product, Pagination } from '@/types'

export default function StockPage() {
    const api = useApi()
    const [stockEntries, setStockEntries] = useState<Stock[]>([])
    const [branches, setBranches] = useState<Branch[]>([])
    const [products, setProducts] = useState<Product[]>([])
    // Disponible total por product_id, agregado desde el snapshot completo de /stock.
    // /products NO incluye stockEntries (solo getById lo hace), por eso los KPIs
    // se derivan de /stock que ya trae quantity/reserved_quantity por sucursal.
    const [availableByProduct, setAvailableByProduct] = useState<Record<number, number>>({})
    const [pagination, setPagination] = useState<Pagination>({ totalItems: 0, totalPages: 0, currentPage: 1, perPage: 20 })
    const [loading, setLoading] = useState(true)
    const [branchFilter, setBranchFilter] = useState('')
    const [search, setSearch] = useState('')
    const [showAdjustModal, setShowAdjustModal] = useState(false)
    const [adjustForm, setAdjustForm] = useState({ product_id: '', variant_id: '', branch_id: '', quantity: '', notes: '' })
    const [adjustProduct, setAdjustProduct] = useState<Product | null>(null)

    useEffect(() => {
        Promise.all([
            api.get<Branch[]>('/branches'),
            api.get<Product[]>('/products', { limit: '500', active: 'true' }),
            api.get<Stock[]>('/stock', { limit: '1000' }),
        ]).then(([branchRes, prodRes, stockRes]) => {
            if (branchRes.status === 1 && branchRes.data) setBranches(Array.isArray(branchRes.data) ? branchRes.data : [])
            if (prodRes.status === 1 && prodRes.data) setProducts(Array.isArray(prodRes.data) ? prodRes.data : [])
            if (stockRes.status === 1 && Array.isArray(stockRes.data)) {
                const map: Record<number, number> = {}
                for (const e of stockRes.data) {
                    const avail = (Number(e.quantity) || 0) - (Number(e.reserved_quantity) || 0)
                    map[e.product_id] = (map[e.product_id] ?? 0) + avail
                }
                setAvailableByProduct(map)
            }
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [api])

    const refreshKpis = useCallback(async () => {
        const res = await api.get<Stock[]>('/stock', { limit: '1000' })
        if (res.status === 1 && Array.isArray(res.data)) {
            const map: Record<number, number> = {}
            for (const e of res.data) {
                const avail = (Number(e.quantity) || 0) - (Number(e.reserved_quantity) || 0)
                map[e.product_id] = (map[e.product_id] ?? 0) + avail
            }
            setAvailableByProduct(map)
        }
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
        if (!adjustForm.notes.trim()) {
            toast({ title: 'Indicá el motivo del ajuste', variant: 'destructive' }); return
        }
        // El modal usa semántica de variación (+ suma / - resta), por eso mode 'delta'.
        // El backend (stock.controller.adjust) por defecto usa mode 'set' (valor absoluto)
        // y rechaza negativos; además exige un motivo (motivo || notes).
        const res = await api.post('/stock/adjust', {
            product_id: Number(adjustForm.product_id),
            variant_id: adjustForm.variant_id ? Number(adjustForm.variant_id) : null,
            branch_id: Number(adjustForm.branch_id),
            quantity: Number(adjustForm.quantity),
            mode: 'delta',
            notes: adjustForm.notes,
        })
        if (res.status === 1) {
            toast({ title: 'Stock ajustado', variant: 'success' })
            setShowAdjustModal(false)
            setAdjustForm({ product_id: '', variant_id: '', branch_id: '', quantity: '', notes: '' })
            setAdjustProduct(null)
            fetchStock(pagination.currentPage)
            refreshKpis()
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
        { key: 'quantity', label: 'Stock', sortable: true, render: (v) => <span className="font-semibold">{Number(v)}</span> },
        { key: 'reserved_quantity', label: 'Reservado', render: (v) => Number(v) || 0 },
        { key: 'available', label: 'Disponible', render: (_, row) => {
            const avail = Number(row.quantity) - Number(row.reserved_quantity)
            return <span className={avail <= 0 ? 'text-destructive font-semibold' : 'font-semibold'}>{avail}</span>
        }},
        { key: 'alert', label: 'Alerta', render: (_, row) => (
            <StockBadge quantity={Number(row.quantity)} minAlert={Number(row.product?.min_stock_alert ?? 0)} reserved={Number(row.reserved_quantity)} />
        )},
    ]

    useScreenActions({
        primary: { label: 'Ajustar stock', icon: SlidersHorizontal, run: () => setShowAdjustModal(true) },
    }, [])

    const stockOf = (p: Product): number => availableByProduct[p.id] ?? 0
    const tracked = products.filter(p => p.track_stock)
    const sinStock = tracked.filter(p => stockOf(p) <= 0).length
    const porReponer = tracked.filter(p => { const s = stockOf(p); return s > 0 && s <= Number(p.min_stock_alert) }).length
    const valorizado = tracked.reduce((acc, p) => acc + stockOf(p) * Number(p.cost_price), 0)

    return (
        <div>
            <PageHead title="Stock" sub="Control de inventario · Sucursal Centro">
                <Button variant="outline" onClick={() => setShowAdjustModal(true)}>
                    <SlidersHorizontal className="mr-2 h-[15px] w-[15px]" /> Ajustar stock
                </Button>
            </PageHead>

            <div className="mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <StatCard label="Sin stock" value={sinStock} delta="agotados" deltaDirection={sinStock > 0 ? 'down' : 'muted'} />
                <StatCard label="Por reponer" value={porReponer} delta="≤ mínimo" deltaDirection={porReponer > 0 ? 'down' : 'muted'} />
                <StatCard label="Stock valorizado" value={formatCurrency(valorizado)} delta="a costo" />
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
                            <Label className="mb-1 block">Producto *</Label>
                            <ProductPicker
                                selected={adjustProduct}
                                onChange={(p) => { setAdjustProduct(p); setAdjustForm(f => ({ ...f, product_id: p ? String(p.id) : '', variant_id: '' })) }}
                            />
                        </div>
                        {adjustProduct?.variants && adjustProduct.variants.length > 0 && (
                            <div>
                                <Label>Variante</Label>
                                <Select value={adjustForm.variant_id || '__none__'} onValueChange={(v) => setAdjustForm(f => ({ ...f, variant_id: v === '__none__' ? '' : v }))}>
                                    <SelectTrigger className="mt-1"><SelectValue placeholder="Sin variante" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__none__">Sin variante</SelectItem>
                                        {adjustProduct.variants.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}
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
                        <div><Label>Motivo *</Label><Textarea value={adjustForm.notes} onChange={(e) => setAdjustForm(f => ({ ...f, notes: e.target.value }))} className="mt-1" rows={2} placeholder="Motivo del ajuste..." /></div>
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
