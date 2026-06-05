'use client'

import { useState, useCallback } from 'react'
import { useApi } from './use-api'
import type { Invoice, ApiResponse, Pagination } from '@/types'

export function useInvoices() {
    const api = useApi()
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [pagination, setPagination] = useState<Pagination>({ totalItems: 0, totalPages: 0, currentPage: 1, perPage: 20 })
    const [loading, setLoading] = useState(false)

    const fetchList = useCallback(async (params: Record<string, string> = {}) => {
        setLoading(true)
        const res = await api.get<Invoice[]>('/invoices', params)
        if (res.status === 1 && res.data) {
            setInvoices(Array.isArray(res.data) ? res.data : [])
            if (res.pagination) setPagination(res.pagination)
        }
        setLoading(false)
        return res
    }, [api])

    const getById = useCallback(async (id: number) => {
        return api.get<Invoice>(`/invoices/${id}`)
    }, [api])

    const create = useCallback(async (payload: Record<string, unknown>): Promise<ApiResponse<Invoice>> => {
        return api.post<Invoice>('/invoices', payload)
    }, [api])

    const voidInvoice = useCallback(async (id: number) => {
        return api.post<Invoice>(`/invoices/${id}/void`)
    }, [api])

    const createCreditNote = useCallback(async (id: number, payload: Record<string, unknown> = {}) => {
        return api.post<Invoice>(`/invoices/${id}/credit-note`, payload)
    }, [api])

    const retry = useCallback(async (id: number) => {
        return api.post<Invoice>(`/invoices/${id}/retry`)
    }, [api])

    return {
        invoices,
        pagination,
        loading,
        fetchList,
        getById,
        create,
        voidInvoice,
        createCreditNote,
        retry,
    }
}
