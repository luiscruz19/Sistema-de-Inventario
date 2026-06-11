'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/use-api'
import { DataTable, type Column } from '@/components/common/DataTable'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { Tag } from 'lucide-react'
import type { Pagination } from '@/types'

type MarketplaceListing = {
    id: number
    connection_id: number
    connection?: { id: number; marketplace: string; nombre: string }
    product_id: number
    product?: { id: number; name: string; sku: string }
    variant_id: number | null
    marketplace_item_id: string
    titulo: string
    precio_publicado: number | string
    stock_publicado: number
    activa: boolean
    ultimo_sync_at: string | null
    updatedAt: string
}

export default function PublicacionesPage() {
    const api = useApi()
    const [listings, setListings] = useState<MarketplaceListing[]>([])
    const [connections, setConnections] = useState<{ id: number; marketplace: string; nombre: string }[]>([])
    const [pagination, setPagination] = useState<Pagination>({ totalItems: 0, totalPages: 0, currentPage: 1, perPage: 20 })
    const [loading, setLoading] = useState(true)
    const [connectionFilter, setConnectionFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')

    const fetchListings = useCallback(async (page = 1) => {
        setLoading(true)
        const params: Record<string, string> = { page: String(page), limit: '20' }
        if (connectionFilter) params.connection_id = connectionFilter
        if (statusFilter) params.activa = statusFilter
        const res = await api.get<MarketplaceListing[]>('/marketplace/products', params)
        if (res.status === 1 && res.data) {
            setListings(Array.isArray(res.data) ? res.data : [])
            if (res.pagination) setPagination(res.pagination)
        }
        setLoading(false)
    }, [api, connectionFilter, statusFilter])

    const fetchConnections = useCallback(async () => {
        const res = await api.get<{ id: number; marketplace: string; nombre: string }[]>('/marketplace/connections', { limit: '100' })
        if (res.status === 1 && res.data) setConnections(Array.isArray(res.data) ? res.data : [])
    }, [api])

    useEffect(() => { fetchListings() }, [fetchListings])
    useEffect(() => { fetchConnections() }, [fetchConnections])

    const columns: Column<MarketplaceListing>[] = [
        {
            key: 'connection',
            label: 'Marketplace',
            render: (_, row) => <span className="text-sm font-medium">{row.connection?.nombre || `#${row.connection_id}`}</span>,
        },
        {
            key: 'product',
            label: 'Producto interno',
            render: (_, row) => <span className="text-sm">{row.product?.name || `#${row.product_id}`}</span>,
        },
        {
            key: 'titulo',
            label: 'Titulo publicado',
            render: (v, row) => (
                <div>
                    <p className="text-sm font-medium">{v as string}</p>
                    <span className="text-xs text-muted-foreground">{row.marketplace_item_id}</span>
                </div>
            ),
        },
        {
            key: 'precio_publicado',
            label: 'Precio',
            sortable: true,
            render: (v) => <span className="font-semibold">{formatCurrency(Number(v))}</span>,
        },
        {
            key: 'stock_publicado',
            label: 'Stock publicado',
            render: (v) => <span className="text-sm">{v as number}</span>,
        },
        {
            key: 'activa',
            label: 'Estado',
            render: (v) => (
                <Badge variant={v ? 'success' : 'secondary'}>{v ? 'Activa' : 'Inactiva'}</Badge>
            ),
        },
    ]

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                        <Tag className="h-6 w-6" /> Publicaciones de marketplace
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Productos publicados en canales externos</p>
                </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
                <Select value={connectionFilter || '__all__'} onValueChange={(v) => setConnectionFilter(v === '__all__' ? '' : v)}>
                    <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Todas las conexiones" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__all__">Todas las conexiones</SelectItem>
                        {connections.map(c => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={statusFilter || '__all__'} onValueChange={(v) => setStatusFilter(v === '__all__' ? '' : v)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="__all__">Todos los estados</SelectItem>
                        <SelectItem value="true">Activa</SelectItem>
                        <SelectItem value="false">Inactiva</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <DataTable
                data={listings}
                columns={columns}
                pagination={pagination}
                onPageChange={(p) => fetchListings(p)}
                isLoading={loading}
                emptyMessage="No se encontraron publicaciones"
            />
        </div>
    )
}
