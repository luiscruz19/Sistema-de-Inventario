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
import { formatCurrency } from '@/lib/utils'
import { Plus, Pencil, Trash2, Percent } from 'lucide-react'
import type { Pagination } from '@/types'

type WithholdingType = 'retencion' | 'percepcion'

type TaxSetting = {
    id: number
    jurisdiction: string
    type: WithholdingType
    aliquot: number
    min_taxable_base: number
    active: boolean
    description?: string
}

type TaxWithholding = {
    id: number
    date: string
    reference_type: 'sale' | 'purchase'
    reference_id: number
    jurisdiction: string
    type: WithholdingType
    taxable_base: number
    aliquot: number
    amount: number
    createdAt: string
}

type TaxSettingForm = {
    jurisdiction: string
    type: WithholdingType
    aliquot: string
    min_taxable_base: string
    description: string
    active: boolean
}

const emptySettingForm: TaxSettingForm = {
    jurisdiction: '',
    type: 'retencion',
    aliquot: '',
    min_taxable_base: '0',
    description: '',
    active: true,
}

export default function IIBBPage() {
    const api = useApi()
    const [activeTab, setActiveTab] = useState<'configuracion' | 'historial'>('configuracion')
    const [settings, setSettings] = useState<TaxSetting[]>([])
    const [withholdingList, setWithholdingList] = useState<TaxWithholding[]>([])
    const [pagination, setPagination] = useState<Pagination>({ totalItems: 0, totalPages: 0, currentPage: 1, perPage: 20 })
    const [loading, setLoading] = useState(true)
    const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
    const [showSettingModal, setShowSettingModal] = useState(false)
    const [showWithholdingModal, setShowWithholdingModal] = useState(false)
    const [editingSetting, setEditingSetting] = useState<TaxSetting | null>(null)
    const [settingForm, setSettingForm] = useState<TaxSettingForm>(emptySettingForm)
    const [withForm, setWithForm] = useState({
        date: new Date().toISOString().split('T')[0],
        reference_type: 'sale' as 'sale' | 'purchase',
        reference_id: '',
        jurisdiction: '',
        type: 'retencion' as WithholdingType,
        taxable_base: '',
        aliquot: '',
    })
    const [saving, setSaving] = useState(false)

    const fetchSettings = useCallback(async () => {
        setLoading(true)
        const res = await api.get<TaxSetting[]>('/tax-settings')
        if (res.status === 1 && res.data) setSettings(Array.isArray(res.data) ? res.data : [])
        setLoading(false)
    }, [api])

    const fetchWithholdings = useCallback(async (page = 1) => {
        setLoading(true)
        const params: Record<string, string> = { page: String(page), limit: '20' }
        if (period) params.period = period
        const res = await api.get<TaxWithholding[]>('/tax-withholdings', params)
        if (res.status === 1 && res.data) {
            setWithholdingList(Array.isArray(res.data) ? res.data : [])
            if (res.pagination) setPagination(res.pagination)
        }
        setLoading(false)
    }, [api, period])

    useEffect(() => {
        if (activeTab === 'configuracion') fetchSettings()
        else fetchWithholdings()
    }, [activeTab, fetchSettings, fetchWithholdings])

    const openEditSetting = (s: TaxSetting) => {
        setEditingSetting(s)
        setSettingForm({
            jurisdiction: s.jurisdiction,
            type: s.type,
            aliquot: String(s.aliquot),
            min_taxable_base: String(s.min_taxable_base),
            description: s.description || '',
            active: s.active,
        })
        setShowSettingModal(true)
    }

    const handleSaveSetting = async () => {
        if (!settingForm.jurisdiction.trim() || !settingForm.aliquot) {
            toast({ title: 'Jurisdiccion y alicuota son obligatorias', variant: 'destructive' })
            return
        }
        setSaving(true)
        const body = {
            ...settingForm,
            aliquot: parseFloat(settingForm.aliquot),
            min_taxable_base: parseFloat(settingForm.min_taxable_base) || 0,
        }
        const res = editingSetting
            ? await api.put(`/tax-settings/${editingSetting.id}`, body)
            : await api.post('/tax-settings', body)
        if (res.status === 1) {
            toast({ title: editingSetting ? 'Configuracion actualizada' : 'Configuracion creada', variant: 'success' })
            setShowSettingModal(false)
            setEditingSetting(null)
            setSettingForm(emptySettingForm)
            fetchSettings()
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
        setSaving(false)
    }

    const handleDeleteSetting = async (id: number) => {
        if (!confirm('Eliminar esta configuracion?')) return
        const res = await api.del(`/tax-settings/${id}`)
        if (res.status === 1) { toast({ title: 'Eliminado', variant: 'success' }); fetchSettings() }
        else toast({ title: 'Error', description: res.message, variant: 'destructive' })
    }

    const handleSaveWithholding = async () => {
        if (!withForm.jurisdiction || !withForm.taxable_base || !withForm.aliquot) {
            toast({ title: 'Jurisdiccion, base imponible y alicuota son obligatorias', variant: 'destructive' })
            return
        }
        setSaving(true)
        const taxable = parseFloat(withForm.taxable_base)
        const aliquot = parseFloat(withForm.aliquot)
        const res = await api.post('/tax-withholdings', {
            ...withForm,
            reference_id: Number(withForm.reference_id) || undefined,
            taxable_base: taxable,
            aliquot,
            amount: taxable * (aliquot / 100),
        })
        if (res.status === 1) {
            toast({ title: 'Retencion registrada', variant: 'success' })
            setShowWithholdingModal(false)
            fetchWithholdings(pagination.currentPage)
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
        setSaving(false)
    }

    const settingColumns: Column<TaxSetting>[] = [
        { key: 'jurisdiction', label: 'Jurisdiccion', render: (v) => <span className="font-medium">{v as string}</span> },
        {
            key: 'type', label: 'Tipo',
            render: (v) => <Badge variant="outline">{v === 'retencion' ? 'Retencion' : 'Percepcion'}</Badge>,
        },
        {
            key: 'aliquot', label: 'Alicuota',
            render: (v) => <span className="font-mono font-semibold">{v as number}%</span>,
        },
        {
            key: 'min_taxable_base', label: 'Base minima',
            render: (v) => <span className="text-sm">{formatCurrency(v as number)}</span>,
        },
        {
            key: 'active', label: 'Estado',
            render: (v) => <Badge variant={v ? 'success' : 'secondary'}>{v ? 'Activa' : 'Inactiva'}</Badge>,
        },
    ]

    const withColumns: Column<TaxWithholding>[] = [
        { key: 'date', label: 'Fecha', sortable: true, render: (v) => <span className="text-sm">{(v as string)?.split('T')[0] || '-'}</span> },
        {
            key: 'reference_type', label: 'Tipo ref.',
            render: (v, row) => <span className="text-sm">{v === 'sale' ? 'Venta' : 'Compra'} #{row.reference_id}</span>,
        },
        { key: 'jurisdiction', label: 'Jurisdiccion', render: (v) => <span className="text-sm">{v as string}</span> },
        {
            key: 'type', label: 'Tipo',
            render: (v) => <Badge variant="outline">{v === 'retencion' ? 'Ret.' : 'Perc.'}</Badge>,
        },
        { key: 'taxable_base', label: 'Base imponible', render: (v) => <span className="text-sm">{formatCurrency(v as number)}</span> },
        { key: 'aliquot', label: 'Alicuota', render: (v) => <span className="font-mono text-sm">{v as number}%</span> },
        { key: 'amount', label: 'Monto', render: (v) => <span className="font-semibold">{formatCurrency(v as number)}</span> },
    ]

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                        <Percent className="h-6 w-6" /> IIBB / Retenciones
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Configuracion y registro de retenciones y percepciones</p>
                </div>
                <Button onClick={() => {
                    if (activeTab === 'configuracion') {
                        setEditingSetting(null)
                        setSettingForm(emptySettingForm)
                        setShowSettingModal(true)
                    } else {
                        setShowWithholdingModal(true)
                    }
                }}>
                    <Plus className="h-4 w-4 mr-2" />
                    {activeTab === 'configuracion' ? 'Nueva alicuota' : 'Registrar retencion'}
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b border-border">
                {(['configuracion', 'historial'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                            activeTab === tab
                                ? 'border-primary text-primary'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {tab === 'configuracion' ? 'Configuracion de alicuotas' : 'Historial de retenciones'}
                    </button>
                ))}
            </div>

            {activeTab === 'configuracion' ? (
                <DataTable
                    data={settings}
                    columns={settingColumns}
                    isLoading={loading}
                    emptyMessage="No hay alicuotas configuradas"
                    actions={(row) => (
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditSetting(row)}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/80" onClick={() => handleDeleteSetting(row.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                />
            ) : (
                <>
                    <div className="flex gap-3 mb-4">
                        <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Periodo</Label>
                            <Input
                                type="month"
                                value={period}
                                onChange={(e) => setPeriod(e.target.value)}
                                className="w-[180px]"
                            />
                        </div>
                    </div>
                    <DataTable
                        data={withholdingList}
                        columns={withColumns}
                        pagination={pagination}
                        onPageChange={(p) => fetchWithholdings(p)}
                        isLoading={loading}
                        emptyMessage="No hay retenciones en el periodo"
                    />
                </>
            )}

            {/* Modal configuracion */}
            <Dialog open={showSettingModal} onOpenChange={setShowSettingModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editingSetting ? 'Editar alicuota' : 'Nueva alicuota IIBB'}</DialogTitle>
                        <DialogDescription>Configuracion por jurisdiccion y tipo</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Jurisdiccion *</Label>
                            <Input value={settingForm.jurisdiction} onChange={(e) => setSettingForm(f => ({ ...f, jurisdiction: e.target.value }))} className="mt-1" placeholder="Ej: Salta, Buenos Aires, Nacional" autoFocus />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Tipo</Label>
                                <Select value={settingForm.type} onValueChange={(v) => setSettingForm(f => ({ ...f, type: v as WithholdingType }))}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="retencion">Retencion</SelectItem>
                                        <SelectItem value="percepcion">Percepcion</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Alicuota (%) *</Label>
                                <Input type="number" min={0} max={100} step={0.01} value={settingForm.aliquot} onChange={(e) => setSettingForm(f => ({ ...f, aliquot: e.target.value }))} className="mt-1" />
                            </div>
                        </div>
                        <div>
                            <Label>Base minima</Label>
                            <Input type="number" min={0} value={settingForm.min_taxable_base} onChange={(e) => setSettingForm(f => ({ ...f, min_taxable_base: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                            <Label>Descripcion</Label>
                            <Input value={settingForm.description} onChange={(e) => setSettingForm(f => ({ ...f, description: e.target.value }))} className="mt-1" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSettingModal(false)}>Cancelar</Button>
                        <Button onClick={handleSaveSetting} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal nueva retencion */}
            <Dialog open={showWithholdingModal} onOpenChange={setShowWithholdingModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Registrar retencion / percepcion</DialogTitle>
                        <DialogDescription>Retencion IIBB manual</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Fecha</Label>
                                <Input type="date" value={withForm.date} onChange={(e) => setWithForm(f => ({ ...f, date: e.target.value }))} className="mt-1" />
                            </div>
                            <div>
                                <Label>Tipo referencia</Label>
                                <Select value={withForm.reference_type} onValueChange={(v) => setWithForm(f => ({ ...f, reference_type: v as 'sale' | 'purchase' }))}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="sale">Venta</SelectItem>
                                        <SelectItem value="purchase">Compra</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>ID Referencia</Label>
                                <Input type="number" value={withForm.reference_id} onChange={(e) => setWithForm(f => ({ ...f, reference_id: e.target.value }))} className="mt-1" placeholder="ID de venta/compra" />
                            </div>
                            <div>
                                <Label>Jurisdiccion *</Label>
                                <Input value={withForm.jurisdiction} onChange={(e) => setWithForm(f => ({ ...f, jurisdiction: e.target.value }))} className="mt-1" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Tipo</Label>
                                <Select value={withForm.type} onValueChange={(v) => setWithForm(f => ({ ...f, type: v as WithholdingType }))}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="retencion">Retencion</SelectItem>
                                        <SelectItem value="percepcion">Percepcion</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Alicuota (%) *</Label>
                                <Input type="number" min={0} max={100} step={0.01} value={withForm.aliquot} onChange={(e) => setWithForm(f => ({ ...f, aliquot: e.target.value }))} className="mt-1" />
                            </div>
                        </div>
                        <div>
                            <Label>Base imponible *</Label>
                            <Input type="number" min={0} step={0.01} value={withForm.taxable_base} onChange={(e) => setWithForm(f => ({ ...f, taxable_base: e.target.value }))} className="mt-1" />
                        </div>
                        <Separator />
                        {withForm.taxable_base && withForm.aliquot && (
                            <p className="text-sm font-semibold text-right">
                                Monto a retener: {formatCurrency(parseFloat(withForm.taxable_base) * parseFloat(withForm.aliquot) / 100)}
                            </p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowWithholdingModal(false)}>Cancelar</Button>
                        <Button onClick={handleSaveWithholding} disabled={saving}>{saving ? 'Guardando...' : 'Registrar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
