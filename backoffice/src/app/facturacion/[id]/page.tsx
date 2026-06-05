'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useInvoices } from '@/hooks/use-invoices'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { toast } from '@/hooks/use-toast'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { ArrowLeft, Download, RefreshCw, FileMinus, Ban, FileX } from 'lucide-react'
import type { Invoice } from '@/types'

export default function InvoiceDetailPage() {
    const params = useParams<{ id: string }>()
    const router = useRouter()
    const id = Number(params?.id)
    const { getById, retry, voidInvoice, createCreditNote } = useInvoices()
    const [invoice, setInvoice] = useState<Invoice | null>(null)
    const [loading, setLoading] = useState(true)
    const [acting, setActing] = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        const res = await getById(id)
        if (res.status === 1 && res.data) setInvoice(res.data)
        setLoading(false)
    }, [getById, id])

    useEffect(() => { if (id) load() }, [id, load])

    async function handleRetry() {
        setActing(true)
        const res = await retry(id)
        setActing(false)
        if (res.status === 1) {
            toast({ title: 'Reintento enviado', description: res.message, variant: 'success' })
            load()
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    async function handleVoid() {
        if (!confirm('¿Anular esta factura? Se emitirá una NC automática.')) return
        setActing(true)
        const res = await voidInvoice(id)
        setActing(false)
        if (res.status === 1) {
            toast({ title: 'Factura anulada', variant: 'success' })
            load()
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    async function handleCreditNote() {
        setActing(true)
        const res = await createCreditNote(id)
        setActing(false)
        if (res.status === 1) {
            toast({ title: 'Nota de crédito emitida', variant: 'success' })
            router.push('/inventario/facturacion')
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    if (loading) return (
        <div className="space-y-6">
            <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-8 w-72" /><Skeleton className="h-5 w-24" /></div>
            <Card><CardContent className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}</CardContent></Card>
        </div>
    )
    if (!invoice) return (
        <Card><CardContent className="p-0"><EmptyState icon={FileX} title="Factura no encontrada" description="El comprobante que buscas no existe o fue eliminado." action={<Link href="/inventario/facturacion"><Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" /> Volver al listado</Button></Link>} /></CardContent></Card>
    )

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <Link href="/inventario/facturacion" className="text-sm text-muted-foreground hover:underline inline-flex items-center gap-1">
                        <ArrowLeft className="h-4 w-4" /> Volver al listado
                    </Link>
                    <h1 className="text-2xl font-semibold tracking-tight mt-1">
                        Comprobante {invoice.doc_type} {invoice.full_number || `${invoice.pto_vta}-${invoice.number}`}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant={invoice.status === 'approved' ? 'success' : invoice.status === 'rejected' ? 'destructive' : invoice.status === 'void' ? 'warning' : 'default'}>
                            {invoice.status}
                        </Badge>
                        {invoice.mode === 'simulated' && <Badge variant="warning">Modo simulado</Badge>}
                    </div>
                </div>
                <div className="flex gap-2">
                    <a href={`/inventario/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
                        <Button variant="outline"><Download className="h-4 w-4 mr-2" /> PDF</Button>
                    </a>
                    {invoice.status === 'rejected' && (
                        <Button onClick={handleRetry} disabled={acting}>
                            <RefreshCw className="h-4 w-4 mr-2" /> Reintentar CAE
                        </Button>
                    )}
                    {invoice.status === 'approved' && ['A', 'B', 'C'].includes(invoice.doc_type) && (
                        <>
                            <Button variant="outline" onClick={handleCreditNote} disabled={acting}>
                                <FileMinus className="h-4 w-4 mr-2" /> Emitir NC
                            </Button>
                            <Button variant="destructive" onClick={handleVoid} disabled={acting}>
                                <Ban className="h-4 w-4 mr-2" /> Anular
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader><CardTitle className="text-base">Detalle</CardTitle></CardHeader>
                    <CardContent>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-muted-foreground">
                                    <th className="py-2">Descripción</th>
                                    <th className="py-2 text-right">Cant.</th>
                                    <th className="py-2 text-right">P. Unit.</th>
                                    <th className="py-2 text-right">Neto</th>
                                    <th className="py-2 text-right">IVA</th>
                                    <th className="py-2 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(invoice.items || []).map((it) => (
                                    <tr key={it.id} className="border-t">
                                        <td className="py-2">{it.description}</td>
                                        <td className="py-2 text-right">{Number(it.quantity).toFixed(2)}</td>
                                        <td className="py-2 text-right">{formatCurrency(Number(it.unit_price))}</td>
                                        <td className="py-2 text-right">{formatCurrency(Number(it.net_amount))}</td>
                                        <td className="py-2 text-right">{formatCurrency(Number(it.tax_amount))}</td>
                                        <td className="py-2 text-right font-medium">{formatCurrency(Number(it.total))}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <Separator className="my-4" />
                        <div className="flex justify-end">
                            <div className="text-right space-y-1 text-sm">
                                <div>Neto: <span className="font-medium">{formatCurrency(Number(invoice.net_amount))}</span></div>
                                <div>IVA: <span className="font-medium">{formatCurrency(Number(invoice.tax_amount))}</span></div>
                                <div className="text-lg font-bold">Total: {formatCurrency(Number(invoice.total))}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <Card>
                        <CardHeader><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
                        <CardContent className="text-sm space-y-1">
                            <div className="font-medium">{invoice.receiver_name || 'Consumidor final'}</div>
                            <div className="text-muted-foreground">{invoice.receiver_doc_type} {invoice.receiver_doc_number || '-'}</div>
                            {invoice.receiver_address && <div className="text-muted-foreground">{invoice.receiver_address}</div>}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="text-base">CAE / AFIP</CardTitle></CardHeader>
                        <CardContent className="text-sm space-y-1">
                            <div>CAE: <span className="font-mono">{invoice.cae || '-'}</span></div>
                            <div>Vto. CAE: {invoice.cae_expiration || '-'}</div>
                            <div>Emisión: {invoice.issued_at ? formatDateTime(invoice.issued_at) : '-'}</div>
                            {invoice.rejection_reason && (
                                <div className="text-destructive mt-2">Motivo: {invoice.rejection_reason}</div>
                            )}
                            {invoice.qr_url && (
                                <div className="mt-2 text-xs break-all">
                                    <a href={invoice.qr_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                        Ver QR AFIP
                                    </a>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
