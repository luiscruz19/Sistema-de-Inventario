'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Search } from 'lucide-react'
import { Kbd } from './kbd'

export interface PaletteItem {
    id: string
    label: string
    desc?: string
    icon: LucideIcon
    kbd?: string
    keywords?: string
    run: () => void
}
export interface PaletteGroup {
    group: string
    items: PaletteItem[]
}

const MOD = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘' : 'Ctrl'

export function CommandPalette({ groups, onClose }: { groups: PaletteGroup[]; onClose: () => void }) {
    const [q, setQ] = useState('')
    const [sel, setSel] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const t = setTimeout(() => inputRef.current?.focus(), 20)
        return () => clearTimeout(t)
    }, [])

    const filtered = useMemo(() => {
        const ql = q.trim().toLowerCase()
        const out: PaletteGroup[] = []
        groups.forEach(g => {
            const items = g.items.filter(it => !ql || (it.label + ' ' + (it.keywords || '') + ' ' + (it.desc || '')).toLowerCase().includes(ql))
            if (items.length) out.push({ group: g.group, items })
        })
        return out
    }, [q, groups])

    const order = useMemo(() => filtered.flatMap(g => g.items), [filtered])

    useEffect(() => { setSel(0) }, [q])
    useEffect(() => {
        const el = listRef.current?.querySelector('[aria-selected="true"]')
        el?.scrollIntoView({ block: 'nearest' })
    }, [sel])

    const run = (it?: PaletteItem) => { if (it) { onClose(); it.run() } }

    const onKey = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(order.length - 1, s + 1)) }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)) }
        else if (e.key === 'Enter') { e.preventDefault(); run(order[sel]) }
        else if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }

    let idx = -1
    return (
        <div
            className="fixed inset-0 z-[90] flex items-start justify-center pt-[11vh]"
            style={{ background: 'hsl(224 32% 4% / 0.34)' }}
            onMouseDown={onClose}
        >
            <div
                className="w-[580px] max-w-[92vw] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg"
                onMouseDown={e => e.stopPropagation()}
            >
                <div className="flex items-center gap-[11px] border-b border-border px-[17px] py-3.5">
                    <Search className="h-[18px] w-[18px] text-muted-foreground" />
                    <input
                        ref={inputRef}
                        className="flex-1 border-0 bg-transparent p-0 text-[15px] outline-none placeholder:text-muted-foreground"
                        placeholder="Buscar pantalla o acción…"
                        value={q}
                        onChange={e => setQ(e.target.value)}
                        onKeyDown={onKey}
                    />
                    <Kbd>esc</Kbd>
                </div>

                <div ref={listRef} className="max-h-[344px] overflow-auto p-1.5">
                    {order.length === 0 ? (
                        <div className="p-[30px] text-center text-[13px] text-muted-foreground">Sin resultados para “{q}”.</div>
                    ) : filtered.map(g => (
                        <div key={g.group}>
                            <div className="px-2.5 pb-[5px] pt-[11px] text-[10.5px] font-semibold uppercase tracking-[0.07em] text-muted-foreground">{g.group}</div>
                            {g.items.map(it => {
                                idx++
                                const i = idx
                                const Icon = it.icon
                                const selected = i === sel
                                return (
                                    <div
                                        key={it.id}
                                        aria-selected={selected}
                                        onMouseMove={() => setSel(i)}
                                        onClick={() => run(it)}
                                        className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-[9px] ${selected ? 'bg-accent' : ''}`}
                                    >
                                        <span className={`flex h-[29px] w-[29px] shrink-0 items-center justify-center rounded-[7px] bg-muted ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <span className="min-w-0 flex-1 text-[13.5px]">
                                            {it.label}
                                            {it.desc && <small className="mt-px block text-[11.5px] text-muted-foreground">{it.desc}</small>}
                                        </span>
                                        {it.kbd && <Kbd>{it.kbd}</Kbd>}
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                </div>

                <div className="flex items-center gap-4 border-t border-border px-[15px] py-[9px] text-[11.5px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> Navegar</span>
                    <span className="inline-flex items-center gap-1.5"><Kbd>↵</Kbd> Abrir</span>
                    <span className="inline-flex items-center gap-1.5"><Kbd>{MOD}</Kbd><Kbd>K</Kbd> Cerrar</span>
                </div>
            </div>
        </div>
    )
}
