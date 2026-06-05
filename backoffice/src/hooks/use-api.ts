'use client'

import { useState, useCallback, useRef } from 'react'
import axios from 'axios'
import { getRequestHeaders } from '@/utils/request-headers'
import type { ApiResponse } from '@/types'

const API_BASE = '/api'

function getHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('inventario_token') ?? undefined : undefined
    return getRequestHeaders(token)
}

export function useApi() {
    const [loading, setLoading] = useState(false)

    const get = useCallback(async <T = unknown>(path: string, params?: Record<string, string>): Promise<ApiResponse<T>> => {
        setLoading(true)
        try {
            const { data } = await axios.get<ApiResponse<T>>(`${API_BASE}${path}`, { headers: getHeaders(), params })
            return data
        } catch (e: unknown) {
            if (axios.isAxiosError(e)) return (e.response?.data as ApiResponse<T>) ?? { status: 0, message: 'Error de conexion' }
            return { status: 0, message: 'Error desconocido' }
        } finally {
            setLoading(false)
        }
    }, [])

    const post = useCallback(async <T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> => {
        setLoading(true)
        try {
            const { data } = await axios.post<ApiResponse<T>>(`${API_BASE}${path}`, body, { headers: getHeaders() })
            return data
        } catch (e: unknown) {
            if (axios.isAxiosError(e)) return (e.response?.data as ApiResponse<T>) ?? { status: 0, message: 'Error de conexion' }
            return { status: 0, message: 'Error desconocido' }
        } finally {
            setLoading(false)
        }
    }, [])

    const put = useCallback(async <T = unknown>(path: string, body?: unknown): Promise<ApiResponse<T>> => {
        setLoading(true)
        try {
            const { data } = await axios.put<ApiResponse<T>>(`${API_BASE}${path}`, body, { headers: getHeaders() })
            return data
        } catch (e: unknown) {
            if (axios.isAxiosError(e)) return (e.response?.data as ApiResponse<T>) ?? { status: 0, message: 'Error de conexion' }
            return { status: 0, message: 'Error desconocido' }
        } finally {
            setLoading(false)
        }
    }, [])

    const del = useCallback(async <T = unknown>(path: string): Promise<ApiResponse<T>> => {
        setLoading(true)
        try {
            const { data } = await axios.delete<ApiResponse<T>>(`${API_BASE}${path}`, { headers: getHeaders() })
            return data
        } catch (e: unknown) {
            if (axios.isAxiosError(e)) return (e.response?.data as ApiResponse<T>) ?? { status: 0, message: 'Error de conexion' }
            return { status: 0, message: 'Error desconocido' }
        } finally {
            setLoading(false)
        }
    }, [])

    // Ref con identidad estable para evitar que páginas que usan `api` como dep de useCallback
    // entren en loop infinito cuando el loading state interno cambia.
    const apiRef = useRef<{ get: typeof get; post: typeof post; put: typeof put; del: typeof del; loading: boolean } | null>(null)
    if (!apiRef.current) {
        apiRef.current = { get, post, put, del, loading }
    } else {
        apiRef.current.loading = loading
    }

    return apiRef.current
}
