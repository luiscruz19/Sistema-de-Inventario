'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useApi } from '@/hooks/use-api'
import { toast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/utils'
import { ArrowLeft, Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import type { Customer } from '@/types'

interface Transaction {
    id: number
    type: 'credit' | 'debit'
    amount: number
    description: string
    reference_type: string
    balance_after: number
    createdAt: string
}

export default function CustomerDetailPage() {
    const { id } = useParams<{ id: string }>()
    const router = useRouter()
    const api = useApi()

    const [customer, setCustomer] = useState<Customer | null>(null)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({ type: 'credit', amount: '', description: '' })

    const fetchData = useCallback(async () => {
        setLoading(true)
        const [custRes, txRes] = await Promise.all([
            api.get<Customer>(`/customers/${id}`),
            api.get<{ data: Transaction[] }>(`/customers/${id}/transactions`),
        ])
        if (custRes.status === 1 && custRes.data) setCustomer(custRes.data as any)
        if (txRes.status === 1) {
            const raw = (txRes as any).extra?.data || (txRes as any).data || []
            setTransactions(Array.isArray(raw) ? raw : [])
        }
        setLoading(false)
    }, [api, id])

    useEffect(() => { fetchData() }, [fetchData])

    const handleSubmit = async () => {
        if (!form.amount || !form.description.trim()) {
            toast({ title: 'Completá todos los campos', variant: 'destructive' })
            return
        }
        setSaving(true)
        const res = await api.post(`/customers/${id}/transactions`, {
            type: form.type,
            amount: Number(form.amount),
            description: form.description.trim(),
        })
        if (res.status === 1) {
            toast({ title: 'Movimiento registrado' })
            setForm({ type: 'credit', amount: '', description: '' })
            setShowForm(false)
            fetchData()
        } else {
            toast({ title: 'Error', description: (res as any).message, variant: 'destructive' })
        }
        setSaving(false)
    }

    if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground">Cargando...</div>
    if (!customer) return <div className="text-center py-12 text-muted-foreground">Cliente no encontrado</div>

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-xl font-bold">{(customer as any).name}</h1>
                    <p className="text-sm text-muted-foreground">Cuenta corriente</p>
                </div>
            </div>

            {/* Resumen de saldo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Saldo actual</div>
                        <div className={`text-2xl font-bold ${Number((customer as any).balance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(Number((customer as any).balance))}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Límite de crédito</div>
                        <div className="text-2xl font-bold">{formatCurrency(Number((customer as any).credit_limit))}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4">
                        <div className="text-sm text-muted-foreground">Descuento</div>
                        <div className="text-2xl font-bold">{(customer as any).discount_percentage}%</div>
                    </CardContent>
                </Card>
            </div>

            {/* Nuevo movimiento */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Movimientos de cuenta
                    </CardTitle>
                    <Button size="sm" onClick={() => setShowForm(!showForm)}>
                        <Plus className="h-4 w-4 mr-1" />
                        Nuevo movimiento
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {showForm && (
                        <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs">Tipo</Label>
                                    <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                                        <SelectTrigger className="h-8 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="credit">Abono / Crédito</SelectItem>
                                            <SelectItem value="debit">Cargo / Débito</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs">Monto</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={form.amount}
                                        onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                                        className="h-8 text-sm"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs">Descripción</Label>
                                <Input
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    className="h-8 text-sm"
                                    placeholder="Motivo del movimiento..."
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
                                <Button size="sm" onClick={handleSubmit} disabled={saving}>
                                    {saving ? 'Guardando...' : 'Registrar'}
                                </Button>
                            </div>
                        </div>
                    )}

                    <Separator />

                    {transactions.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">Sin movimientos registrados</p>
                    ) : (
                        <div className="space-y-2">
                            {transactions.map(tx => (
                                <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded-full ${tx.type === 'credit' ? 'bg-green-100' : 'bg-red-100'}`}>
                                            {tx.type === 'credit'
                                                ? <TrendingUp className="h-4 w-4 text-green-600" />
                                                : <TrendingDown className="h-4 w-4 text-red-600" />
                                            }
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium">{tx.description}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(tx.createdAt).toLocaleDateString('es-AR')} —{' '}
                                                <Badge variant="outline" className="text-xs">{tx.reference_type}</Badge>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-semibold ${tx.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                                            {tx.type === 'credit' ? '+' : '-'}{formatCurrency(Number(tx.amount))}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Saldo: {formatCurrency(Number(tx.balance_after))}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
