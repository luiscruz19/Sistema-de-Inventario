'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useApi } from '@/hooks/use-api'
import { useInvoices } from '@/hooks/use-invoices'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import type { Sale, Customer } from '@/types'

type ManualItem = {
    description: string
    quantity: number
    unit_price: number
    tax_rate: number
    discount_percentage: number
}

function EmitirPageInner() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const api = useApi()
    const { create } = useInvoices()
    const [submitting, setSubmitting] = useState(false)

    const saleIdFromQuery = searchParams?.get('sale_id')
    const [mode, setMode] = useState<'from-sale' | 'manual'>(saleIdFromQuery ? 'from-sale' : 'manual')
    const [docType, setDocType] = useState<'A' | 'B' | 'C' | ''>('')

    // Desde venta
    const [saleId, setSaleId] = useState(saleIdFromQuery || '')
    const [sale, setSale] = useState<Sale | null>(null)
    const [saleLoading, setSaleLoading] = useState(false)

    // Manual
    const [customers, setCustomers] = useState<Customer[]>([])
    const [customerId, setCustomerId] = useState('')
    const [receiverName, setReceiverName] = useState('')
    const [receiverDocType, setReceiverDocType] = useState<'CUIT' | 'CUIL' | 'DNI' | 'CF'>('CF')
    const [receiverDocNumber, setReceiverDocNumber] = useState('')
    const [items, setItems] = useState<ManualItem[]>([
        { description: '', quantity: 1, unit_price: 0, tax_rate: 21, discount_percentage: 0 },
    ])
    const [notes, setNotes] = useState('')

    useEffect(() => {
        (async () => {
            const res = await api.get<Customer[]>('/customers', { limit: '200', active: 'true' })
            if (res.status === 1 && res.data) setCustomers(Array.isArray(res.data) ? res.data : [])
        })()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (mode !== 'from-sale' || !saleId) return
        setSaleLoading(true)
        api.get<Sale>(`/sales/${saleId}`).then((res) => {
            if (res.status === 1 && res.data) setSale(res.data)
            setSaleLoading(false)
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, saleId])

    function addItem() {
        setItems((prev) => [...prev, { description: '', quantity: 1, unit_price: 0, tax_rate: 21, discount_percentage: 0 }])
    }

    function removeItem(idx: number) {
        setItems((prev) => prev.filter((_, i) => i !== idx))
    }

    function updateItem(idx: number, patch: Partial<ManualItem>) {
        setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
    }

    const manualTotal = items.reduce((acc, it) => {
        const net = it.quantity * it.unit_price * (1 - (it.discount_percentage || 0) / 100)
        const tax = net * (it.tax_rate || 0) / 100
        return acc + net + tax
    }, 0)

    async function handleSubmit() {
        setSubmitting(true)
        const payload: Record<string, unknown> = {}
        if (docType) payload.doc_type = docType
        if (notes) payload.notes = notes

        if (mode === 'from-sale') {
            if (!saleId) {
                toast({ title: 'Falta venta', description: 'Ingresá el ID de la venta', variant: 'destructive' })
                setSubmitting(false)
                return
            }
            payload.sale_id = Number(saleId)
        } else {
            if (items.length === 0 || items.some((it) => !it.description || it.quantity <= 0)) {
                toast({ title: 'Items inválidos', description: 'Cada item necesita descripción y cantidad > 0', variant: 'destructive' })
                setSubmitting(false)
                return
            }
            payload.items = items
            if (customerId) payload.customer_id = Number(customerId)
            payload.receiver = {
                doc_type: receiverDocType,
                doc_number: receiverDocNumber,
                name: receiverName || 'Consumidor final',
            }
        }

        const res = await create(payload)
        setSubmitting(false)
        if (res.status === 1 && res.data) {
            toast({ title: 'Factura emitida', description: res.message, variant: 'success' })
            router.push(`/facturacion/${res.data.id}`)
        } else {
            toast({ title: 'Error al emitir', description: res.message, variant: 'destructive' })
        }
    }

    return (
        <div>
            <h1 className="text-2xl font-semibold tracking-tight mb-6">Emitir factura</h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <CardHeader><CardTitle className="text-base">Origen</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Modo</Label>
                                <Select value={mode} onValueChange={(v) => setMode(v as 'from-sale' | 'manual')}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="from-sale">Desde una venta existente</SelectItem>
                                        <SelectItem value="manual">Factura manual</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label>Tipo de comprobante (opcional)</Label>
                                <Select value={docType || 'auto'} onValueChange={(v) => setDocType((v === 'auto' ? '' : v) as 'A' | 'B' | 'C' | '')}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="auto">Automático (según condición IVA)</SelectItem>
                                        <SelectItem value="A">Factura A</SelectItem>
                                        <SelectItem value="B">Factura B</SelectItem>
                                        <SelectItem value="C">Factura C</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    {mode === 'from-sale' ? (
                        <Card>
                            <CardHeader><CardTitle className="text-base">Venta</CardTitle></CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <Label>ID de la venta</Label>
                                    <Input value={saleId} onChange={(e) => setSaleId(e.target.value)} placeholder="Ej: 1234" />
                                </div>
                                {saleLoading && <div className="text-sm text-muted-foreground">Cargando venta...</div>}
                                {sale && (
                                    <div className="text-sm bg-muted p-3 rounded">
                                        <div><strong>{sale.sale_number}</strong> — {formatCurrency(Number(sale.total))}</div>
                                        <div className="text-muted-foreground">{sale.items?.length || 0} items</div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            <Card>
                                <CardHeader><CardTitle className="text-base">Receptor</CardTitle></CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <Label>Cliente (opcional)</Label>
                                        <Select value={customerId || 'none'} onValueChange={(v) => setCustomerId(v === 'none' ? '' : v)}>
                                            <SelectTrigger><SelectValue placeholder="Consumidor final" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">Consumidor final</SelectItem>
                                                {customers.map((c) => (
                                                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <Label>Tipo doc</Label>
                                            <Select value={receiverDocType} onValueChange={(v) => setReceiverDocType(v as 'CUIT' | 'CUIL' | 'DNI' | 'CF')}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="CF">Consumidor final</SelectItem>
                                                    <SelectItem value="CUIT">CUIT</SelectItem>
                                                    <SelectItem value="CUIL">CUIL</SelectItem>
                                                    <SelectItem value="DNI">DNI</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="col-span-2">
                                            <Label>Número</Label>
                                            <Input value={receiverDocNumber} onChange={(e) => setReceiverDocNumber(e.target.value)} />
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Nombre / Razón social</Label>
                                        <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-base">Items</CardTitle>
                                        <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-4 w-4 mr-1" /> Agregar</Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {items.map((it, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                                            <div className="col-span-4">
                                                <Label className="text-xs">Descripción</Label>
                                                <Input value={it.description} onChange={(e) => updateItem(idx, { description: e.target.value })} />
                                            </div>
                                            <div className="col-span-1">
                                                <Label className="text-xs">Cant.</Label>
                                                <Input type="number" min={0} step="0.01" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} />
                                            </div>
                                            <div className="col-span-2">
                                                <Label className="text-xs">P. unit.</Label>
                                                <Input type="number" min={0} step="0.01" value={it.unit_price} onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })} />
                                            </div>
                                            <div className="col-span-2">
                                                <Label className="text-xs">Desc. %</Label>
                                                <Input type="number" min={0} step="0.01" value={it.discount_percentage} onChange={(e) => updateItem(idx, { discount_percentage: Number(e.target.value) })} />
                                            </div>
                                            <div className="col-span-2">
                                                <Label className="text-xs">IVA %</Label>
                                                <Select value={String(it.tax_rate)} onValueChange={(v) => updateItem(idx, { tax_rate: Number(v) })}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="0">0%</SelectItem>
                                                        <SelectItem value="10.5">10,5%</SelectItem>
                                                        <SelectItem value="21">21%</SelectItem>
                                                        <SelectItem value="27">27%</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="col-span-1">
                                                <Button variant="ghost" size="sm" onClick={() => removeItem(idx)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </>
                    )}

                    <Card>
                        <CardHeader><CardTitle className="text-base">Notas</CardTitle></CardHeader>
                        <CardContent>
                            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones internas o del comprobante" />
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle className="text-base">Resumen</CardTitle></CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            {mode === 'manual' ? (
                                <div className="text-lg font-bold">Total estimado: {formatCurrency(manualTotal)}</div>
                            ) : (
                                <div className="text-muted-foreground">Los totales se tomarán de la venta.</div>
                            )}
                            <Button className="w-full mt-3" onClick={handleSubmit} disabled={submitting}>
                                {submitting ? 'Emitiendo...' : 'Emitir factura'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

export default function EmitirPage() {
    return (
        <Suspense fallback={<div className="p-6">Cargando...</div>}>
            <EmitirPageInner />
        </Suspense>
    )
}
