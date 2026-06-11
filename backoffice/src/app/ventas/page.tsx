'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useApi } from '@/hooks/use-api'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/common/EmptyState'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import Link from 'next/link'
import { useScreenActions } from '@/components/command/screen-actions'
import { printTicket, type TicketData } from '@/lib/print-ticket'
import { formatCurrency } from '@/lib/utils'
import { ScanLine, Plus, Minus, X, Package, ShoppingCart, Check, CreditCard, Printer } from 'lucide-react'
import type { Product, Customer, SalePaymentMethod, Branch } from '@/types'

interface CartItem {
    product: Product
    quantity: number
    unitPrice: number
}

const stockOf = (p: Product): number | null => {
    if (!p.track_stock) return null
    const s = p.stockEntries?.reduce((acc, e) => acc + Number(e.quantity) - Number(e.reserved_quantity), 0)
    return s ?? null
}

export default function PuntoDeVentaPage() {
    const api = useApi()
    const searchRef = useRef<HTMLInputElement>(null)

    const [query, setQuery] = useState('')
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [cart, setCart] = useState<CartItem[]>([])
    const [branches, setBranches] = useState<Branch[]>([])
    const [selectedBranch, setSelectedBranch] = useState<string>('')
    const [customers, setCustomers] = useState<Customer[]>([])
    const [selectedCustomer, setSelectedCustomer] = useState<string>('')
    const [payments, setPayments] = useState<{ method: SalePaymentMethod; amount: number }[]>([{ method: 'cash', amount: 0 }])
    const [docType, setDocType] = useState<string>('b')
    const [confirm, setConfirm] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [lastSale, setLastSale] = useState<TicketData | null>(null)
    const [cajaOpen, setCajaOpen] = useState<boolean | null>(null)

    useEffect(() => {
        api.get<Branch[]>('/branches').then(res => {
            if (res.status === 1 && Array.isArray(res.data)) {
                setBranches(res.data)
                if (res.data.length === 1) setSelectedBranch(String(res.data[0].id))
            }
        })
        api.get<Customer[]>('/customers', { limit: '200' }).then(res => {
            if (res.status === 1 && Array.isArray(res.data)) setCustomers(res.data)
        })
    }, [api])

    // Estado de la caja de la sucursal: sin caja abierta no se puede cobrar.
    useEffect(() => {
        if (!selectedBranch) { setCajaOpen(null); return }
        api.get('/cash-register', { current: 'true', branch_id: selectedBranch }).then(res => {
            setCajaOpen(res.status === 1 && !!res.data)
        })
    }, [api, selectedBranch])

    const loadProducts = useCallback(async (search: string) => {
        setLoading(true)
        const res = await api.get<Product[]>('/products', { active: 'true', limit: '40', ...(search ? { search } : {}) })
        if (res.status === 1 && Array.isArray(res.data)) setProducts(res.data)
        setLoading(false)
    }, [api])

    useEffect(() => {
        const t = setTimeout(() => loadProducts(query), 300)
        return () => clearTimeout(t)
    }, [query, loadProducts])

    // Al abrir el punto de venta, el foco va directo al buscador.
    useEffect(() => { searchRef.current?.focus() }, [])

    // Atajos: N = Cobrar · / = enfocar buscador.
    useScreenActions({
        primary: {
            label: 'Cobrar', icon: CreditCard, key: 'n',
            run: () => {
                if (!cart.length) return
                const sub = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
                setPayments([{ method: 'cash', amount: sub + Math.round(sub * 0.21) }])
                setConfirm(true)
            },
        },
        search: () => searchRef.current?.focus(),
        searchLabel: 'Buscar producto',
    }, [cart])

    // Enter en el buscador agrega el primer producto disponible.
    const onSearchEnter = (e: React.KeyboardEvent) => {
        if (e.key !== 'Enter') return
        const first = products.find(p => stockOf(p) === null || (stockOf(p) ?? 0) > 0)
        if (first) { addToCart(first); setQuery('') }
    }

    const addToCart = (product: Product) => {
        setCart(prev => {
            const e = prev.find(i => i.product.id === product.id)
            return e
                ? prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
                : [...prev, { product, quantity: 1, unitPrice: product.sale_price }]
        })
    }
    const setQty = (id: number, delta: number) =>
        setCart(prev => prev.map(i => i.product.id === id ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i))
    const remove = (id: number) => setCart(prev => prev.filter(i => i.product.id !== id))

    const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
    const iva = Math.round(subtotal * 0.21)
    const total = subtotal + iva

    // --- Pagos (uno o varios medios) ---
    const paid = payments.reduce((s, p) => s + (p.amount || 0), 0)
    const remaining = total - paid // > 0 falta cubrir · < 0 vuelto (efectivo)

    const openCobrar = () => {
        if (!cart.length) return
        if (cajaOpen === false) {
            toast({ title: 'Caja cerrada', description: 'Abrí la caja de la sucursal para poder registrar ventas.', variant: 'destructive' })
            return
        }
        setPayments([{ method: 'cash', amount: total }])
        setConfirm(true)
    }
    const addPayment = () =>
        setPayments(prev => [...prev, { method: 'cash', amount: Math.max(0, total - prev.reduce((s, p) => s + p.amount, 0)) }])
    const setPayment = (idx: number, patch: Partial<{ method: SalePaymentMethod; amount: number }>) =>
        setPayments(prev => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)))
    const removePayment = (idx: number) => setPayments(prev => prev.filter((_, i) => i !== idx))

    const confirmSale = async () => {
        if (branches.length > 0 && !selectedBranch) {
            toast({ title: 'Seleccioná una sucursal', description: 'Indicá desde qué sucursal se realiza la venta.', variant: 'destructive' })
            return
        }
        if (paid + 0.01 < total) {
            toast({ title: 'Pago incompleto', description: `Falta cubrir ${formatCurrency(remaining)}.`, variant: 'destructive' })
            return
        }
        setProcessing(true)
        const saleData = {
            branch_id: selectedBranch ? Number(selectedBranch) : null,
            customer_id: selectedCustomer && selectedCustomer !== '__none__' ? Number(selectedCustomer) : null,
            payment_method: payments.length > 1 ? 'mixed' : payments[0].method,
            doc_type: docType,
            discount_percentage: 0,
            discount_amount: 0,
            items: cart.map(i => ({ product_id: i.product.id, variant_id: null, quantity: i.quantity, unit_price: i.unitPrice, discount_percentage: 0 })),
            payments: payments.map(p => ({ method: p.method, amount: p.amount })),
        }
        const res = await api.post<{ sale_number: string; total: number }>('/sales', saleData)
        setProcessing(false)
        setConfirm(false)
        if (res.status === 1) {
            const docLabel = docType === 'a' ? 'Factura A' : docType === 'x' ? 'Ticket X' : 'Factura B'
            const customerName = selectedCustomer && selectedCustomer !== '__none__'
                ? customers.find(c => String(c.id) === selectedCustomer)?.name
                : 'Consumidor Final'
            setLastSale({
                number: res.data?.sale_number || '—',
                date: new Date().toLocaleString('es-AR'),
                docType: docLabel,
                customer: customerName,
                branch: branches.find(b => String(b.id) === selectedBranch)?.name,
                items: cart.map(i => ({ name: i.product.name, quantity: i.quantity, unitPrice: i.unitPrice })),
                subtotal, iva, total,
                payments: payments.map(p => ({ method: p.method, amount: p.amount })),
            })
            setCart([])
            setSelectedCustomer('')
            toast({ title: 'Venta registrada', description: `Comprobante emitido por ${formatCurrency(total)}.`, variant: 'success' })
            loadProducts(query)
        } else {
            toast({ title: 'No se pudo registrar la venta', description: res.message || 'Intentá nuevamente.', variant: 'destructive' })
        }
    }

    return (
        <div className="flex flex-col gap-4 lg:h-[calc(100vh-58px-3rem)] lg:flex-row">
            {/* Grilla de productos */}
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="mb-3.5">
                    <div className="relative">
                        <ScanLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            ref={searchRef}
                            id="pos-search"
                            className="pl-9"
                            placeholder="Buscar producto o escanear código..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={onSearchEnter}
                        />
                    </div>
                </div>
                <div className="grid auto-rows-min grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3 overflow-auto pb-1">
                    {loading ? (
                        [...Array(8)].map((_, i) => <div key={i} className="h-[140px] animate-pulse rounded-xl border bg-muted/40" />)
                    ) : products.length === 0 ? (
                        <div className="col-span-full">
                            <EmptyState icon={Package} title="Sin productos" description="No hay productos que coincidan con la búsqueda." />
                        </div>
                    ) : (
                        products.map(p => {
                            const stock = stockOf(p)
                            const agotado = stock !== null && stock <= 0
                            return (
                                <Card
                                    key={p.id}
                                    onClick={() => !agotado && addToCart(p)}
                                    className={`overflow-hidden p-0 ${agotado ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                                >
                                    {p.image_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={p.image_url} alt="" className="h-[78px] w-full object-cover" />
                                    ) : (
                                        <div
                                            className="flex h-[78px] items-center justify-center"
                                            style={{ background: 'repeating-linear-gradient(45deg,hsl(var(--muted)),hsl(var(--muted)) 8px,hsl(var(--accent)) 8px,hsl(var(--accent)) 16px)' }}
                                        >
                                            <Package className="h-[22px] w-[22px] text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="p-[11px]">
                                        <p className="min-h-[32px] text-[12.5px] font-medium leading-[1.3]">{p.name}</p>
                                        <div className="mt-1.5 flex items-center justify-between">
                                            <strong className="text-[13.5px] font-semibold tabular-nums">{formatCurrency(p.sale_price)}</strong>
                                            {stock !== null && <span className="text-[11px] tabular-nums text-muted-foreground">×{stock}</span>}
                                        </div>
                                    </div>
                                </Card>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Carrito */}
            <Card className="flex w-full shrink-0 flex-col p-0 lg:w-[360px]">
                <div className="flex items-center justify-between border-b border-border px-[18px] py-4">
                    <strong className="text-[15px] font-semibold">Venta actual</strong>
                    <Badge variant="secondary">{cart.length} ítems</Badge>
                </div>
                <div className="flex-1 overflow-auto px-3">
                    {cart.length === 0 ? (
                        <EmptyState icon={ShoppingCart} title="Carrito vacío" description="Agregá productos para iniciar la venta." />
                    ) : (
                        cart.map(i => (
                            <div key={i.product.id} className="flex items-center gap-2 border-b border-border px-1.5 py-[9px]">
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-[12.5px] font-medium">{i.product.name}</p>
                                    <p className="mt-0.5 text-[11.5px] tabular-nums text-muted-foreground">{formatCurrency(i.unitPrice)} c/u</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button size="icon" variant="outline" className="h-[26px] w-[26px]" onClick={() => setQty(i.product.id, -1)}><Minus className="h-3 w-3" /></Button>
                                    <span className="w-5 text-center text-[13px] font-semibold tabular-nums">{i.quantity}</span>
                                    <Button size="icon" variant="outline" className="h-[26px] w-[26px]" onClick={() => setQty(i.product.id, 1)}><Plus className="h-3 w-3" /></Button>
                                    <Button size="icon" variant="ghost" className="h-[26px] w-[26px]" onClick={() => remove(i.product.id)}><X className="h-3.5 w-3.5" /></Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="border-t border-border p-[18px]">
                    <div className="mb-2.5">
                        <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                            <SelectTrigger><SelectValue placeholder="Consumidor Final" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">Consumidor Final</SelectItem>
                                {customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="mb-1 flex justify-between text-[13px] text-muted-foreground"><span>Subtotal</span><span className="tabular-nums">{formatCurrency(subtotal)}</span></div>
                    <div className="mb-1 flex justify-between text-[13px] text-muted-foreground"><span>IVA 21%</span><span className="tabular-nums">{formatCurrency(iva)}</span></div>
                    <div className="my-2 flex justify-between text-lg font-semibold"><span>Total</span><span className="tabular-nums">{formatCurrency(total)}</span></div>
                    {cajaOpen === false && (
                        <Link href="/caja" className="mb-2 flex items-center justify-center gap-1.5 rounded-md border border-warning/30 bg-warning/10 px-2 py-1.5 text-center text-[12px] font-medium text-warning hover:bg-warning/15">
                            Caja cerrada — abrila para vender
                        </Link>
                    )}
                    <Button size="lg" className="w-full" disabled={!cart.length || processing || cajaOpen === false} onClick={openCobrar}>Cobrar</Button>
                </div>
            </Card>

            {/* Diálogo de cobro */}
            <Dialog open={confirm} onOpenChange={setConfirm}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Confirmar cobro</DialogTitle>
                        <DialogDescription>Total a cobrar: {formatCurrency(total)}</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-3.5">
                        {branches.length > 1 && (
                            <div>
                                <Label className="mb-1.5 block" required>Sucursal</Label>
                                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                                    <SelectTrigger><SelectValue placeholder="Seleccionar sucursal" /></SelectTrigger>
                                    <SelectContent>
                                        {branches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                        <div>
                            <div className="mb-1.5 flex items-center justify-between">
                                <Label required>Medios de pago</Label>
                                <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 px-2" onClick={addPayment}>
                                    <Plus className="h-3.5 w-3.5" /> Agregar medio
                                </Button>
                            </div>
                            <div className="flex flex-col gap-2">
                                {payments.map((p, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <Select value={p.method} onValueChange={v => setPayment(idx, { method: v as SalePaymentMethod })}>
                                            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="cash">Efectivo</SelectItem>
                                                <SelectItem value="mercadopago">MercadoPago</SelectItem>
                                                <SelectItem value="card">Tarjeta déb./créd.</SelectItem>
                                                <SelectItem value="transfer">Transferencia</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            type="number" min={0} step="0.01" className="flex-1 text-right tabular-nums"
                                            value={p.amount || ''}
                                            onChange={e => setPayment(idx, { amount: parseFloat(e.target.value) || 0 })}
                                        />
                                        {payments.length > 1 && (
                                            <Button type="button" size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => removePayment(idx)}><X className="h-4 w-4" /></Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {payments.length > 1 && (
                                <div className="mt-2 flex justify-between text-[12.5px] tabular-nums">
                                    <span className="text-muted-foreground">Cubierto {formatCurrency(paid)}</span>
                                    <span className={remaining > 0.01 ? 'font-medium text-destructive' : remaining < -0.01 ? 'font-medium text-success' : 'text-muted-foreground'}>
                                        {remaining > 0.01 ? `Falta ${formatCurrency(remaining)}` : remaining < -0.01 ? `Vuelto ${formatCurrency(-remaining)}` : 'Exacto'}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div>
                            <Label className="mb-1.5 block">Comprobante</Label>
                            <Select value={docType} onValueChange={setDocType}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="b">Factura B</SelectItem>
                                    <SelectItem value="a">Factura A</SelectItem>
                                    <SelectItem value="x">Ticket X</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirm(false)}>Cancelar</Button>
                        <Button disabled={processing} onClick={confirmSale}>{processing ? 'Emitiendo...' : 'Emitir factura'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Comprobante emitido */}
            <Dialog open={!!lastSale} onOpenChange={() => setLastSale(null)}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Venta completada</DialogTitle>
                        <DialogDescription>La venta fue registrada exitosamente.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 text-center">
                        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                            <Check className="h-8 w-8 text-success" />
                        </div>
                        {lastSale && (
                            <>
                                <p className="text-sm text-muted-foreground">Comprobante</p>
                                <p className="text-lg font-semibold tabular-nums">{lastSale.number || '—'}</p>
                                <p className="mt-2 text-2xl font-semibold tabular-nums text-success">{formatCurrency(lastSale.total)}</p>
                            </>
                        )}
                    </div>
                    <DialogFooter className="flex-col gap-2 sm:flex-row">
                        <Button variant="outline" className="w-full gap-2" onClick={() => lastSale && printTicket(lastSale)}>
                            <Printer className="h-4 w-4" /> Imprimir ticket
                        </Button>
                        <Button className="w-full" onClick={() => { setLastSale(null); searchRef.current?.focus() }}>Nueva venta</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
