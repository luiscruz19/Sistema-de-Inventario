'use client'

import { Keyboard, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Kbd } from './kbd'

export type ShortcutRow = [label: string, keys: string[]]

export function ShortcutsHelp({ rows, onClose }: { rows: ShortcutRow[]; onClose: () => void }) {
    const half = Math.ceil(rows.length / 2)
    const cols = [rows.slice(0, half), rows.slice(half)]
    return (
        <div
            className="fixed inset-0 z-[90] flex items-start justify-center pt-[11vh]"
            style={{ background: 'hsl(224 32% 4% / 0.34)' }}
            onMouseDown={onClose}
        >
            <div
                className="w-[560px] max-w-[92vw] overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg"
                onMouseDown={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-border px-[18px] py-[15px]">
                    <span className="flex items-center gap-[9px] text-sm font-semibold">
                        <Keyboard className="h-[17px] w-[17px]" /> Atajos de teclado
                    </span>
                    <Button size="icon" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
                </div>
                <div className="grid grid-cols-2 gap-x-[30px] px-[18px] pb-[18px] pt-2.5">
                    {cols.map((col, c) => (
                        <div key={c}>
                            {col.map(([label, keys], i) => (
                                <div key={i} className="flex items-center justify-between gap-3.5 border-b border-border py-2">
                                    <span className="text-[13px]">{label}</span>
                                    <span className="flex shrink-0 gap-1">{keys.map((k, j) => <Kbd key={j}>{k}</Kbd>)}</span>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
