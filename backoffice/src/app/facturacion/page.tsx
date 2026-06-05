'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useInvoices } from '@/hooks/use-invoices'
import { DataTable, type Column } from '@/components/common/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { FileText, Plus, Download, Eye } from 'lucide-react'
import type { Invoice, InvoiceStatus } from '@/types'

const statusMap: Record<InvoiceStatus, { label: string; variant: 'success' | 'destructive' | 'warning' | 'default' }> = {
    draft: { label: 'Borrador', variant: 'default' },
    approved: { label: 'Aprobada', variant: 'success' },
    rejected: { label: 'Rechazada', variant: 'destructive' },
    void: { label: 'Anulada', variant: 'warning' },
}

export default function FacturacionPage() {
    const { invoices, pagination, loading, fetchList } = useInvoices()
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('')
    const [docType, setDocType] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')

    const load = useCallback((page = 1) => {
        const params: Record<string, string> = { page: String(page), limit: '20' }
        if (search) params.search = search
        if (status) params.status = status
        if (docType) params.doc_type = docType
        if (dateFrom) params.date_from = dateFrom
        if (dateTo) params.date_to = dateTo
        fetchList(params)
    }, [search, status, docType, dateFrom, dateTo, fetchList])

    useEffect(() => { load(1) }, [load])

    const columns: Column<Invoice>[] = [
        {
            key: 'full_number',
            label: 'Comprobante',
            render: (_, row) => (
                <div>
                    <div className="font-medium">{row.doc_type} {row.full_number || `${row.pto_vta}-${row.number}`}</div>
                    {row.mode === 'simulated' && <div className="text-[10px] text-warning">Simulado</div>}
                </div>
            ),
        },
        { key: 'issued_at', label: 'Fecha', render: (_, row) => row.issued_at ? formatDateTime(row.issued_at) : '-' },
        { key: 'receiver_name', label: 'Cliente', render: (_, row) => row.receiver_name || '-' },
        { key: 'total', label: 'Total', render: (v) => formatCurrency(Number(v)) },
        {
            key: 'status',
            label: 'Estado',
            render: (v) => {
                const st = statusMap[v as InvoiceStatus] || { label: String(v), variant: 'default' as const }
                return <Badge variant={st.variant}>{st.label}</Badge>
            },
        },
        { key: 'cae', label: 'CAE', render: (v) => v ? <span className="font-mono text-xs">{String(v)}</span> : '-' },
        {
            key: 'id',
            label: '',
            render: (_, row) => (
                <div className="flex gap-2 justify-end">
                    <Link href={`/inventario/facturacion/${row.id}`}>
                        <Button variant="outline" size="sm"><Eye className="h-4 w-4" /></Button>
                    </Link>
                    <a href={`/inventario/api/invoices/${row.id}/pdf`} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm"><Download className="h-4 w-4" /></Button>
                    </a>
                </div>
            ),
        },
    ]

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                        <FileText className="h-6 w-6 text-primary" /> Facturación electrónica
                    </h1>
                    <p className="text-sm text-muted-foreground">Comprobantes emitidos — AFIP / ARCA</p>
                </div>
                <Link href="/inventario/facturacion/emitir">
                    <Button><Plus className="h-4 w-4 mr-2" /> Emitir factura</Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4">
                <Input placeholder="Buscar (nro, CAE, cliente)" value={search} onChange={(e) => setSearch(e.target.value)} />
                <Select value={status || 'all'} onValueChange={(v) => setStatus(v === 'all' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="approved">Aprobada</SelectItem>
                        <SelectItem value="rejected">Rechazada</SelectItem>
                        <SelectItem value="void">Anulada</SelectItem>
                        <SelectItem value="draft">Borrador</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={docType || 'all'} onValueChange={(v) => setDocType(v === 'all' ? '' : v)}>
                    <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="A">Factura A</SelectItem>
                        <SelectItem value="B">Factura B</SelectItem>
                        <SelectItem value="C">Factura C</SelectItem>
                        <SelectItem value="NCA">NC A</SelectItem>
                        <SelectItem value="NCB">NC B</SelectItem>
                        <SelectItem value="NCC">NC C</SelectItem>
                    </SelectContent>
                </Select>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>

            <DataTable<Invoice>
                columns={columns}
                data={invoices}
                isLoading={loading}
                pagination={pagination}
                onPageChange={(p) => load(p)}
                emptyMessage="No hay facturas emitidas"
            />
        </div>
    )
}
