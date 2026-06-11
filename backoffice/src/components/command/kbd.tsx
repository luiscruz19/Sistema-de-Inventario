import * as React from 'react'
import { cn } from '@/lib/utils'

/** Chip de tecla, ej. <Kbd>⌘</Kbd><Kbd>K</Kbd>. */
export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <kbd
            className={cn(
                'inline-flex h-[19px] min-w-[19px] items-center justify-center rounded-[5px] border border-border bg-muted px-[5px] font-mono text-[11px] font-medium leading-none text-muted-foreground',
                className
            )}
        >
            {children}
        </kbd>
    )
}
