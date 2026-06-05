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
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Lock, Unlock, DollarSign, TrendingUp, AlertCircle } from 'lucide-react'
import type { CashRegister, Branch } from '@/types'

export default function CajaPage() {
    const api = useApi()
    const [branches, setBranches] = useState<Branch[]>([])
    const [selectedBranch, setSelectedBranch] = useState('')
    const [currentRegister, setCurrentRegister] = useState<CashRegister | null>(null)
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
        if (currentRes.status === 1 && currentRes.data) setCurrentRegister(currentRes.data)
        else setCurrentRegister(null)
        if (historyRes.status === 1 && historyRes.data) setHistory(Array.isArray(historyRes.data) ? historyRes.data : [])
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
            return <span className={n === 0 ? 'text-gray-600' : n > 0 ? 'text-green-600' : 'text-red-600'}>{n > 0 ? '+' : ''}{formatCurrency(n)}</span>
        }},
        { key: 'status', label: 'Estado', render: (v) => (
            <Badge variant={v === 'open' ? 'success' : 'secondary'}>{v === 'open' ? 'Abierta' : 'Cerrada'}</Badge>
        )},
    ]

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Caja</h1>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Seleccionar sucursal" />
                    </SelectTrigger>
                    <SelectContent>
                        {branches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            {currentRegister?.status === 'open'
                                ? <><Unlock className="h-4 w-4 text-green-600" /> Caja abierta</>
                                : <><Lock className="h-4 w-4 text-gray-400" /> Caja cerrada</>
                            }
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p className="text-sm text-gray-400">Cargando...</p>
                        ) : currentRegister?.status === 'open' ? (
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm"><span className="text-gray-500">Abierta desde</span><span>{formatDateTime(currentRegister.opened_at)}</span></div>
                                <div className="flex justify-between text-sm"><span className="text-gray-500">Monto apertura</span><span>{formatCurrency(currentRegister.opening_amount)}</span></div>
                                {currentRegister.expected_amount != null && (
                                    <div className="flex justify-between text-sm"><span className="text-gray-500">Monto esperado</span><span className="font-semibold">{formatCurrency(currentRegister.expected_amount)}</span></div>
                                )}
                                <Separator />
                                <Button variant="destructive" className="w-full" onClick={() => setShowCloseModal(true)}>
                                    <Lock className="h-4 w-4 mr-2" /> Cerrar caja
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-sm text-gray-500">No hay caja abierta para esta sucursal</p>
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
                                <div className="flex justify-between"><span className="text-gray-500">Monto apertura</span><span>{formatCurrency(currentRegister.opening_amount)}</span></div>
                                <div className="flex justify-between"><span className="text-gray-500">Ventas en efectivo</span><span>{currentRegister.expected_amount != null ? formatCurrency(currentRegister.expected_amount - currentRegister.opening_amount) : '-'}</span></div>
                                <Separator />
                                <div className="flex justify-between font-bold"><span>Monto esperado</span><span>{currentRegister.expected_amount != null ? formatCurrency(currentRegister.expected_amount) : '-'}</span></div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                                <AlertCircle className="h-5 w-5 text-gray-400" />
                                <p className="text-sm text-gray-500">Abri la caja para ver el resumen del turno</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

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
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                            <div className="bg-gray-50 p-3 rounded-lg text-sm">
                                <span className="text-gray-500">Monto esperado: </span>
                                <span className="font-bold">{formatCurrency(currentRegister.expected_amount)}</span>
                            </div>
                        )}
                        <div>
                            <Label>Monto de cierre (conteo)</Label>
                            <div className="relative mt-1">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input type="number" min={0} step={0.01} value={closingAmount} onChange={(e) => setClosingAmount(e.target.value)} className="pl-9" placeholder="0.00" autoFocus />
                            </div>
                        </div>
                        {closingAmount && currentRegister?.expected_amount != null && (
                            <div className="text-sm">
                                Diferencia: <span className={Number(closingAmount) - currentRegister.expected_amount >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
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
