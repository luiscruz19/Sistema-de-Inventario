'use client'

import { useCallback } from 'react'
import { useApi } from './use-api'
import type { SalesVsPrevMonth, ReceivablesAging, AvailableCash, StockAlertsKpi } from '@/types'

export function useKpis() {
    const api = useApi()

    const salesVsPrevMonth = useCallback(() => api.get<SalesVsPrevMonth>('/kpis/sales-vs-prev-month'), [api])
    const receivablesAging = useCallback(() => api.get<ReceivablesAging>('/kpis/receivables-aging'), [api])
    const topCustomers = useCallback((limit = 10) => api.get<unknown[]>('/kpis/top-customers', { limit: String(limit) }), [api])
    const topProducts = useCallback((limit = 10) => api.get<unknown[]>('/kpis/top-products', { limit: String(limit) }), [api])
    const availableCash = useCallback(() => api.get<AvailableCash>('/kpis/available-cash'), [api])
    const stockAlerts = useCallback(() => api.get<StockAlertsKpi>('/kpis/stock-alerts'), [api])
    const invoicesSummary = useCallback(() => api.get<Array<{ status: string; doc_type: string; count: number; total: number }>>('/kpis/invoices-summary'), [api])

    return {
        salesVsPrevMonth,
        receivablesAging,
        topCustomers,
        topProducts,
        availableCash,
        stockAlerts,
        invoicesSummary,
    }
}
