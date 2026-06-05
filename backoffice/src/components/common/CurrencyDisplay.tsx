'use client'

import { formatCurrency } from '@/lib/utils'

interface CurrencyDisplayProps {
    amount: number
    currency?: string
    className?: string
    colored?: boolean
}

export function CurrencyDisplay({ amount, currency = 'ARS', className = '', colored = false }: CurrencyDisplayProps) {
    const colorClass = colored
        ? amount > 0 ? 'text-green-600' : amount < 0 ? 'text-red-600' : 'text-gray-900'
        : ''

    return <span className={`${colorClass} ${className}`}>{formatCurrency(amount, currency)}</span>
}
