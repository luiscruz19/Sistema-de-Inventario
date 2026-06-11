'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/use-api'
import { toast } from '@/hooks/use-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { PageHead } from '@/components/common/PageHead'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Building2, MapPin, Phone, Star } from 'lucide-react'
import type { Branch } from '@/types'

type BranchForm = { name: string; address: string; phone: string; is_main: boolean; active: boolean }
const emptyForm: BranchForm = { name: '', address: '', phone: '', is_main: false, active: true }

export default function SucursalesPage() {
    const api = useApi()
    const [branches, setBranches] = useState<Branch[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<Branch | null>(null)
    const [form, setForm] = useState<BranchForm>(emptyForm)

    const fetchBranches = useCallback(async () => {
        setLoading(true)
        const res = await api.get<Branch[]>('/branches')
        if (res.status === 1 && res.data) setBranches(Array.isArray(res.data) ? res.data : [])
        setLoading(false)
    }, [api])

    useEffect(() => { fetchBranches() }, [fetchBranches])

    const openCreate = () => { setEditing(null); setForm(emptyForm); setShowModal(true) }
    const openEdit = (b: Branch) => {
        setEditing(b)
        setForm({ name: b.name, address: b.address || '', phone: b.phone || '', is_main: b.is_main, active: b.active })
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!form.name.trim()) { toast({ title: 'El nombre es obligatorio', variant: 'destructive' }); return }
        const res = editing ? await api.put(`/branches/${editing.id}`, form) : await api.post('/branches', form)
        if (res.status === 1) {
            toast({ title: editing ? 'Sucursal actualizada' : 'Sucursal creada', variant: 'success' })
            setShowModal(false); fetchBranches()
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Eliminar sucursal?')) return
        const res = await api.del(`/branches/${id}`)
        if (res.status === 1) { toast({ title: 'Sucursal eliminada', variant: 'success' }); fetchBranches() }
        else toast({ title: 'Error', description: res.message, variant: 'destructive' })
    }

    return (
        <div>
            <PageHead title="Sucursales" sub="Puntos de venta y depósitos del negocio">
                <Button onClick={openCreate}><Plus className="mr-2 h-[15px] w-[15px]" /> Nueva sucursal</Button>
            </PageHead>

            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <Card key={i}><CardContent className="p-5 space-y-3"><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-24" /><Skeleton className="h-8 w-full" /></CardContent></Card>
                    ))}
                </div>
            ) : branches.length === 0 ? (
                <Card><CardContent className="p-0"><EmptyState icon={Building2} title="No hay sucursales creadas" description="Crea tu primera sucursal para empezar a operar." action={<Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Nueva sucursal</Button>} /></CardContent></Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {branches.map(branch => (
                        <Card key={branch.id} className={!branch.active ? 'opacity-60' : ''}>
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-[18px] w-[18px] text-muted-foreground" />
                                        <h3 className="font-semibold">{branch.name}</h3>
                                    </div>
                                    <div className="flex gap-1">
                                        {branch.is_main && <Badge variant="default" className="text-[10px]"><Star className="h-3 w-3 mr-0.5" />Principal</Badge>}
                                        <Badge variant={branch.active ? 'success' : 'secondary'} className="text-[10px]">{branch.active ? 'Activa' : 'Inactiva'}</Badge>
                                    </div>
                                </div>
                                <div className="space-y-1.5 text-sm text-muted-foreground mb-4">
                                    {branch.address && <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /><span>{branch.address}</span></div>}
                                    {branch.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /><span>{branch.phone}</span></div>}
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(branch)}>
                                        <Pencil className="h-3 w-3 mr-1" /> Editar
                                    </Button>
                                    {!branch.is_main && (
                                        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive/80" onClick={() => handleDelete(branch.id)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader><DialogTitle>{editing ? 'Editar sucursal' : 'Nueva sucursal'}</DialogTitle><DialogDescription>Datos de la sucursal</DialogDescription></DialogHeader>
                    <div className="space-y-4">
                        <div><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" autoFocus /></div>
                        <div><Label>Direccion</Label><Input value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} className="mt-1" /></div>
                        <div><Label>Telefono</Label><Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" /></div>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.is_main} onCheckedChange={(v) => setForm(f => ({ ...f, is_main: !!v }))} /> Sucursal principal</label>
                            <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.active} onCheckedChange={(v) => setForm(f => ({ ...f, active: !!v }))} /> Activa</label>
                        </div>
                    </div>
                    <DialogFooter><Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button><Button onClick={handleSave}>Guardar</Button></DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
