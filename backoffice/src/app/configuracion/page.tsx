'use client'

import { useState, useEffect } from 'react'
import { useApi } from '@/hooks/use-api'
import { toast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Settings, Save, Loader2 } from 'lucide-react'
import type { BusinessConfig } from '@/types'

export default function ConfiguracionPage() {
    const api = useApi()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        name: '', tax_id: '', address: '', phone: '', currency: 'ARS',
        tax_rate_default: '21', receipt_prefix: 'T', receipt_next_number: '1',
    })

    useEffect(() => {
        api.get<BusinessConfig>('/business-config').then(res => {
            if (res.status === 1 && res.data) {
                const d = res.data
                setForm({
                    name: d.name || '', tax_id: d.tax_id || '', address: d.address || '', phone: d.phone || '',
                    currency: d.currency || 'ARS', tax_rate_default: String(d.tax_rate_default ?? 21),
                    receipt_prefix: d.receipt_prefix || 'T', receipt_next_number: String(d.receipt_next_number ?? 1),
                })
            }
            setLoading(false)
        })
    }, [api])

    const handleSave = async () => {
        setSaving(true)
        const res = await api.put('/business-config', {
            name: form.name,
            tax_id: form.tax_id || null,
            address: form.address || null,
            phone: form.phone || null,
            currency: form.currency,
            tax_rate_default: parseFloat(form.tax_rate_default) || 21,
            receipt_prefix: form.receipt_prefix,
            receipt_next_number: parseInt(form.receipt_next_number) || 1,
        })
        setSaving(false)
        if (res.status === 1) {
            toast({ title: 'Configuracion guardada', variant: 'success' })
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    if (loading) return <div className="text-center py-12 text-gray-400">Cargando configuracion...</div>

    return (
        <div>
            <div className="flex items-center gap-3 mb-6">
                <Settings className="h-6 w-6 text-gray-400" />
                <h1 className="text-2xl font-bold">Configuracion</h1>
            </div>

            <div className="max-w-2xl space-y-6">
                <Card>
                    <CardHeader><CardTitle className="text-base">Datos del negocio</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label>Nombre del negocio</Label>
                            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                            <Label>CUIT</Label>
                            <Input value={form.tax_id} onChange={(e) => setForm(f => ({ ...f, tax_id: e.target.value }))} className="mt-1" placeholder="XX-XXXXXXXX-X" />
                        </div>
                        <div>
                            <Label>Direccion</Label>
                            <Input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                            <Label>Telefono</Label>
                            <Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="text-base">Facturacion</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Moneda</Label>
                                <Select value={form.currency} onValueChange={(v) => setForm(f => ({ ...f, currency: v }))}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ARS">ARS - Peso argentino</SelectItem>
                                        <SelectItem value="USD">USD - Dolar</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>IVA por defecto (%)</Label>
                                <Input type="number" min={0} step={0.01} value={form.tax_rate_default} onChange={(e) => setForm(f => ({ ...f, tax_rate_default: e.target.value }))} className="mt-1" />
                            </div>
                            <div>
                                <Label>Prefijo comprobante</Label>
                                <Input value={form.receipt_prefix} onChange={(e) => setForm(f => ({ ...f, receipt_prefix: e.target.value }))} className="mt-1" />
                            </div>
                            <div>
                                <Label>Proximo numero</Label>
                                <Input type="number" min={1} value={form.receipt_next_number} onChange={(e) => setForm(f => ({ ...f, receipt_next_number: e.target.value }))} className="mt-1" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Button onClick={handleSave} disabled={saving} size="lg">
                    {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    {saving ? 'Guardando...' : 'Guardar cambios'}
                </Button>
            </div>
        </div>
    )
}
