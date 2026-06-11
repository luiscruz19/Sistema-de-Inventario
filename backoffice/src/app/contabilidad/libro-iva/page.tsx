'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/use-api'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { formatCurrency } from '@/lib/utils'
import { Download, BookMarked, FileX } from 'lucide-react'

type IVAType = 'ventas' | 'compras'

type IVAEntry = {
    id: number
    fecha: string
    comprobante_tipo: string
    numero_comprobante: string
    cuit_contraparte: string
    nombre_contraparte: string
    neto_gravado: number | string
    neto_no_gravado: number | string
    iva_21: number | string
    iva_105: number | string
    iva_27: number | string
    total: number | string
}

export default function LibroIVAPage() {
    const api = useApi()
    const [entries, setEntries] = useState<IVAEntry[]>([])
    const [loading, setLoading] = useState(false)
    const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
    const [type, setType] = useState<IVAType>('ventas')

    const totals = entries.reduce(
        (acc, e) => ({
            neto_gravado: acc.neto_gravado + Number(e.neto_gravado),
            iva_21: acc.iva_21 + Number(e.iva_21),
            iva_105: acc.iva_105 + Number(e.iva_105),
            iva_27: acc.iva_27 + Number(e.iva_27),
            total: acc.total + Number(e.total),
        }),
        { neto_gravado: 0, iva_21: 0, iva_105: 0, iva_27: 0, total: 0 }
    )

    const fetchEntries = useCallback(async () => {
        if (!period) return
        setLoading(true)
        const res = await api.get<IVAEntry[]>('/vat-book', { periodo: period, tipo: type })
        if (res.status === 1 && res.data) {
            setEntries(Array.isArray(res.data) ? res.data : [])
        } else if (res.status !== 1) {
            toast({ title: 'Error al cargar libro IVA', description: res.message, variant: 'destructive' })
        }
        setLoading(false)
    }, [api, period, type])

    useEffect(() => { fetchEntries() }, [fetchEntries])

    const exportCSV = () => {
        if (entries.length === 0) {
            toast({ title: 'No hay datos para exportar', variant: 'destructive' })
            return
        }
        const headers = ['Fecha', 'Tipo', 'Comprobante', 'CUIT', 'Nombre', 'Neto gravado', 'IVA 21%', 'IVA 10.5%', 'IVA 27%', 'Total']
        const rows = entries.map(e => [
            e.fecha,
            e.comprobante_tipo,
            e.numero_comprobante,
            e.cuit_contraparte,
            e.nombre_contraparte,
            Number(e.neto_gravado).toFixed(2),
            Number(e.iva_21).toFixed(2),
            Number(e.iva_105).toFixed(2),
            Number(e.iva_27).toFixed(2),
            Number(e.total).toFixed(2),
        ])
        const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `libro-iva-${type}-${period}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                        <BookMarked className="h-6 w-6" /> Libro IVA
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Registro de comprobantes con IVA</p>
                </div>
                <Button variant="outline" onClick={exportCSV}>
                    <Download className="h-4 w-4 mr-2" /> Exportar CSV
                </Button>
            </div>

            <div className="flex gap-3 mb-6">
                <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Periodo</Label>
                    <Input
                        type="month"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="w-[180px]"
                    />
                </div>
                <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Tipo</Label>
                    <Select value={type} onValueChange={(v) => setType(v as IVAType)}>
                        <SelectTrigger className="w-[160px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ventas">IVA Ventas</SelectItem>
                            <SelectItem value="compras">IVA Compras</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                {loading ? (
                    <div className="divide-y divide-border">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-4 py-3">
                                <Skeleton className="h-4 w-20" />
                                <Skeleton className="h-4 w-28" />
                                <Skeleton className="h-4 flex-1 max-w-[160px]" />
                                <Skeleton className="h-4 w-20 ml-auto" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted border-b border-border">
                                        <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Fecha</th>
                                        <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Comprobante</th>
                                        <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">CUIT</th>
                                        <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Nombre</th>
                                        <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Neto grav.</th>
                                        <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">IVA 21%</th>
                                        <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">IVA 10.5%</th>
                                        <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="p-0">
                                                <EmptyState icon={FileX} title="Sin registros" description="No hay registros para el periodo seleccionado." />
                                            </td>
                                        </tr>
                                    ) : (
                                        entries.map((entry) => (
                                            <tr key={entry.id} className="border-b border-border hover:bg-muted">
                                                <td className="py-2 px-4 font-mono text-xs">{entry.fecha}</td>
                                                <td className="py-2 px-4">
                                                    <span className="text-xs text-muted-foreground">{entry.comprobante_tipo}</span>
                                                    <span className="ml-1 font-mono">{entry.numero_comprobante}</span>
                                                </td>
                                                <td className="py-2 px-4 font-mono text-xs">{entry.cuit_contraparte || '-'}</td>
                                                <td className="py-2 px-4">{entry.nombre_contraparte}</td>
                                                <td className="py-2 px-4 text-right">{formatCurrency(Number(entry.neto_gravado))}</td>
                                                <td className="py-2 px-4 text-right">{formatCurrency(Number(entry.iva_21))}</td>
                                                <td className="py-2 px-4 text-right">{formatCurrency(Number(entry.iva_105))}</td>
                                                <td className="py-2 px-4 text-right font-semibold">{formatCurrency(Number(entry.total))}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {entries.length > 0 && (
                            <>
                                <Separator />
                                <div className="p-4 bg-muted">
                                    <div className="flex justify-end gap-8 text-sm">
                                        <div className="text-right">
                                            <p className="text-muted-foreground text-xs">Neto gravado</p>
                                            <p className="font-semibold">{formatCurrency(totals.neto_gravado)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-muted-foreground text-xs">IVA 21%</p>
                                            <p className="font-semibold">{formatCurrency(totals.iva_21)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-muted-foreground text-xs">IVA 10.5%</p>
                                            <p className="font-semibold">{formatCurrency(totals.iva_105)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-muted-foreground text-xs font-semibold">TOTAL</p>
                                            <p className="font-bold text-lg">{formatCurrency(totals.total)}</p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
