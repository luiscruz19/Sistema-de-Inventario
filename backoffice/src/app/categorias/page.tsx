'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApi } from '@/hooks/use-api'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common/EmptyState'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { PageHead } from '@/components/common/PageHead'
import { useScreenActions } from '@/components/command/screen-actions'
import { Plus, Pencil, Trash2, ChevronRight, FolderOpen, Folder, FolderTree } from 'lucide-react'
import type { Category } from '@/types'

export default function CategoriasPage() {
    const api = useApi()
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState<Category | null>(null)
    const [form, setForm] = useState({ name: '', parent_id: '', sort_order: '0', active: true })

    const fetchCategories = useCallback(async () => {
        setLoading(true)
        const res = await api.get<Category[]>('/categories')
        if (res.status === 1 && res.data) setCategories(Array.isArray(res.data) ? res.data : [])
        setLoading(false)
    }, [api])

    useEffect(() => { fetchCategories() }, [fetchCategories])

    const openCreate = (parentId?: number) => {
        setEditing(null)
        setForm({ name: '', parent_id: parentId ? String(parentId) : '', sort_order: '0', active: true })
        setShowModal(true)
    }

    const openEdit = (cat: Category) => {
        setEditing(cat)
        setForm({ name: cat.name, parent_id: cat.parent_id ? String(cat.parent_id) : '', sort_order: String(cat.sort_order), active: cat.active })
        setShowModal(true)
    }

    const handleSave = async () => {
        if (!form.name.trim()) { toast({ title: 'El nombre es obligatorio', variant: 'destructive' }); return }
        const body = { name: form.name, parent_id: form.parent_id ? Number(form.parent_id) : null, sort_order: parseInt(form.sort_order) || 0, active: form.active }
        const res = editing ? await api.put(`/categories/${editing.id}`, body) : await api.post('/categories', body)
        if (res.status === 1) {
            toast({ title: editing ? 'Categoria actualizada' : 'Categoria creada', variant: 'success' })
            setShowModal(false)
            fetchCategories()
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Eliminar categoria? Las subcategorias quedaran huerfanas.')) return
        const res = await api.del(`/categories/${id}`)
        if (res.status === 1) { toast({ title: 'Categoria eliminada', variant: 'success' }); fetchCategories() }
        else toast({ title: 'Error', description: res.message, variant: 'destructive' })
    }

    // Build tree
    const rootCategories = categories.filter(c => !c.parent_id)
    const getChildren = (parentId: number) => categories.filter(c => c.parent_id === parentId)

    const renderCategory = (cat: Category, depth: number) => {
        const children = getChildren(cat.id)
        return (
            <div key={cat.id}>
                <div className={`flex items-center gap-3 py-3 px-4 hover:bg-muted border-b border-border ${depth > 0 ? '' : ''}`} style={{ paddingLeft: `${16 + depth * 24}px` }}>
                    {children.length > 0 ? <FolderOpen className="h-4 w-4 text-primary shrink-0" /> : depth > 0 ? <ChevronRight className="h-4 w-4 text-muted-foreground/60 shrink-0" /> : <Folder className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <span className="flex-1 text-sm font-medium">{cat.name}</span>
                    <Badge variant={cat.active ? 'success' : 'secondary'} className="text-[10px]">{cat.active ? 'Activa' : 'Inactiva'}</Badge>
                    <span className="text-xs text-muted-foreground w-8 text-center">{cat.sort_order}</span>
                    <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCreate(cat.id)} title="Agregar subcategoria"><Plus className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)}><Pencil className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive/80" onClick={() => handleDelete(cat.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                </div>
                {children.sort((a, b) => a.sort_order - b.sort_order).map(child => renderCategory(child, depth + 1))}
            </div>
        )
    }

    const topLevelCategories = categories.filter(c => !c.parent_id || c.parent_id === editing?.id)

    useScreenActions({
        primary: { label: 'Nueva categoría', icon: Plus, run: () => openCreate() },
    }, [])

    return (
        <div>
            <PageHead title="Categorías" sub={`${categories.length} ${categories.length === 1 ? 'categoría' : 'categorías'}`}>
                <Button onClick={() => openCreate()}><Plus className="mr-2 h-[15px] w-[15px]" /> Nueva categoría</Button>
            </PageHead>

            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                <div className="flex items-center gap-3 py-2.5 px-4 bg-muted/50 border-b border-border text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <span className="flex-1 pl-6">Nombre</span>
                    <span className="w-16 text-center">Estado</span>
                    <span className="w-8 text-center">Orden</span>
                    <span className="w-24 text-center">Acciones</span>
                </div>
                {loading ? (
                    <div className="divide-y divide-border">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 py-3 px-4"><Skeleton className="h-4 flex-1 max-w-[200px]" /><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-8" /><Skeleton className="h-4 w-24" /></div>
                        ))}
                    </div>
                ) : rootCategories.length === 0 ? (
                    <EmptyState icon={FolderTree} title="No hay categorias creadas" description="Organiza tus productos creando tu primera categoria." action={<Button onClick={() => openCreate()}><Plus className="h-4 w-4 mr-2" /> Nueva categoria</Button>} />
                ) : (
                    rootCategories.sort((a, b) => a.sort_order - b.sort_order).map(cat => renderCategory(cat, 0))
                )}
            </div>

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Editar categoria' : 'Nueva categoria'}</DialogTitle>
                        <DialogDescription>Define nombre y posicion</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div><Label>Nombre *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="mt-1" autoFocus /></div>
                        <div>
                            <Label>Categoria padre</Label>
                            <Select value={form.parent_id || '__none__'} onValueChange={(v) => setForm(f => ({ ...f, parent_id: v === '__none__' ? '' : v }))}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Ninguna (raiz)" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">Ninguna (raiz)</SelectItem>
                                    {topLevelCategories.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div><Label>Orden</Label><Input type="number" value={form.sort_order} onChange={(e) => setForm(f => ({ ...f, sort_order: e.target.value }))} className="mt-1" /></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
                        <Button onClick={handleSave}>Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
