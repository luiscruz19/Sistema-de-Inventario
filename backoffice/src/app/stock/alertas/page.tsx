'use client'

import { useState, useEffect } from 'react'
import { useApi } from '@/hooks/use-api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Package } from 'lucide-react'
import type { Product } from '@/types'

export default function AlertasPage() {
    const api = useApi()
    const [alerts, setAlerts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get<Product[]>('/alerts').then(res => {
            if (res.status === 1 && res.data) setAlerts(Array.isArray(res.data) ? res.data : [])
            setLoading(false)
        })
    }, [api])

    return (
        <div>
            <div className="flex items-center gap-3 mb-6">
                <AlertTriangle className="h-6 w-6 text-yellow-500" />
                <h1 className="text-2xl font-bold">Alertas de stock bajo</h1>
                {!loading && <Badge variant="warning">{alerts.length} productos</Badge>}
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-400">Cargando alertas...</div>
            ) : alerts.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Package className="h-12 w-12 mx-auto mb-3 text-green-300" />
                        <p className="text-gray-500">Todos los productos tienen stock suficiente</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {alerts.map(product => {
                        const totalStock = product.stockEntries?.reduce((s, e) => s + e.quantity - e.reserved_quantity, 0) ?? 0
                        return (
                            <Card key={product.id} className="border-yellow-200 bg-yellow-50/50">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                        {product.name}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-1 text-sm">
                                        {product.sku && <p className="text-gray-400 font-mono text-xs">SKU: {product.sku}</p>}
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Stock actual</span>
                                            <span className="font-bold text-red-600">{totalStock}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Minimo alerta</span>
                                            <span className="font-medium">{product.min_stock_alert}</span>
                                        </div>
                                        {product.stockEntries && product.stockEntries.length > 0 && (
                                            <div className="pt-2 space-y-1">
                                                {product.stockEntries.map(se => (
                                                    <div key={se.id} className="flex justify-between text-xs">
                                                        <span className="text-gray-400">{se.branch?.name || `Sucursal #${se.branch_id}`}</span>
                                                        <span className={se.quantity - se.reserved_quantity <= 0 ? 'text-red-600' : ''}>{se.quantity - se.reserved_quantity}</span>
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
