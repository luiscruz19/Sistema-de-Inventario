'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/use-api'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'
import { Download, BookMarked } from 'lucide-react'

type IVAType = 'ventas' | 'compras'

type IVAEntry = {
    id: number
    date: string
    voucher_type: string
    voucher_number: string
    cuit: string
    name: string
    taxable_base: number
    iva_21: number
    iva_10_5: number
    iva_27: number
    other_taxes: number
    total: number
}

export default function LibroIVAPage() {
    const api = useApi()
    const [entries, setEntries] = useState<IVAEntry[]>([])
    const [loading, setLoading] = useState(false)
    const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
    const [type, setType] = useState<IVAType>('ventas')

    const totals = entries.reduce(
        (acc, e) => ({
            taxable_base: acc.taxable_base + e.taxable_base,
            iva_21: acc.iva_21 + e.iva_21,
            iva_10_5: acc.iva_10_5 + e.iva_10_5,
            iva_27: acc.iva_27 + e.iva_27,
            other_taxes: acc.other_taxes + e.other_taxes,
            total: acc.total + e.total,
        }),
        { taxable_base: 0, iva_21: 0, iva_10_5: 0, iva_27: 0, other_taxes: 0, total: 0 }
    )

    const fetchEntries = useCallback(async () => {
        if (!period) return
        setLoading(true)
        const res = await api.get<IVAEntry[]>('/tax-book', { period, type })
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
        const headers = ['Fecha', 'Tipo', 'Comprobante', 'CUIT', 'Nombre', 'Neto gravado', 'IVA 21%', 'IVA 10.5%', 'IVA 27%', 'Otros imp.', 'Total']
        const rows = entries.map(e => [
            e.date,
            e.voucher_type,
            e.voucher_number,
            e.cuit,
            e.name,
            e.taxable_base.toFixed(2),
            e.iva_21.toFixed(2),
            e.iva_10_5.toFixed(2),
            e.iva_27.toFixed(2),
            e.other_taxes.toFixed(2),
            e.total.toFixed(2),
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
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <BookMarked className="h-6 w-6" /> Libro IVA
                    </h1>
                    <p className="text-sm text-gray-500 mt-0.5">Registro de comprobantes con IVA</p>
                </div>
                <Button variant="outline" onClick={exportCSV}>
                    <Download className="h-4 w-4 mr-2" /> Exportar CSV
                </Button>
            </div>

            <div className="flex gap-3 mb-6">
                <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Periodo</Label>
                    <Input
                        type="month"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="w-[180px]"
                    />
                </div>
                <div>
                    <Label className="text-xs text-gray-500 mb-1 block">Tipo</Label>
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

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-400">Cargando...</div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-200">
                                        <th className="text-left py-3 px-4 font-semibold text-xs text-gray-500 uppercase tracking-wide">Fecha</th>
                                        <th className="text-left py-3 px-4 font-semibold text-xs text-gray-500 uppercase tracking-wide">Comprobante</th>
                                        <th className="text-left py-3 px-4 font-semibold text-xs text-gray-500 uppercase tracking-wide">CUIT</th>
                                        <th className="text-left py-3 px-4 font-semibold text-xs text-gray-500 uppercase tracking-wide">Nombre</th>
                                        <th className="text-right py-3 px-4 font-semibold text-xs text-gray-500 uppercase tracking-wide">Neto grav.</th>
                                        <th className="text-right py-3 px-4 font-semibold text-xs text-gray-500 uppercase tracking-wide">IVA 21%</th>
                                        <th className="text-right py-3 px-4 font-semibold text-xs text-gray-500 uppercase tracking-wide">IVA 10.5%</th>
                                        <th className="text-right py-3 px-4 font-semibold text-xs text-gray-500 uppercase tracking-wide">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-8 text-center text-gray-400">
                                                No hay registros para el periodo seleccionado
                                            </td>
                                        </tr>
                                    ) : (
                                        entries.map((entry) => (
                                            <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                                                <td className="py-2 px-4 font-mono text-xs">{entry.date}</td>
                                                <td className="py-2 px-4">
                                                    <span className="text-xs text-gray-500">{entry.voucher_type}</span>
                                                    <span className="ml-1 font-mono">{entry.voucher_number}</span>
                                                </td>
                                                <td className="py-2 px-4 font-mono text-xs">{entry.cuit || '-'}</td>
                                                <td className="py-2 px-4">{entry.name}</td>
                                                <td className="py-2 px-4 text-right">{formatCurrency(entry.taxable_base)}</td>
                                                <td className="py-2 px-4 text-right">{formatCurrency(entry.iva_21)}</td>
                                                <td className="py-2 px-4 text-right">{formatCurrency(entry.iva_10_5)}</td>
                                                <td className="py-2 px-4 text-right font-semibold">{formatCurrency(entry.total)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {entries.length > 0 && (
                            <>
                                <Separator />
                                <div className="p-4 bg-gray-50">
                                    <div className="flex justify-end gap-8 text-sm">
                                        <div className="text-right">
                                            <p className="text-gray-500 text-xs">Neto gravado</p>
                                            <p className="font-semibold">{formatCurrency(totals.taxable_base)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-gray-500 text-xs">IVA 21%</p>
                                            <p className="font-semibold">{formatCurrency(totals.iva_21)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-gray-500 text-xs">IVA 10.5%</p>
                                            <p className="font-semibold">{formatCurrency(totals.iva_10_5)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-gray-500 text-xs font-semibold">TOTAL</p>
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
