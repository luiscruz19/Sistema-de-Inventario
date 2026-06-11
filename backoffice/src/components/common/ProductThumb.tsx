import { Package } from 'lucide-react'

/** Miniatura de producto: imagen real si existe, si no un placeholder rayado. */
export function ProductThumb({ src, size = 36 }: { src?: string | null; size?: number }) {
    if (src) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img src={src} alt="" className="shrink-0 rounded-md border border-border object-cover" style={{ width: size, height: size }} />
    }
    return (
        <div
            className="flex shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground"
            style={{
                width: size,
                height: size,
                background: 'repeating-linear-gradient(45deg,hsl(var(--muted)),hsl(var(--muted)) 6px,hsl(var(--accent)) 6px,hsl(var(--accent)) 12px)',
            }}
        >
            <Package style={{ width: Math.round(size * 0.46), height: Math.round(size * 0.46) }} />
        </div>
    )
}
