'use client'

import { useState, useCallback, useEffect } from 'react'
import { useApi } from './use-api'
import type { FiscalConfigState, IntegrationSummary } from '@/types'

export function useFiscalConfig() {
    const api = useApi()
    const [state, setState] = useState<FiscalConfigState | null>(null)
    const [integrations, setIntegrations] = useState<IntegrationSummary[]>([])
    const [loading, setLoading] = useState(false)

    const fetch = useCallback(async () => {
        setLoading(true)
        const [configRes, intRes] = await Promise.all([
            api.get<FiscalConfigState>('/fiscal-config'),
            api.get<IntegrationSummary[]>('/fiscal-config/integrations'),
        ])
        if (configRes.status === 1 && configRes.data) setState(configRes.data)
        if (intRes.status === 1 && intRes.data) setIntegrations(intRes.data)
        setLoading(false)
        return configRes
    }, [api])

    useEffect(() => {
        fetch()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const save = useCallback(async (payload: Record<string, unknown>) => {
        const res = await api.put('/fiscal-config', payload)
        if (res.status === 1) await fetch()
        return res
    }, [api, fetch])

    const saveArca = useCallback(async (payload: Record<string, unknown>) => {
        const res = await api.put('/fiscal-config/arca', payload)
        if (res.status === 1) await fetch()
        return res
    }, [api, fetch])

    const testArca = useCallback(async () => {
        const res = await api.post<{ mode: string; message: string }>('/fiscal-config/arca/test')
        if (res.status === 1) await fetch()
        return res
    }, [api, fetch])

    const saveIntegration = useCallback(async (provider: string, payload: Record<string, unknown>) => {
        const res = await api.put(`/fiscal-config/integrations/${provider}`, payload)
        if (res.status === 1) await fetch()
        return res
    }, [api, fetch])

    const deleteIntegration = useCallback(async (provider: string) => {
        const res = await api.del(`/fiscal-config/integrations/${provider}`)
        if (res.status === 1) await fetch()
        return res
    }, [api, fetch])

    const getIntegration = useCallback((provider: string) => {
        return integrations.find((i) => i.provider === provider) ?? null
    }, [integrations])

    return {
        state,
        integrations,
        loading,
        fetch,
        save,
        saveArca,
        testArca,
        saveIntegration,
        deleteIntegration,
        getIntegration,
    }
}
