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
import { formatDateTime } from '@/lib/utils'
import { Plus, Pencil, Trash2, RefreshCw, Link2 } from 'lucide-react'
import type { Pagination } from '@/types'

type MarketplacePlatform = 'mercadolibre' | 'tiendanube' | 'shopify' | 'woocommerce'

type MarketplaceConnection = {
    id: number
    marketplace: MarketplacePlatform
    nombre: string
    shop_url: string
    activa: boolean
    ultimo_sync_at?: string
    createdAt: string
}

type ConnectionForm = {
    marketplace: MarketplacePlatform
    nombre: string
    shop_url: string
    activa: boolean
}

const emptyForm: ConnectionForm = {
    marketplace: 'mercadolibre',
    nombre: '',
    shop_url: '',
    activa: true,
}

const platformMap: Record<MarketplacePlatform, { label: string; color: string }> = {
    mercadolibre: { label: 'MercadoLibre', color: 'bg-warning/10 text-warning' },
    tiendanube: { label: 'Tiendanube', color: 'bg-primary/10 text-primary' },
    shopify: { label: 'Shopify', color: 'bg-success/10 text-success' },
    woocommerce: { label: 'WooCommerce', color: 'bg-primary/10 text-primary' },
}

export default function MarketplaceConexionesPage() {
    const api = useApi()
    const [connections, setConnections] = useState<MarketplaceConnection[]>([])
    const [pagination, setPagination] = useState<Pagination>({ totalItems: 0, totalPages: 0, currentPage: 1, perPage: 20 })
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<MarketplaceConnection | null>(null)
    const [form, setForm] = useState<ConnectionForm>(emptyForm)
    const [saving, setSaving] = useState(false)
    const [syncingId, setSyncingId] = useState<number | null>(null)

    const fetchConnections = useCallback(async (page = 1) => {
        setLoading(true)
        const res = await api.get<MarketplaceConnection[]>('/marketplace/connections', { page: String(page), limit: '20' })
        if (res.status === 1 && res.data) {
            setConnections(Array.isArray(res.data) ? res.data : [])
            if (res.pagination) setPagination(res.pagination)
        }
        setLoading(false)
    }, [api])

    useEffect(() => { fetchConnections() }, [fetchConnections])

    const openCreate = () => {
        setEditing(null)
        setForm(emptyForm)
        setShowModal(true)
    }

    const openEdit = (conn: MarketplaceConnection) => {
        setEditing(conn)
        setForm({
            marketplace: conn.marketplace,
            nombre: conn.nombre,
            shop_url: conn.shop_url || '',
            activa: conn.activa,
        })
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!form.nombre.trim()) {
            toast({ title: 'El nombre es obligatorio', variant: 'destructive' })
            return
        }
        setSaving(true)
        const res = editing
            ? await api.put(`/marketplace/connections/${editing.id}`, form)
            : await api.post('/marketplace/connections', form)
        if (res.status === 1) {
            toast({ title: editing ? 'Conexion actualizada' : 'Conexion creada', variant: 'success' })
            setShowModal(false)
            fetchConnections(pagination.currentPage)
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
        setSaving(false)
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Eliminar esta conexion?')) return
        const res = await api.del(`/marketplace/connections/${id}`)
        if (res.status === 1) {
            toast({ title: 'Conexion eliminada', variant: 'success' })
            fetchConnections(pagination.currentPage)
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    const handleSync = async (id: number) => {
        setSyncingId(id)
        const res = await api.patch(`/marketplace/connections/${id}/sync`, {})
        if (res.status === 1) {
            toast({ title: 'Sincronizacion iniciada', variant: 'success' })
            fetchConnections(pagination.currentPage)
        } else {
            toast({ title: 'Error al sincronizar', description: res.message, variant: 'destructive' })
        }
        setSyncingId(null)
    }

    const columns: Column<MarketplaceConnection>[] = [
        {
            key: 'marketplace',
            label: 'Marketplace',
            render: (v) => {
                const p = platformMap[v as MarketplacePlatform]
                if (!p) return <span className="text-xs text-muted-foreground">{String(v ?? '-')}</span>
                return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.color}`}>{p.label}</span>
            },
        },
        {
            key: 'nombre',
            label: 'Nombre',
            render: (v) => <span className="font-medium">{v as string}</span>,
        },
        {
            key: 'shop_url',
            label: 'Shop URL',
            render: (v) => v ? (
                <a href={v as string} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline">
                    {v as string}
                </a>
            ) : <span className="text-muted-foreground text-sm">-</span>,
        },
        {
            key: 'ultimo_sync_at',
            label: 'Ultimo sync',
            render: (v) => v ? <span className="text-sm">{formatDateTime(v as string)}</span> : <span className="text-muted-foreground text-sm">Nunca</span>,
        },
        {
            key: 'activa',
            label: 'Estado',
            render: (v) => <Badge variant={v ? 'success' : 'secondary'}>{v ? 'Activa' : 'Inactiva'}</Badge>,
        },
    ]

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                        <Link2 className="h-6 w-6" /> Conexiones de marketplace
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">Integraciones con canales de venta externos</p>
                </div>
                <Button onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-2" /> Nueva conexion
                </Button>
            </div>

            <DataTable
                data={connections}
                columns={columns}
                pagination={pagination}
                onPageChange={(p) => fetchConnections(p)}
                isLoading={loading}
                emptyMessage="No hay conexiones configuradas"
                actions={(row) => (
                    <div className="flex gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title="Sincronizar"
                            onClick={() => handleSync(row.id)}
                            disabled={syncingId === row.id}
                        >
                            <RefreshCw className={`h-4 w-4 ${syncingId === row.id ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive/80" onClick={() => handleDelete(row.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            />

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Editar conexion' : 'Nueva conexion'}</DialogTitle>
                        <DialogDescription>Datos de la integracion con el marketplace</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Marketplace *</Label>
                            <Select value={form.marketplace} onValueChange={(v) => setForm(f => ({ ...f, marketplace: v as MarketplacePlatform }))}>
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="mercadolibre">MercadoLibre</SelectItem>
                                    <SelectItem value="tiendanube">Tiendanube</SelectItem>
                                    <SelectItem value="shopify">Shopify</SelectItem>
                                    <SelectItem value="woocommerce">WooCommerce</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Nombre de la conexion *</Label>
                            <Input value={form.nombre} onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))} className="mt-1" autoFocus placeholder="Ej: Tienda principal ML" />
                        </div>
                        <div>
                            <Label>Shop URL</Label>
                            <Input value={form.shop_url} onChange={(e) => setForm(f => ({ ...f, shop_url: e.target.value }))} className="mt-1" placeholder="https://..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
