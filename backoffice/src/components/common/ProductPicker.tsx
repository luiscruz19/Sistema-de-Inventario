'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useApi } from '@/hooks/use-api'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import type { Product } from '@/types'

interface ProductPickerProps {
    /** Producto seleccionado (para mostrar su nombre cuando el modal reabre). */
    selected?: Product | null
    onChange: (product: Product | null) => void
    placeholder?: string
}

/**
 * Selector de producto con búsqueda en el BACKEND (debounced, limit 20).
 * No carga catálogos completos ni filtra en el front: cada tecleo pega a
 * GET /products?search=...&active=true&limit=20.
 */
export function ProductPicker({ selected, onChange, placeholder = 'Buscar producto por nombre o SKU...' }: ProductPickerProps) {
    const api = useApi()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<Product[]>([])
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [picked, setPicked] = useState<Product | null>(selected ?? null)
    const boxRef = useRef<HTMLDivElement>(null)

    useEffect(() => { setPicked(selected ?? null) }, [selected])

    const search = useCallback(async (q: string) => {
        setLoading(true)
        const res = await api.get<Product[]>('/products', { active: 'true', limit: '20', ...(q ? { search: q } : {}) })
        setResults(res.status === 1 && Array.isArray(res.data) ? res.data : [])
        setLoading(false)
    }, [api])

    useEffect(() => {
        if (!open) return
        const t = setTimeout(() => search(query), 250)
        return () => clearTimeout(t)
    }, [query, open, search])

    useEffect(() => {
        const onDoc = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false) }
        document.addEventListener('mousedown', onDoc)
        return () => document.removeEventListener('mousedown', onDoc)
    }, [])

    const pick = (p: Product) => { setPicked(p); onChange(p); setOpen(false); setQuery('') }

    return (
        <div className="relative" ref={boxRef}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-muted-foreground" />
                <Input
                    className="pl-9"
                    placeholder={placeholder}
                    value={open ? query : (picked?.name ?? '')}
                    onFocus={() => { setOpen(true); if (!results.length) search('') }}
                    onChange={e => { setQuery(e.target.value); setOpen(true) }}
                />
            </div>
            {open && (
                <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-border bg-popover py-1 shadow-lg">
                    {loading ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Buscando…</div>
                    ) : results.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">Sin resultados</div>
                    ) : (
                        results.map(p => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => pick(p)}
                                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                            >
                                <span className="truncate">{p.name}</span>
                                {p.sku && <span className="shrink-0 font-mono text-xs text-muted-foreground">{p.sku}</span>}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    )
}
