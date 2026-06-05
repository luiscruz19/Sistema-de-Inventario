'use client'

import { Badge } from '@/components/ui/badge'

interface StockBadgeProps {
    quantity: number
    minAlert: number
    reserved?: number
}

export function StockBadge({ quantity, minAlert, reserved = 0 }: StockBadgeProps) {
    const available = quantity - reserved

    if (available <= 0) {
        return <Badge variant="destructive">Sin stock</Badge>
    }
    if (available <= minAlert) {
        return <Badge variant="warning">Stock bajo ({available})</Badge>
    }
    return <Badge variant="success">{available} disp.</Badge>
}
