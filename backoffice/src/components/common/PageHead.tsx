import * as React from 'react'

interface PageHeadProps {
    title: string
    sub?: string
    children?: React.ReactNode
}

/** Encabezado de página: título + subtítulo y acciones a la derecha. */
export function PageHead({ title, sub, children }: PageHeadProps) {
    return (
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
                <h1 className="text-[22px] font-semibold tracking-[-0.02em]">{title}</h1>
                {sub && <p className="mt-0.5 text-[13px] text-muted-foreground">{sub}</p>}
            </div>
            {children && <div className="flex items-center gap-2">{children}</div>}
        </div>
    )
}
