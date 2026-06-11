import * as React from 'react'
import { cn } from '@/lib/utils'

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Micro-label en mayusculas sobre el valor. */
    label: React.ReactNode
    /** La cifra principal (ya formateada). */
    value: React.ReactNode
    /** Icono monocromo (Lucide 16px), arriba a la derecha. Opcional. */
    icon?: React.ReactNode
    /** Linea secundaria, ej. "+12.4% vs mes anterior". */
    delta?: React.ReactNode
    /** Color de la linea delta. */
    deltaDirection?: 'up' | 'down' | 'muted'
}

/**
 * Tile de KPI sobrio: micro-label, numero grande tabular, icono monocromo
 * opcional y una linea delta discreta. Sin chips de color — el enfasis lo da
 * el numero, no la decoracion.
 */
export function StatCard({
    label,
    value,
    icon,
    delta,
    deltaDirection = 'muted',
    className,
    ...props
}: StatCardProps) {
    const showDot = deltaDirection !== 'muted'
    return (
        <div
            className={cn('rounded-xl border bg-card px-[18px] pb-4 pt-[18px] shadow-sm', className)}
            {...props}
        >
            <div className="mb-2.5 flex items-center justify-between gap-3">
                <p className="m-0 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
                    {label}
                </p>
                {icon ? (
                    <span className="inline-flex shrink-0 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
                        {icon}
                    </span>
                ) : null}
            </div>
            <p className="m-0 text-[28px] font-semibold leading-[1.05] tracking-[-0.02em] tabular-nums text-foreground">
                {value}
            </p>
            {delta != null ? (
                <p
                    className={cn(
                        'mt-2 inline-flex items-center gap-1.5 text-xs',
                        deltaDirection === 'up' && 'text-success',
                        deltaDirection === 'down' && 'text-destructive',
                        deltaDirection === 'muted' && 'text-muted-foreground'
                    )}
                >
                    {showDot ? (
                        <span className="h-[5px] w-[5px] shrink-0 rounded-full bg-current opacity-90" />
                    ) : null}
                    {delta}
                </p>
            ) : null}
        </div>
    )
}
