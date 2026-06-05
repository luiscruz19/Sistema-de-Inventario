'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/use-api'
import { DataTable, type Column } from '@/components/common/DataTable'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import { Tag } from 'lucide-react'
import type { Pagination } from '@/types'

type ListingStatus = 'active' | 'paused' | 'closed' | 'under_review'

type MarketplaceListing = {
    id: number
    connection_id: number
    connection?: { name: string; platform: string }
    product_id: number
    product?: { name: string }
    external_id: string
    title: string
    price: number
    published_stock: number
    status: ListingStatus
    url?: string
    updatedAt: string
}

const statusMap: Record<ListingStatus, { label: string; variant: 'success' | 'secondary' | 'warning' | 'destructive' }> = {
    active: { label: 'Activa', variant: 'success' },
    paused: { label: 'Pausada', variant: 'warning' },
    closed: { label: 'Cerrada', variant: 'secondary' },
    under_review: { label: 'En revision', variant: 'destructive' },
}

export default function PublicacionesPage() {
    const api = useApi()
    const [listings, setListings] = useState<MarketplaceListing[]>([])
    const [connections, setConnections] = useState<{ id: number; name: string; platform: string }[]>([])
    const [pagination, setPagination] = useState<Pagination>({ totalItems: 0, totalPages: 0, currentPage: 1, perPage: 20 })
    const [loading, setLoading] = useState(true)
    const [connectionFilter, setConnectionFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')

    const fetchListings = useCallback(async (page = 1) => {
        setLoading(true)
        const params: Record<string, string> = { page: String(page), limit: '20' }
        if (connectionFilter) params.connection_id = connectionFilter
        if (statusFilter) params.status = statusFilter
        const res = await api.get<MarketplaceListing[]>('/marketplace-listings', params)
        if (res.status === 1 && res.data) {
            setListings(Array.isArray(res.data) ? res.data : [])
            if (res.pagination) setPagination(res.pagination)
        }
        setLoading(false)
    }, [api, connectionFilter, statusFilter])

    const fetchConnections = useCallback(async () => {
        const res = await api.get<{ id: number; name: string; platform: string }[]>('/marketplace-connections', { limit: '100' })
        if (res.status === 1 && res.data) setConnections(Array.isArray(res.data) ? res.data : [])
    }, [api])

    useEffect(() => { fetchListings() }, [fetchListings])
    useEffect(() => { fetchConnections() }, [fetchConnections])

    const columns: Column<MarketplaceListing>[] = [
        {
            key: 'connection',
            label: 'Marketplace',
            render: (_, row) => <span className="text-sm font-medium">{row.connection?.name || `#${row.connection_id}`}</span>,
        },
        {
            key: 'product',
            label: 'Producto interno',
            render: (_, row) => <span className="text-sm">{row.product?.name || `#${row.product_id}`}</span>,
        },
        {
            key: 'title',
            label: 'Titulo publicado',
            render: (v, row) => (
                <div>
                    <p className="text-sm font-medium">{v as string}</p>
                    {row.url && (
                        <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                            Ver publicacion
                        </a>
                    )}
                </div>
            ),
        },
        {
            key: 'price',
            label: 'Precio',
            sortable: true,
            render: (v) => <span className="font-semibold">{formatCurrency(v as number)}</span>,
        },
        {
            key: 'published_stock',
            label: 'Stock publicado',
            render: (v) => <span className="text-sm">{v as number}</span>,
        },
        {
            key: 'status',
            label: 'Estado',
            render: (v) => {
                const s = statusMap[v as ListingStatus]
                return s ? <Badge variant={s.variant}>{s.label}</Badge> : <Badge variant="secondary">{v as string}</Badge>
            },
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
                <Select value={connectionFilter} onValueChange={setConnectionFilter}>
                    <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Todas las conexiones" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="">Todas las conexiones</SelectItem>
                        {connections.map(c => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="">Todos los estados</SelectItem>
                        <SelectItem value="active">Activa</SelectItem>
                        <SelectItem value="paused">Pausada</SelectItem>
                        <SelectItem value="closed">Cerrada</SelectItem>
                        <SelectItem value="under_review">En revision</SelectItem>
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
