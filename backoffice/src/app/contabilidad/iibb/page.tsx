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
    jurisdiccion: string
    tipo: WithholdingType
    impuesto: string
    alicuota: number | string
    monto_minimo: number | string
    activa: boolean
}

type TaxWithholding = {
    id: number
    fecha: string
    sale_id: number | null
    purchase_order_id: number | null
    tipo: WithholdingType
    base_imponible: number | string
    alicuota: number | string
    monto: number | string
    numero_certificado?: string | null
    taxSetting?: { id: number; jurisdiccion: string; tipo: WithholdingType; impuesto: string; alicuota: number | string } | null
    createdAt: string
}

type TaxSettingForm = {
    jurisdiccion: string
    tipo: WithholdingType
    alicuota: string
    monto_minimo: string
    activa: boolean
}

const emptySettingForm: TaxSettingForm = {
    jurisdiccion: '',
    tipo: 'retencion',
    alicuota: '',
    monto_minimo: '0',
    activa: true,
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
        fecha: new Date().toISOString().split('T')[0],
        reference_type: 'sale' as 'sale' | 'purchase',
        reference_id: '',
        tax_setting_id: '',
        tipo: 'retencion' as WithholdingType,
        base_imponible: '',
        alicuota: '',
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
        if (period) {
            const [y, m] = period.split('-').map(Number)
            params.fecha_desde = `${period}-01`
            params.fecha_hasta = new Date(y, m, 0).toISOString().split('T')[0]
        }
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
            jurisdiccion: s.jurisdiccion,
            tipo: s.tipo,
            alicuota: String(s.alicuota),
            monto_minimo: String(s.monto_minimo),
            activa: s.activa,
        })
        setShowSettingModal(true)
    }

    const handleSaveSetting = async () => {
        if (!settingForm.jurisdiccion.trim() || !settingForm.alicuota) {
            toast({ title: 'Jurisdiccion y alicuota son obligatorias', variant: 'destructive' })
            return
        }
        setSaving(true)
        const alicuota = parseFloat(settingForm.alicuota)
        const monto_minimo = parseFloat(settingForm.monto_minimo) || 0
        // create: jurisdiccion, tipo, impuesto, alicuota (+ monto_minimo)
        // update: alicuota, monto_minimo, activa
        const body = editingSetting
            ? { alicuota, monto_minimo, activa: settingForm.activa }
            : { jurisdiccion: settingForm.jurisdiccion, tipo: settingForm.tipo, impuesto: 'IIBB', alicuota, monto_minimo }
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
        if (!withForm.tax_setting_id || !withForm.base_imponible || !withForm.alicuota) {
            toast({ title: 'Alicuota IIBB, base imponible y alicuota son obligatorias', variant: 'destructive' })
            return
        }
        setSaving(true)
        const base_imponible = parseFloat(withForm.base_imponible)
        const alicuota = parseFloat(withForm.alicuota)
        const refId = Number(withForm.reference_id) || null
        const res = await api.post('/tax-withholdings', {
            tax_setting_id: Number(withForm.tax_setting_id),
            tipo: withForm.tipo,
            base_imponible,
            alicuota,
            fecha: withForm.fecha,
            sale_id: withForm.reference_type === 'sale' ? refId : null,
            purchase_order_id: withForm.reference_type === 'purchase' ? refId : null,
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
        { key: 'jurisdiccion', label: 'Jurisdiccion', render: (v) => <span className="font-medium">{v as string}</span> },
        {
            key: 'tipo', label: 'Tipo',
            render: (v) => <Badge variant="outline">{v === 'retencion' ? 'Retencion' : 'Percepcion'}</Badge>,
        },
        {
            key: 'alicuota', label: 'Alicuota',
            render: (v) => <span className="font-mono font-semibold">{Number(v)}%</span>,
        },
        {
            key: 'monto_minimo', label: 'Base minima',
            render: (v) => <span className="text-sm">{formatCurrency(Number(v))}</span>,
        },
        {
            key: 'activa', label: 'Estado',
            render: (v) => <Badge variant={v ? 'success' : 'secondary'}>{v ? 'Activa' : 'Inactiva'}</Badge>,
        },
    ]

    const withColumns: Column<TaxWithholding>[] = [
        { key: 'fecha', label: 'Fecha', sortable: true, render: (v) => <span className="text-sm">{(v as string)?.split('T')[0] || '-'}</span> },
        {
            key: 'sale_id', label: 'Tipo ref.',
            render: (_v, row) => (
                <span className="text-sm">
                    {row.sale_id ? `Venta #${row.sale_id}` : row.purchase_order_id ? `Compra #${row.purchase_order_id}` : '-'}
                </span>
            ),
        },
        { key: 'taxSetting', label: 'Jurisdiccion', render: (_v, row) => <span className="text-sm">{row.taxSetting?.jurisdiccion || '-'}</span> },
        {
            key: 'tipo', label: 'Tipo',
            render: (v) => <Badge variant="outline">{v === 'retencion' ? 'Ret.' : 'Perc.'}</Badge>,
        },
        { key: 'base_imponible', label: 'Base imponible', render: (v) => <span className="text-sm">{formatCurrency(Number(v))}</span> },
        { key: 'alicuota', label: 'Alicuota', render: (v) => <span className="font-mono text-sm">{Number(v)}%</span> },
        { key: 'monto', label: 'Monto', render: (v) => <span className="font-semibold">{formatCurrency(Number(v))}</span> },
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
                        if (settings.length === 0) fetchSettings()
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
                            <Input value={settingForm.jurisdiccion} onChange={(e) => setSettingForm(f => ({ ...f, jurisdiccion: e.target.value }))} className="mt-1" placeholder="Ej: Salta, Buenos Aires, Nacional" autoFocus disabled={!!editingSetting} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Tipo</Label>
                                <Select value={settingForm.tipo} onValueChange={(v) => setSettingForm(f => ({ ...f, tipo: v as WithholdingType }))} disabled={!!editingSetting}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="retencion">Retencion</SelectItem>
                                        <SelectItem value="percepcion">Percepcion</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Alicuota (%) *</Label>
                                <Input type="number" min={0} max={100} step={0.01} value={settingForm.alicuota} onChange={(e) => setSettingForm(f => ({ ...f, alicuota: e.target.value }))} className="mt-1" />
                            </div>
                        </div>
                        <div>
                            <Label>Base minima</Label>
                            <Input type="number" min={0} value={settingForm.monto_minimo} onChange={(e) => setSettingForm(f => ({ ...f, monto_minimo: e.target.value }))} className="mt-1" />
                        </div>
                        {editingSetting && (
                            <div className="flex items-center justify-between">
                                <Label>Activa</Label>
                                <Select value={settingForm.activa ? 'true' : 'false'} onValueChange={(v) => setSettingForm(f => ({ ...f, activa: v === 'true' }))}>
                                    <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="true">Activa</SelectItem>
                                        <SelectItem value="false">Inactiva</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
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
                                <Input type="date" value={withForm.fecha} onChange={(e) => setWithForm(f => ({ ...f, fecha: e.target.value }))} className="mt-1" />
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
                        <div>
                            <Label>ID Referencia</Label>
                            <Input type="number" value={withForm.reference_id} onChange={(e) => setWithForm(f => ({ ...f, reference_id: e.target.value }))} className="mt-1" placeholder="ID de venta/compra (opcional)" />
                        </div>
                        <div>
                            <Label>Alicuota IIBB *</Label>
                            <Select
                                value={withForm.tax_setting_id}
                                onValueChange={(v) => {
                                    const s = settings.find(x => String(x.id) === v)
                                    setWithForm(f => ({
                                        ...f,
                                        tax_setting_id: v,
                                        tipo: s ? s.tipo : f.tipo,
                                        alicuota: s ? String(s.alicuota) : f.alicuota,
                                    }))
                                }}
                            >
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccione una alicuota configurada" /></SelectTrigger>
                                <SelectContent>
                                    {settings.map(s => (
                                        <SelectItem key={s.id} value={String(s.id)}>
                                            {s.jurisdiccion} - {s.tipo === 'retencion' ? 'Ret.' : 'Perc.'} {Number(s.alicuota)}%
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Tipo</Label>
                                <Select value={withForm.tipo} onValueChange={(v) => setWithForm(f => ({ ...f, tipo: v as WithholdingType }))}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="retencion">Retencion</SelectItem>
                                        <SelectItem value="percepcion">Percepcion</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Alicuota (%) *</Label>
                                <Input type="number" min={0} max={100} step={0.01} value={withForm.alicuota} onChange={(e) => setWithForm(f => ({ ...f, alicuota: e.target.value }))} className="mt-1" />
                            </div>
                        </div>
                        <div>
                            <Label>Base imponible *</Label>
                            <Input type="number" min={0} step={0.01} value={withForm.base_imponible} onChange={(e) => setWithForm(f => ({ ...f, base_imponible: e.target.value }))} className="mt-1" />
                        </div>
                        <Separator />
                        {withForm.base_imponible && withForm.alicuota && (
                            <p className="text-sm font-semibold text-right">
                                Monto a retener: {formatCurrency(parseFloat(withForm.base_imponible) * parseFloat(withForm.alicuota) / 100)}
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
