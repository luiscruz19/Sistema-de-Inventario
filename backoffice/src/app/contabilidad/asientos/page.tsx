'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/use-api'
import { toast } from '@/hooks/use-toast'
import { DataTable, type Column } from '@/components/common/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Plus, Eye, FileSpreadsheet, XCircle } from 'lucide-react'
import type { Pagination } from '@/types'

// Form-side line shape (inputs use strings). Persisted as debe/haber/descripcion in backend.
type JournalLineForm = {
    id?: number
    account_id: string
    descripcion: string
    debit: string
    credit: string
}

// Backend line shape (debe/haber come back as DECIMAL strings)
type JournalLine = {
    id?: number
    account_id: number
    account?: { id: number; codigo: string; nombre: string; tipo: string } | null
    descripcion?: string | null
    debe: string
    haber: string
}

type JournalEntry = {
    id: number
    numero: number
    fecha: string
    descripcion: string
    tipo: 'manual' | 'automatico'
    aprobado: boolean
    total_debe: string
    total_haber: string
    lines?: JournalLine[]
    createdAt: string
}

const emptyLine: JournalLineForm = { account_id: '', descripcion: '', debit: '0', credit: '0' }

export default function AsientosPage() {
    const api = useApi()
    const [entries, setEntries] = useState<JournalEntry[]>([])
    const [pagination, setPagination] = useState<Pagination>({ totalItems: 0, totalPages: 0, currentPage: 1, perPage: 20 })
    const [loading, setLoading] = useState(true)
    const [periodFilter, setPeriodFilter] = useState('')
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showDetailModal, setShowDetailModal] = useState(false)
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null)
    const [saving, setSaving] = useState(false)

    const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
    const [formDescription, setFormDescription] = useState('')
    const [lines, setLines] = useState<JournalLineForm[]>([{ ...emptyLine }, { ...emptyLine }])

    const totalDebits = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0)
    const totalCredits = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0)
    const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01

    const fetchEntries = useCallback(async (page = 1) => {
        setLoading(true)
        const params: Record<string, string> = { page: String(page), limit: '20' }
        if (periodFilter) {
            // periodFilter llega como 'YYYY-MM' (Input type="month"); el backend filtra por rango de fechas
            const [y, m] = periodFilter.split('-').map(Number)
            const lastDay = new Date(y, m, 0).getDate()
            params.fecha_desde = `${periodFilter}-01`
            params.fecha_hasta = `${periodFilter}-${String(lastDay).padStart(2, '0')}`
        }
        const res = await api.get<JournalEntry[]>('/journal-entries', params)
        if (res.status === 1 && res.data) {
            setEntries(Array.isArray(res.data) ? res.data : [])
            if (res.pagination) setPagination(res.pagination)
        }
        setLoading(false)
    }, [api, periodFilter])

    useEffect(() => { fetchEntries() }, [fetchEntries])

    const addLine = () => setLines(prev => [...prev, { ...emptyLine }])
    const removeLine = (i: number) => { if (lines.length > 2) setLines(prev => prev.filter((_, idx) => idx !== i)) }
    const updateLine = (i: number, field: keyof JournalLineForm, value: string) => {
        setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l))
    }

    const handleSave = async () => {
        if (!formDescription.trim()) {
            toast({ title: 'La descripcion es obligatoria', variant: 'destructive' })
            return
        }
        if (!isBalanced) {
            toast({ title: 'El asiento no balancea', description: `Debitos: ${formatCurrency(totalDebits)} | Creditos: ${formatCurrency(totalCredits)}`, variant: 'destructive' })
            return
        }
        const validLines = lines.filter(l => l.account_id && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0))
        if (validLines.length < 2) {
            toast({ title: 'Se necesitan al menos 2 lineas con cuenta y monto', variant: 'destructive' })
            return
        }
        setSaving(true)
        const res = await api.post('/journal-entries', {
            fecha: formDate,
            descripcion: formDescription,
            lines: validLines.map(l => ({
                account_id: Number(l.account_id),
                descripcion: l.descripcion,
                debe: parseFloat(l.debit) || 0,
                haber: parseFloat(l.credit) || 0,
            })),
        })
        if (res.status === 1) {
            toast({ title: 'Asiento creado', variant: 'success' })
            setShowCreateModal(false)
            setFormDescription('')
            setLines([{ ...emptyLine }, { ...emptyLine }])
            fetchEntries(pagination.currentPage)
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
        setSaving(false)
    }

    const viewDetail = async (entry: JournalEntry) => {
        const res = await api.get<JournalEntry>(`/journal-entries/${entry.id}`)
        if (res.status === 1 && res.data) setSelectedEntry(res.data)
        setShowDetailModal(true)
    }

    const columns: Column<JournalEntry>[] = [
        {
            key: 'fecha',
            label: 'Fecha',
            sortable: true,
            render: (v) => <span className="text-sm">{v ? (v as string).split('T')[0] : '-'}</span>,
        },
        {
            key: 'numero',
            label: 'N° Asiento',
            render: (v) => <span className="font-mono font-semibold text-sm">{v as number}</span>,
        },
        {
            key: 'descripcion',
            label: 'Descripcion',
            render: (v) => <span className="text-sm truncate max-w-[250px] block">{v as string}</span>,
        },
        {
            key: 'total_debe',
            label: 'Total',
            sortable: true,
            render: (v) => <span className="font-semibold">{formatCurrency(Number(v))}</span>,
        },
        {
            key: 'aprobado',
            label: 'Estado',
            render: (v) => (
                <Badge variant={v ? 'success' : 'secondary'}>{v ? 'Aprobado' : 'Borrador'}</Badge>
            ),
        },
    ]

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                        <FileSpreadsheet className="h-6 w-6" /> Asientos contables
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Journal entries del libro diario</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Nuevo asiento
                </Button>
            </div>

            <div className="flex gap-3 mb-4">
                <Input
                    type="month"
                    value={periodFilter}
                    onChange={(e) => setPeriodFilter(e.target.value)}
                    className="w-[180px]"
                />
            </div>

            <DataTable
                data={entries}
                columns={columns}
                pagination={pagination}
                onPageChange={(p) => fetchEntries(p)}
                isLoading={loading}
                emptyMessage="No se encontraron asientos"
                actions={(row) => (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => viewDetail(row)}>
                        <Eye className="h-4 w-4" />
                    </Button>
                )}
            />

            {/* Modal crear asiento */}
            <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Nuevo asiento manual</DialogTitle>
                        <DialogDescription>Los debitos deben igualar a los creditos</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Fecha</Label>
                                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className="mt-1" />
                            </div>
                            <div>
                                <Label>Descripcion *</Label>
                                <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="mt-1" placeholder="Concepto del asiento" autoFocus />
                            </div>
                        </div>

                        <Separator />

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <Label>Lineas del asiento</Label>
                                <Button variant="outline" size="sm" onClick={addLine}>
                                    <Plus className="h-3.5 w-3.5 mr-1" /> Agregar linea
                                </Button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left pb-2 font-medium text-muted-foreground">ID Cuenta</th>
                                            <th className="text-left pb-2 font-medium text-muted-foreground">Descripcion</th>
                                            <th className="text-right pb-2 font-medium text-muted-foreground w-28">Debito</th>
                                            <th className="text-right pb-2 font-medium text-muted-foreground w-28">Credito</th>
                                            <th className="w-8" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lines.map((line, i) => (
                                            <tr key={i} className="border-b border-border">
                                                <td className="py-1 pr-2">
                                                    <Input
                                                        type="number"
                                                        value={line.account_id}
                                                        onChange={(e) => updateLine(i, 'account_id', e.target.value)}
                                                        className="h-8 w-24 font-mono"
                                                        placeholder="ID"
                                                    />
                                                </td>
                                                <td className="py-1 pr-2">
                                                    <Input
                                                        value={line.descripcion}
                                                        onChange={(e) => updateLine(i, 'descripcion', e.target.value)}
                                                        className="h-8"
                                                        placeholder="Descripcion"
                                                    />
                                                </td>
                                                <td className="py-1 pr-2">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        step={0.01}
                                                        value={line.debit}
                                                        onChange={(e) => updateLine(i, 'debit', e.target.value)}
                                                        className="h-8 text-right"
                                                    />
                                                </td>
                                                <td className="py-1 pr-2">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        step={0.01}
                                                        value={line.credit}
                                                        onChange={(e) => updateLine(i, 'credit', e.target.value)}
                                                        className="h-8 text-right"
                                                    />
                                                </td>
                                                <td className="py-1">
                                                    {lines.length > 2 && (
                                                        <button onClick={() => removeLine(i)} className="text-muted-foreground/60 hover:text-destructive">
                                                            <XCircle className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-border">
                                            <td colSpan={2} className="pt-2 text-sm font-semibold text-right pr-2">Totales:</td>
                                            <td className="pt-2 text-right font-bold pr-2">{formatCurrency(totalDebits)}</td>
                                            <td className="pt-2 text-right font-bold pr-2">{formatCurrency(totalCredits)}</td>
                                            <td />
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            {!isBalanced && (totalDebits > 0 || totalCredits > 0) && (
                                <p className="text-sm text-destructive mt-2">
                                    El asiento no balancea. Diferencia: {formatCurrency(Math.abs(totalDebits - totalCredits))}
                                </p>
                            )}
                            {isBalanced && totalDebits > 0 && (
                                <p className="text-sm text-success mt-2">Asiento balanceado</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving || !isBalanced}>
                            {saving ? 'Guardando...' : 'Crear asiento'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal detalle */}
            <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            Asiento {selectedEntry?.numero}
                            {selectedEntry && (
                                <Badge variant={selectedEntry.aprobado ? 'success' : 'secondary'}>
                                    {selectedEntry.aprobado ? 'Aprobado' : 'Borrador'}
                                </Badge>
                            )}
                        </DialogTitle>
                        <DialogDescription>{selectedEntry?.descripcion}</DialogDescription>
                    </DialogHeader>
                    {selectedEntry && (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">Fecha: {selectedEntry.fecha ? (selectedEntry.fecha as string).split('T')[0] : '-'}</p>
                            <Separator />
                            {selectedEntry.lines && selectedEntry.lines.length > 0 && (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-muted-foreground">
                                            <th className="text-left pb-1">Cuenta</th>
                                            <th className="text-right pb-1">Debito</th>
                                            <th className="text-right pb-1">Credito</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedEntry.lines.map((line, i) => (
                                            <tr key={i} className="border-b border-border">
                                                <td className="py-1">
                                                    {line.account ? (
                                                        <span>{line.account.codigo} — {line.account.nombre}</span>
                                                    ) : (
                                                        <span className="text-muted-foreground">#{line.account_id}</span>
                                                    )}
                                                    {line.descripcion && <span className="text-muted-foreground ml-2 text-xs">({line.descripcion})</span>}
                                                </td>
                                                <td className="py-1 text-right">{Number(line.debe) > 0 ? formatCurrency(Number(line.debe)) : '-'}</td>
                                                <td className="py-1 text-right">{Number(line.haber) > 0 ? formatCurrency(Number(line.haber)) : '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="border-t-2 border-border font-semibold">
                                            <td className="pt-1">Total</td>
                                            <td className="pt-1 text-right">{formatCurrency(Number(selectedEntry.total_debe))}</td>
                                            <td className="pt-1 text-right">{formatCurrency(Number(selectedEntry.total_haber))}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDetailModal(false)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
