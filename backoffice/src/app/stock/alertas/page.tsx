'use client'

import { useState, useEffect } from 'react'
import { useApi } from '@/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { AlertTriangle, Package } from 'lucide-react'
import type { Product, Stock } from '@/types'

export default function AlertasPage() {
    const api = useApi()
    const [alerts, setAlerts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // El backend (stock service, lowStockAlerts) devuelve un array de registros Stock,
        // cada uno con su product/branch anidados y quantity/reserved_quantity como strings.
        // Lo agrupamos por producto para construir la forma Product[] que consume la UI.
        api.get<Stock[]>('/alerts').then(res => {
            if (res.status === 1 && Array.isArray(res.data)) {
                const byProduct = new Map<number, Product>()
                for (const record of res.data) {
                    const product = record.product
                    if (!product) continue
                    const current = byProduct.get(product.id) ?? { ...product, stockEntries: [] as Stock[] }
                    current.stockEntries!.push({
                        id: record.id,
                        product_id: record.product_id,
                        variant_id: record.variant_id,
                        branch_id: record.branch_id,
                        quantity: Number(record.quantity),
                        reserved_quantity: Number(record.reserved_quantity),
                        branch: record.branch,
                        variant: record.variant,
                    })
                    byProduct.set(product.id, current)
                }
                setAlerts(Array.from(byProduct.values()))
            }
            setLoading(false)
        })
    }, [api])

    return (
        <div>
            <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="h-6 w-6 text-warning" />
                <h1 className="text-2xl font-semibold tracking-tight">Alertas de stock bajo</h1>
                {!loading && <Badge variant="warning">{alerts.length} productos</Badge>}
            </div>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}><CardContent className="p-5 space-y-3"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-24" /></CardContent></Card>
                    ))}
                </div>
            ) : alerts.length === 0 ? (
                <Card>
                    <CardContent className="p-0">
                        <EmptyState icon={Package} title="Todo en orden" description="Todos los productos tienen stock suficiente." />
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {alerts.map(product => {
                        const totalStock = product.stockEntries?.reduce((s, e) => s + e.quantity - e.reserved_quantity, 0) ?? 0
                        return (
                            <Card key={product.id} className="border-warning/20 bg-warning/5">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-warning" />
                                        {product.name}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-1 text-sm">
                                        {product.sku && <p className="text-muted-foreground font-mono text-xs">SKU: {product.sku}</p>}
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Stock actual</span>
                                            <span className="font-bold text-destructive">{totalStock}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Minimo alerta</span>
                                            <span className="font-medium">{product.min_stock_alert}</span>
                                        </div>
                                        {product.stockEntries && product.stockEntries.length > 0 && (
                                            <div className="pt-2 space-y-1">
                                                {product.stockEntries.map(se => (
                                                    <div key={se.id} className="flex justify-between text-xs">
                                                        <span className="text-muted-foreground">{se.branch?.name || `Sucursal #${se.branch_id}`}</span>
                                                        <span className={se.quantity - se.reserved_quantity <= 0 ? 'text-destructive' : ''}>{se.quantity - se.reserved_quantity}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
