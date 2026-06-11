'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useApi } from '@/hooks/use-api'
import { toast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ProductPicker } from '@/components/common/ProductPicker'
import { formatCurrency } from '@/lib/utils'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Supplier, Branch } from '@/types'

interface OrderItem { product_id: string; variant_id: string; quantity: string; unit_cost: string }

export default function NuevaCompraPage() {
    const api = useApi()
    const router = useRouter()
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [branches, setBranches] = useState<Branch[]>([])
    const [supplierId, setSupplierId] = useState('')
    const [branchId, setBranchId] = useState('')
    const [expectedDate, setExpectedDate] = useState('')
    const [notes, setNotes] = useState('')
    const [items, setItems] = useState<OrderItem[]>([])
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        Promise.all([
            api.get<Supplier[]>('/suppliers', { active: 'true', limit: '200' }),
            api.get<Branch[]>('/branches'),
        ]).then(([sr, br]) => {
            if (sr.status === 1 && sr.data) setSuppliers(Array.isArray(sr.data) ? sr.data : [])
            if (br.status === 1 && br.data) setBranches(Array.isArray(br.data) ? br.data : [])
        })
    }, [api])

    const addItem = () => setItems(prev => [...prev, { product_id: '', variant_id: '', quantity: '1', unit_cost: '' }])
    const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))
    // Update funcional: permite varias llamadas seguidas (product_id + unit_cost) sin pisarse.
    const updateItem = (idx: number, field: string, value: string) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))

    const subtotal = items.reduce((s, i) => {
        const qty = parseFloat(i.quantity) || 0
        const cost = parseFloat(i.unit_cost) || 0
        return s + qty * cost
    }, 0)
    const taxAmount = subtotal * 0.21
    const total = subtotal + taxAmount

    const handleSubmit = async () => {
        if (!supplierId || !branchId || items.length === 0) {
            toast({ title: 'Completa proveedor, sucursal y agrega al menos un producto', variant: 'destructive' }); return
        }
        setSaving(true)
        const res = await api.post('/purchase-orders', {
            supplier_id: Number(supplierId),
            branch_id: Number(branchId),
            expected_date: expectedDate || null,
            notes,
            items: items.map(i => ({
                product_id: Number(i.product_id),
                variant_id: i.variant_id ? Number(i.variant_id) : null,
                quantity_ordered: Number(i.quantity),
                unit_cost: Number(i.unit_cost),
            })),
        })
        setSaving(false)
        if (res.status === 1) {
            toast({ title: 'Orden de compra creada', variant: 'success' })
            router.push('/compras')
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    return (
        <div>
            <div className="flex items-center gap-3 mb-6">
                <Link href="/compras"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
                <h1 className="text-2xl font-semibold tracking-tight">Nueva Orden de Compra</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader><CardTitle className="text-base">Datos de la orden</CardTitle></CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Proveedor *</Label>
                                    <Select value={supplierId} onValueChange={setSupplierId}>
                                        <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                                        <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Sucursal destino *</Label>
                                    <Select value={branchId} onValueChange={setBranchId}>
                                        <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccionar sucursal" /></SelectTrigger>
                                        <SelectContent>{branches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Fecha esperada de entrega</Label>
                                    <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className="mt-1" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base">Productos</CardTitle>
                                <Button variant="outline" size="sm" onClick={addItem}><Plus className="h-3 w-3 mr-1" /> Agregar</Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {items.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-6">Agrega productos a la orden de compra</p>
                            ) : (
                                <div className="space-y-3">
                                    {items.map((item, idx) => {
                                        return (
                                            <div key={idx} className="grid grid-cols-12 gap-2 items-end p-3 bg-muted rounded-lg">
                                                <div className="col-span-5">
                                                    <Label className="mb-1 block text-xs">Producto</Label>
                                                    <ProductPicker onChange={(p) => {
                                                        if (!p) return
                                                        updateItem(idx, 'product_id', String(p.id))
                                                        updateItem(idx, 'unit_cost', String(p.cost_price))
                                                    }} />
                                                </div>
                                                <div className="col-span-2">
                                                    <Label className="text-xs">Cantidad</Label>
                                                    <Input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} className="mt-1 h-8" />
                                                </div>
                                                <div className="col-span-2">
                                                    <Label className="text-xs">Costo unitario</Label>
                                                    <Input type="number" min={0} step={0.01} value={item.unit_cost} onChange={(e) => updateItem(idx, 'unit_cost', e.target.value)} className="mt-1 h-8" />
                                                </div>
                                                <div className="col-span-2 text-right">
                                                    <p className="text-xs text-muted-foreground">Subtotal</p>
                                                    <p className="font-semibold text-sm">{formatCurrency((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0))}</p>
                                                </div>
                                                <div className="col-span-1 flex justify-end">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(idx)}><Trash2 className="h-3 w-3" /></Button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle className="text-base">Resumen</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-muted-foreground">IVA (21%)</span><span>{formatCurrency(taxAmount)}</span></div>
                            <Separator />
                            <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{formatCurrency(total)}</span></div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <Label>Notas</Label>
                            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" rows={3} placeholder="Notas adicionales..." />
                        </CardContent>
                    </Card>

                    <Button className="w-full" size="lg" onClick={handleSubmit} disabled={saving}>
                        {saving ? 'Creando...' : 'Crear orden de compra'}
                    </Button>
                </div>
            </div>
        </div>
    )
}
