'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useApi } from '@/hooks/use-api'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'
import { Search, Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, ArrowRightLeft, Smartphone, SplitSquareHorizontal, Barcode, Check, X } from 'lucide-react'
import type { Product, Customer, SalePaymentMethod, Branch } from '@/types'

interface CartItem {
    product: Product
    variantId: number | null
    variantName: string | null
    quantity: number
    unitPrice: number
    discountPct: number
}

interface MixedPayment {
    method: SalePaymentMethod
    amount: number
}

const PAYMENT_METHODS: { value: SalePaymentMethod; label: string; icon: React.ElementType }[] = [
    { value: 'cash', label: 'Efectivo', icon: Banknote },
    { value: 'card', label: 'Tarjeta', icon: CreditCard },
    { value: 'transfer', label: 'Transferencia', icon: ArrowRightLeft },
    { value: 'mercadopago', label: 'MercadoPago', icon: Smartphone },
]

export default function PuntoDeVentaPage() {
    const api = useApi()
    const searchRef = useRef<HTMLInputElement>(null)

    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<Product[]>([])
    const [searching, setSearching] = useState(false)
    const [cart, setCart] = useState<CartItem[]>([])
    const [branches, setBranches] = useState<Branch[]>([])
    const [selectedBranch, setSelectedBranch] = useState<string>('')
    const [customers, setCustomers] = useState<Customer[]>([])
    const [selectedCustomer, setSelectedCustomer] = useState<string>('')
    const [paymentMethod, setPaymentMethod] = useState<string>('cash')
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
    const [discountValue, setDiscountValue] = useState(0)
    const [showMixedModal, setShowMixedModal] = useState(false)
    const [mixedPayments, setMixedPayments] = useState<MixedPayment[]>([
        { method: 'cash', amount: 0 },
        { method: 'card', amount: 0 },
    ])
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [showTicketModal, setShowTicketModal] = useState(false)
    const [lastSale, setLastSale] = useState<{ sale_number: string; total: number } | null>(null)
    const [processing, setProcessing] = useState(false)

    useEffect(() => {
        api.get<Branch[]>('/branches').then(res => {
            if (res.status === 1 && res.data) {
                const list = Array.isArray(res.data) ? res.data : []
                setBranches(list)
                if (list.length === 1) setSelectedBranch(String(list[0].id))
            }
        })
        api.get<Customer[]>('/customers', { limit: '200' }).then(res => {
            if (res.status === 1 && res.data) setCustomers(Array.isArray(res.data) ? res.data : [])
        })
    }, [api])

    useEffect(() => { searchRef.current?.focus() }, [])

    const searchProducts = useCallback(async (query: string) => {
        if (!query.trim()) { setSearchResults([]); return }
        setSearching(true)
        const res = await api.get<Product[]>('/products', { search: query, active: 'true', limit: '20' })
        if (res.status === 1 && res.data) {
            setSearchResults(Array.isArray(res.data) ? res.data : [])
        }
        setSearching(false)
    }, [api])

    useEffect(() => {
        const timer = setTimeout(() => searchProducts(searchQuery), 300)
        return () => clearTimeout(timer)
    }, [searchQuery, searchProducts])

    const addToCart = (product: Product, variantId: number | null = null) => {
        setCart(prev => {
            const existing = prev.find(i => i.product.id === product.id && i.variantId === variantId)
            if (existing) {
                return prev.map(i =>
                    i.product.id === product.id && i.variantId === variantId
                        ? { ...i, quantity: i.quantity + 1 }
                        : i
                )
            }
            const variant = variantId ? product.variants?.find(v => v.id === variantId) : null
            return [...prev, {
                product,
                variantId,
                variantName: variant?.name || null,
                quantity: 1,
                unitPrice: variant?.sale_price ?? product.sale_price,
                discountPct: 0,
            }]
        })
        setSearchQuery('')
        setSearchResults([])
        searchRef.current?.focus()
    }

    const updateQuantity = (index: number, delta: number) => {
        setCart(prev => prev.map((item, i) => {
            if (i !== index) return item
            const newQty = Math.max(1, item.quantity + delta)
            return { ...item, quantity: newQty }
        }))
    }

    const removeItem = (index: number) => setCart(prev => prev.filter((_, i) => i !== index))

    const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity * (1 - item.discountPct / 100), 0)
    const discountAmount = discountType === 'percentage' ? subtotal * (discountValue / 100) : discountValue
    const afterDiscount = subtotal - discountAmount
    const taxAmount = afterDiscount * 0.21
    const total = afterDiscount + taxAmount

    const handleCheckout = async () => {
        if (!selectedBranch) {
            toast({ title: 'Seleccione una sucursal', description: 'Debe seleccionar la sucursal desde donde se realiza la venta', variant: 'destructive' })
            return
        }
        if (paymentMethod === 'mixed') {
            setShowMixedModal(true)
            return
        }
        setShowConfirmModal(true)
    }

    const confirmSale = async (payments?: MixedPayment[]) => {
        setProcessing(true)
        setShowConfirmModal(false)
        setShowMixedModal(false)

        const saleData = {
            branch_id: Number(selectedBranch),
            customer_id: selectedCustomer ? Number(selectedCustomer) : null,
            payment_method: paymentMethod === 'mixed' ? 'mixed' : paymentMethod,
            // El backend calcula el descuento desde una sola fuente: si es porcentual
            // envía discount_percentage; si es fijo envía discount_amount. Nunca ambos.
            discount_percentage: discountType === 'percentage' ? discountValue : 0,
            discount_amount: discountType === 'fixed' ? discountValue : 0,
            items: cart.map(item => ({
                product_id: item.product.id,
                variant_id: item.variantId,
                quantity: item.quantity,
                unit_price: item.unitPrice,
                discount_percentage: item.discountPct,
            })),
            payments: payments || [{ method: paymentMethod as SalePaymentMethod, amount: total }],
        }

        const res = await api.post<{ sale_number: string; total: number }>('/sales', saleData)
        setProcessing(false)

        if (res.status === 1) {
            setLastSale(res.data || { sale_number: '', total })
            setShowTicketModal(true)
            setCart([])
            setSelectedCustomer('')
            setDiscountValue(0)
            setPaymentMethod('cash')
            toast({ title: 'Venta registrada', description: `Venta completada por ${formatCurrency(total)}`, variant: 'success' })
        } else {
            toast({ title: 'Error', description: res.message || 'No se pudo registrar la venta', variant: 'destructive' })
        }
    }

    const addMixedMethod = () => {
        const unused = PAYMENT_METHODS.find(m => !mixedPayments.some(p => p.method === m.value))
        if (unused) setMixedPayments([...mixedPayments, { method: unused.value, amount: 0 }])
    }

    const mixedTotal = mixedPayments.reduce((s, p) => s + p.amount, 0)

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Punto de Venta</h1>
                    <p className="text-sm text-gray-500 mt-1">{cart.length} items en el carrito</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left: Product search + results */}
                <div className="lg:col-span-3 space-y-4">
                    <Card>
                        <CardContent className="p-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Barcode className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300" />
                                <Input
                                    ref={searchRef}
                                    placeholder="Buscar por nombre, SKU o codigo de barras..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-9 h-11 text-base"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {searchQuery && (
                        <Card>
                            <CardContent className="p-0">
                                {searching ? (
                                    <div className="p-8 text-center text-gray-400">Buscando...</div>
                                ) : searchResults.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400">No se encontraron productos</div>
                                ) : (
                                    <div className="divide-y divide-gray-100">
                                        {searchResults.map((product) => (
                                            <div key={product.id}>
                                                <button
                                                    onClick={() => addToCart(product)}
                                                    className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors text-left"
                                                >
                                                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 shrink-0">
                                                        <ShoppingCart className="h-5 w-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium truncate">{product.name}</p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            {product.sku && <span className="text-xs text-gray-400">SKU: {product.sku}</span>}
                                                            {product.barcode && <span className="text-xs text-gray-400">COD: {product.barcode}</span>}
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <p className="font-semibold text-primary-600">{formatCurrency(product.sale_price)}</p>
                                                        {product.track_stock && (() => {
                                                            const stock = product.stockEntries?.reduce((s, e) => s + e.quantity - e.reserved_quantity, 0)
                                                            if (stock === undefined || stock === null) {
                                                                return <p className="text-xs text-gray-400 mt-0.5">Stock: ?</p>
                                                            }
                                                            const alert = product.min_stock_alert ?? 0
                                                            const variant = stock <= 0 ? 'destructive' : stock <= alert ? 'warning' : 'success'
                                                            return (
                                                                <Badge variant={variant} className="mt-0.5 text-xs">Stock: {stock}</Badge>
                                                            )
                                                        })()}
                                                    </div>
                                                    <Plus className="h-5 w-5 text-gray-400 shrink-0" />
                                                </button>
                                                {product.variants && product.variants.length > 0 && (
                                                    <div className="px-4 pb-3 flex flex-wrap gap-2">
                                                        {product.variants.filter(v => v.active).map(v => (
                                                            <Button
                                                                key={v.id}
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => addToCart(product, v.id)}
                                                            >
                                                                {v.name} - {formatCurrency(v.sale_price ?? product.sale_price)}
                                                            </Button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Cart items */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Carrito</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {cart.length === 0 ? (
                                <div className="p-8 text-center text-gray-400">
                                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p>Agrega productos para iniciar la venta</p>
                                    <p className="text-xs mt-1">Busca por nombre, SKU o escanea un codigo de barras</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {cart.map((item, idx) => (
                                        <div key={`${item.product.id}-${item.variantId}`} className="flex items-center gap-3 px-4 py-3">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm truncate">{item.product.name}</p>
                                                {item.variantName && <p className="text-xs text-gray-400">{item.variantName}</p>}
                                                <p className="text-xs text-gray-500">{formatCurrency(item.unitPrice)} c/u</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(idx, -1)}>
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <Input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value) || 1
                                                        setCart(prev => prev.map((it, i) => i === idx ? { ...it, quantity: Math.max(1, val) } : it))
                                                    }}
                                                    className="w-14 h-7 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(idx, 1)}>
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                            <div className="w-24 text-right">
                                                <p className="font-semibold text-sm">{formatCurrency(item.unitPrice * item.quantity)}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => removeItem(idx)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Summary + Payment */}
                <div className="lg:col-span-2 space-y-4">
                    {branches.length > 1 && (
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base">Sucursal</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar sucursal..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {branches.map(b => (
                                            <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </CardContent>
                        </Card>
                    )}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Cliente</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Consumidor final" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">Consumidor final</SelectItem>
                                    {customers.map(c => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            {c.name} {c.type === 'wholesale' ? '(Mayorista)' : ''}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Descuento</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2">
                                <Select value={discountType} onValueChange={(v) => setDiscountType(v as 'percentage' | 'fixed')}>
                                    <SelectTrigger className="w-24">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage">%</SelectItem>
                                        <SelectItem value="fixed">$</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    type="number"
                                    min={0}
                                    step={discountType === 'percentage' ? 1 : 0.01}
                                    value={discountValue || ''}
                                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                                    placeholder="0"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Resumen</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
                                <span>{formatCurrency(subtotal)}</span>
                            </div>
                            {discountAmount > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>Descuento</span>
                                    <span>-{formatCurrency(discountAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">IVA (21%)</span>
                                <span>{formatCurrency(taxAmount)}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between text-xl font-bold pt-1">
                                <span>Total</span>
                                <span className="text-primary-600">{formatCurrency(total)}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Metodo de pago</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                {PAYMENT_METHODS.map(m => {
                                    const Icon = m.icon
                                    return (
                                        <Button
                                            key={m.value}
                                            variant={paymentMethod === m.value ? 'default' : 'outline'}
                                            className="h-auto py-3 flex-col gap-1"
                                            onClick={() => setPaymentMethod(m.value)}
                                        >
                                            <Icon className="h-5 w-5" />
                                            <span className="text-xs">{m.label}</span>
                                        </Button>
                                    )
                                })}
                            </div>
                            <Button
                                variant={paymentMethod === 'mixed' ? 'default' : 'outline'}
                                className="w-full"
                                onClick={() => setPaymentMethod('mixed')}
                            >
                                <SplitSquareHorizontal className="h-4 w-4 mr-2" />
                                Pago mixto
                            </Button>

                            <Button
                                variant="success"
                                size="xl"
                                className="w-full text-lg"
                                disabled={cart.length === 0 || processing}
                                onClick={handleCheckout}
                            >
                                {processing ? 'Procesando...' : `Cobrar ${formatCurrency(total)}`}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Mixed Payment Modal */}
            <Dialog open={showMixedModal} onOpenChange={setShowMixedModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Pago mixto</DialogTitle>
                        <DialogDescription>Divide el total entre metodos de pago</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="flex justify-between font-semibold">
                            <span>Total a cobrar</span>
                            <span>{formatCurrency(total)}</span>
                        </div>
                        <Separator />
                        {mixedPayments.map((payment, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <Select
                                    value={payment.method}
                                    onValueChange={(v) => {
                                        const updated = [...mixedPayments]
                                        updated[idx] = { ...updated[idx], method: v as SalePaymentMethod }
                                        setMixedPayments(updated)
                                    }}
                                >
                                    <SelectTrigger className="w-[140px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PAYMENT_METHODS.map(m => (
                                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input
                                    type="number"
                                    min={0}
                                    step={0.01}
                                    value={payment.amount || ''}
                                    onChange={(e) => {
                                        const updated = [...mixedPayments]
                                        updated[idx] = { ...updated[idx], amount: parseFloat(e.target.value) || 0 }
                                        setMixedPayments(updated)
                                    }}
                                    className="flex-1"
                                    placeholder="0.00"
                                />
                                {mixedPayments.length > 2 && (
                                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setMixedPayments(prev => prev.filter((_, i) => i !== idx))}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addMixedMethod} disabled={mixedPayments.length >= PAYMENT_METHODS.length}>
                            <Plus className="h-4 w-4 mr-1" /> Agregar metodo
                        </Button>
                        <Separator />
                        <div className="flex justify-between text-sm">
                            <span>Suma parciales</span>
                            <span className={mixedTotal >= total ? 'text-green-600' : 'text-red-600'}>
                                {formatCurrency(mixedTotal)}
                            </span>
                        </div>
                        {mixedTotal < total && (
                            <p className="text-xs text-red-500">Faltan {formatCurrency(total - mixedTotal)} para cubrir el total</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowMixedModal(false)}>Cancelar</Button>
                        <Button disabled={mixedTotal < total} onClick={() => confirmSale(mixedPayments)}>
                            Confirmar cobro
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm Sale Modal */}
            <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Confirmar venta</DialogTitle>
                        <DialogDescription>Se registrara la venta</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between"><span className="text-gray-500">Items</span><span>{cart.reduce((s, i) => s + i.quantity, 0)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Metodo</span><span className="capitalize">{paymentMethod}</span></div>
                        <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{formatCurrency(total)}</span></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowConfirmModal(false)}>Cancelar</Button>
                        <Button variant="success" onClick={() => confirmSale()}>
                            <Check className="h-4 w-4 mr-1" /> Confirmar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Ticket Modal */}
            <Dialog open={showTicketModal} onOpenChange={setShowTicketModal}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Venta completada</DialogTitle>
                        <DialogDescription>La venta fue registrada exitosamente</DialogDescription>
                    </DialogHeader>
                    <div className="text-center py-4">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Check className="h-8 w-8 text-green-600" />
                        </div>
                        {lastSale && (
                            <>
                                <p className="text-sm text-gray-500">Comprobante</p>
                                <p className="text-lg font-bold">{lastSale.sale_number}</p>
                                <p className="text-2xl font-bold text-green-600 mt-2">{formatCurrency(lastSale.total)}</p>
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button className="w-full" onClick={() => { setShowTicketModal(false); searchRef.current?.focus() }}>
                            Nueva venta
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
