'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/use-api'
import { DataTable, type Column } from '@/components/common/DataTable'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { formatDateTime } from '@/lib/utils'
import type { StockMovement, Pagination } from '@/types'

const typeMap: Record<string, { label: string; variant: 'default' | 'success' | 'destructive' | 'warning' | 'secondary' }> = {
    purchase: { label: 'Compra', variant: 'success' },
    sale: { label: 'Venta', variant: 'default' },
    adjustment: { label: 'Ajuste', variant: 'warning' },
    transfer_in: { label: 'Transf. entrada', variant: 'success' },
    transfer_out: { label: 'Transf. salida', variant: 'destructive' },
    return: { label: 'Devolucion', variant: 'secondary' },
}

export default function MovimientosPage() {
    const api = useApi()
    const [movements, setMovements] = useState<StockMovement[]>([])
    const [pagination, setPagination] = useState<Pagination>({ totalItems: 0, totalPages: 0, currentPage: 1, perPage: 20 })
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    const fetchMovements = useCallback(async (page = 1) => {
        setLoading(true)
        const params: Record<string, string> = { page: String(page), limit: '20' }
        if (search) params.search = search
        if (typeFilter) params.type = typeFilter
        if (dateFrom) params.date_from = dateFrom
        if (dateTo) params.date_to = dateTo
        const res = await api.get<StockMovement[]>('/movements', params)
        if (res.status === 1 && res.data) {
            setMovements(Array.isArray(res.data) ? res.data : [])
            if (res.pagination) setPagination(res.pagination)
        }
        setLoading(false)
    }, [api, search, typeFilter, dateFrom, dateTo])

    useEffect(() => { fetchMovements() }, [fetchMovements])

    const columns: Column<StockMovement>[] = [
        { key: 'createdAt', label: 'Fecha', sortable: true, render: (v) => v ? formatDateTime(v as string) : '-' },
        { key: 'product', label: 'Producto', render: (_, row) => (
            <div>
                <p className="font-medium">{row.product?.name || `#${row.product_id}`}</p>
                {row.variant && <p className="text-xs text-muted-foreground">{row.variant.name}</p>}
            </div>
        )},
        { key: 'type', label: 'Tipo', render: (v) => {
            const t = typeMap[v as string]
            return t ? <Badge variant={t.variant}>{t.label}</Badge> : <Badge variant="secondary">{v as string}</Badge>
        }},
        { key: 'quantity', label: 'Cantidad', render: (v) => {
            const n = v as number
            return <span className={n > 0 ? 'text-success font-semibold' : 'text-destructive font-semibold'}>{n > 0 ? `+${n}` : n}</span>
        }},
        { key: 'previous_stock', label: 'Anterior', render: (v) => v as number },
        { key: 'new_stock', label: 'Nuevo', render: (v) => <span className="font-semibold">{v as number}</span> },
        { key: 'branch', label: 'Sucursal', render: (_, row) => row.branch?.name || '-' },
        { key: 'notes', label: 'Notas', render: (v) => <span className="text-xs text-muted-foreground max-w-[200px] truncate block">{(v as string) || '-'}</span> },
    ]

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-semibold tracking-tight">Movimientos de stock</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Historial de entradas, salidas y ajustes</p>
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[160px]" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[160px]" />
            </div>

            <DataTable
                data={movements}
                columns={columns}
                pagination={pagination}
                onPageChange={(p) => fetchMovements(p)}
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Buscar producto..."
                filters={[
                    { key: 'type', label: 'Tipo', options: Object.entries(typeMap).map(([k, v]) => ({ value: k, label: v.label })) },
                ]}
                filterValues={{ type: typeFilter }}
                onFilterChange={(k, v) => { if (k === 'type') setTypeFilter(v) }}
                isLoading={loading}
                emptyMessage="Sin movimientos"
            />
        </div>
    )
}
