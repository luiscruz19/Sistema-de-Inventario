'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/use-api'
import { toast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { DataTable, type Column } from '@/components/common/DataTable'
import { PageHead } from '@/components/common/PageHead'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Lock, Unlock, DollarSign, TrendingUp, AlertCircle } from 'lucide-react'
import type { CashRegister, Branch, Sale } from '@/types'

export default function CajaPage() {
    const api = useApi()
    const [branches, setBranches] = useState<Branch[]>([])
    const [selectedBranch, setSelectedBranch] = useState('')
    const [currentRegister, setCurrentRegister] = useState<CashRegister | null>(null)
    const [sessionSales, setSessionSales] = useState<Sale[]>([])
    const [history, setHistory] = useState<CashRegister[]>([])
    const [loading, setLoading] = useState(true)
    const [showOpenModal, setShowOpenModal] = useState(false)
    const [showCloseModal, setShowCloseModal] = useState(false)
    const [openingAmount, setOpeningAmount] = useState('')
    const [closingAmount, setClosingAmount] = useState('')

    useEffect(() => {
        api.get<Branch[]>('/branches').then(res => {
            if (res.status === 1 && res.data) {
                const data = Array.isArray(res.data) ? res.data : []
                setBranches(data)
                if (data.length > 0) setSelectedBranch(String(data[0].id))
            }
        })
    }, [api])

    const fetchCurrent = useCallback(async () => {
        if (!selectedBranch) return
        setLoading(true)
        const [currentRes, historyRes] = await Promise.all([
            api.get<CashRegister>('/cash-register', { current: 'true', branch_id: selectedBranch }),
            api.get<CashRegister[]>('/cash-register', { branch_id: selectedBranch, limit: '20' }),
        ])
        const currentReg = currentRes.status === 1 && currentRes.data ? currentRes.data : null
        setCurrentRegister(currentReg)
        if (historyRes.status === 1 && historyRes.data) setHistory(Array.isArray(historyRes.data) ? historyRes.data : [])
        // Ventas registradas bajo la apertura activa.
        if (currentReg?.id) {
            const salesRes = await api.get<Sale[]>('/sales', { cash_register_id: String(currentReg.id), limit: '100' })
            setSessionSales(salesRes.status === 1 && Array.isArray(salesRes.data) ? salesRes.data : [])
        } else {
            setSessionSales([])
        }
        setLoading(false)
    }, [api, selectedBranch])

    useEffect(() => { fetchCurrent() }, [fetchCurrent])

    const handleOpen = async () => {
        const amount = parseFloat(openingAmount)
        if (isNaN(amount) || amount < 0) { toast({ title: 'Ingresa un monto valido', variant: 'destructive' }); return }
        const res = await api.post('/cash-register', { branch_id: Number(selectedBranch), opening_amount: amount })
        if (res.status === 1) {
            toast({ title: 'Caja abierta', variant: 'success' })
            setShowOpenModal(false)
            setOpeningAmount('')
            fetchCurrent()
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    const handleClose = async () => {
        const amount = parseFloat(closingAmount)
        if (isNaN(amount) || amount < 0) { toast({ title: 'Ingresa un monto valido', variant: 'destructive' }); return }
        const res = await api.post('/cash-register/close', { branch_id: Number(selectedBranch), closing_amount: amount })
        if (res.status === 1) {
            toast({ title: 'Caja cerrada', variant: 'success' })
            setShowCloseModal(false)
            setClosingAmount('')
            fetchCurrent()
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    const difference = currentRegister?.expected_amount != null && currentRegister?.closing_amount != null
        ? currentRegister.closing_amount - currentRegister.expected_amount : null

    const historyColumns: Column<CashRegister>[] = [
        { key: 'branch', label: 'Sucursal', render: (_, r) => r.branch?.name || '-' },
        { key: 'opened_at', label: 'Apertura', render: (v) => v ? formatDateTime(v as string) : '-' },
        { key: 'closed_at', label: 'Cierre', render: (v) => v ? formatDateTime(v as string) : '-' },
        { key: 'opening_amount', label: 'Monto apertura', render: (v) => formatCurrency(v as number) },
        { key: 'closing_amount', label: 'Monto cierre', render: (v) => v != null ? formatCurrency(v as number) : '-' },
        { key: 'difference', label: 'Diferencia', render: (v) => {
            if (v == null) return '-'
            const n = v as number
            return <span className={n === 0 ? 'text-muted-foreground' : n > 0 ? 'text-success' : 'text-destructive'}>{n > 0 ? '+' : ''}{formatCurrency(n)}</span>
        }},
        { key: 'status', label: 'Estado', render: (v) => (
            <Badge variant={v === 'open' ? 'success' : 'secondary'}>{v === 'open' ? 'Abierta' : 'Cerrada'}</Badge>
        )},
    ]

    return (
        <div>
            <PageHead title="Caja" sub="Arqueo, apertura/cierre y movimientos de caja">
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Seleccionar sucursal" />
                    </SelectTrigger>
                    <SelectContent>
                        {branches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </PageHead>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            {currentRegister?.status === 'open'
                                ? <><Unlock className="h-4 w-4 text-success" /> Caja abierta</>
                                : <><Lock className="h-4 w-4 text-muted-foreground" /> Caja cerrada</>
                            }
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-3">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-9 w-full" />
                            </div>
                        ) : currentRegister?.status === 'open' ? (
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Abierta desde</span><span>{formatDateTime(currentRegister.opened_at)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Monto apertura</span><span>{formatCurrency(currentRegister.opening_amount)}</span></div>
                                {currentRegister.expected_amount != null && (
                                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Monto esperado</span><span className="font-semibold">{formatCurrency(currentRegister.expected_amount)}</span></div>
                                )}
                                <Separator />
                                <Button variant="destructive" className="w-full" onClick={() => setShowCloseModal(true)}>
                                    <Lock className="h-4 w-4 mr-2" /> Cerrar caja
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-sm text-muted-foreground">No hay caja abierta para esta sucursal</p>
                                <Button variant="success" className="w-full" onClick={() => setShowOpenModal(true)}>
                                    <Unlock className="h-4 w-4 mr-2" /> Abrir caja
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" /> Resumen del turno
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {currentRegister?.status === 'open' ? (
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-muted-foreground">Monto apertura</span><span>{formatCurrency(currentRegister.opening_amount)}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Ventas en efectivo</span><span>{currentRegister.expected_amount != null ? formatCurrency(currentRegister.expected_amount - currentRegister.opening_amount) : '-'}</span></div>
                                <Separator />
                                <div className="flex justify-between font-bold"><span>Monto esperado</span><span>{currentRegister.expected_amount != null ? formatCurrency(currentRegister.expected_amount) : '-'}</span></div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                                <AlertCircle className="h-5 w-5 text-muted-foreground" />
                                <p className="text-sm text-muted-foreground">Abri la caja para ver el resumen del turno</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {currentRegister?.status === 'open' && (
                <Card className="mb-6">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Ventas de esta apertura</CardTitle>
                            <Badge variant="secondary">
                                {sessionSales.length} {sessionSales.length === 1 ? 'venta' : 'ventas'} · {formatCurrency(sessionSales.reduce((acc, v) => acc + Number(v.total), 0))}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {sessionSales.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Todavía no se registraron ventas en esta caja.</p>
                        ) : (
                            <div className="divide-y divide-border">
                                {sessionSales.map(s => (
                                    <div key={s.id} className="flex items-center justify-between py-2 text-sm">
                                        <div>
                                            <span className="font-medium">{s.sale_number || `#${s.id}`}</span>
                                            <span className="ml-2 text-muted-foreground">{s.createdAt ? formatDateTime(s.createdAt) : ''}</span>
                                        </div>
                                        <span className="font-semibold tabular-nums">{formatCurrency(Number(s.total))}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Historial de cajas</CardTitle>
                </CardHeader>
                <CardContent>
                    <DataTable data={history} columns={historyColumns} isLoading={loading} emptyMessage="Sin historial" />
                </CardContent>
            </Card>

            {/* Open modal */}
            <Dialog open={showOpenModal} onOpenChange={setShowOpenModal}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Abrir caja</DialogTitle>
                        <DialogDescription>Ingresa el monto de apertura</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label>Monto de apertura</Label>
                            <div className="relative mt-1">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type="number" min={0} step={0.01} value={openingAmount} onChange={(e) => setOpeningAmount(e.target.value)} className="pl-9" placeholder="0.00" autoFocus />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowOpenModal(false)}>Cancelar</Button>
                        <Button variant="success" onClick={handleOpen}>Abrir caja</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Close modal */}
            <Dialog open={showCloseModal} onOpenChange={setShowCloseModal}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Cerrar caja</DialogTitle>
                        <DialogDescription>Ingresa el monto de cierre (conteo real)</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        {currentRegister?.expected_amount != null && (
                            <div className="bg-muted p-3 rounded-lg text-sm">
                                <span className="text-muted-foreground">Monto esperado: </span>
                                <span className="font-bold">{formatCurrency(currentRegister.expected_amount)}</span>
                            </div>
                        )}
                        <div>
                            <Label>Monto de cierre (conteo)</Label>
                            <div className="relative mt-1">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input type="number" min={0} step={0.01} value={closingAmount} onChange={(e) => setClosingAmount(e.target.value)} className="pl-9" placeholder="0.00" autoFocus />
                            </div>
                        </div>
                        {closingAmount && currentRegister?.expected_amount != null && (
                            <div className="text-sm">
                                Diferencia: <span className={Number(closingAmount) - currentRegister.expected_amount >= 0 ? 'text-success font-semibold' : 'text-destructive font-semibold'}>
                                    {formatCurrency(Number(closingAmount) - currentRegister.expected_amount)}
                                </span>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCloseModal(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleClose}>Cerrar caja</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
