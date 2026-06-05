'use client'

import { useState, useEffect, useCallback } from 'react'
import { useFiscalConfig } from '@/hooks/use-fiscal-config'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { FileText, CreditCard, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import type { IntegrationSummary } from '@/types'

// Badge de estado por integración
function IntegrationStatusBadge({ integration }: { integration: IntegrationSummary | null }) {
    if (!integration || !integration.enabled || !integration.has_credentials) {
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" /> Sin configurar</Badge>
    }
    if (integration.last_test_status === 'ok') {
        return (
            <Badge variant="success">
                <CheckCircle className="h-3 w-3 mr-1" />
                Configurado
                {integration.last_tested_at && (
                    <span className="ml-1 opacity-75">
                        · {new Date(integration.last_tested_at).toLocaleDateString('es-AR')}
                    </span>
                )}
            </Badge>
        )
    }
    if (integration.last_test_status === 'error') {
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> Error</Badge>
    }
    return <Badge variant="warning"><AlertTriangle className="h-3 w-3 mr-1" /> Configurado (sin probar)</Badge>
}

export default function IntegracionesPage() {
    const { state, loading, save, saveArca, testArca, saveIntegration, getIntegration } = useFiscalConfig()

    // Datos fiscales base
    const [cuit, setCuit] = useState('')
    const [businessName, setBusinessName] = useState('')
    const [ptoVta, setPtoVta] = useState('1')
    const [ivaCondition, setIvaCondition] = useState('monotributo')

    // ARCA
    const [arcaEnvironment, setArcaEnvironment] = useState<'testing' | 'production'>('testing')
    const [certPem, setCertPem] = useState('')
    const [keyPem, setKeyPem] = useState('')
    const [arcaEnabled, setArcaEnabled] = useState(false)

    // MercadoPago
    const [mpAccessToken, setMpAccessToken] = useState('')
    const [mpPublicKey, setMpPublicKey] = useState('')
    const [mpEnabled, setMpEnabled] = useState(false)
    const [showMpToken, setShowMpToken] = useState(false)

    // UI state
    const [testing, setTesting] = useState(false)
    const [saving, setSaving] = useState(false)
    const [savingMp, setSavingMp] = useState(false)

    const arcaIntegration = getIntegration('arca')
    const mpIntegration = getIntegration('mercadopago')

    const syncFromState = useCallback(() => {
        if (!state) return
        if (state.config) {
            setCuit(state.config.cuit || '')
            setBusinessName(state.config.business_name || '')
            setPtoVta(String(state.config.pto_vta || 1))
            setIvaCondition(state.config.iva_condition || 'monotributo')
            setArcaEnvironment(state.config.environment || 'testing')
        }
        if (state.arca) {
            setArcaEnabled(state.arca.enabled)
            if (state.arca.cuit) setCuit(state.arca.cuit)
            if (state.arca.pto_vta) setPtoVta(String(state.arca.pto_vta))
            setArcaEnvironment(state.arca.environment || 'testing')
        }
    }, [state])

    useEffect(() => { syncFromState() }, [syncFromState])

    // Inicializar toggle MP desde integraciones
    useEffect(() => {
        if (mpIntegration) setMpEnabled(mpIntegration.enabled)
    }, [mpIntegration])

    async function handleFileRead(file: File, setter: (v: string) => void) {
        const text = await file.text()
        setter(text)
    }

    async function handleSaveFiscal() {
        setSaving(true)
        const res = await save({
            cuit,
            business_name: businessName,
            pto_vta: Number(ptoVta),
            iva_condition: ivaCondition,
            environment: arcaEnvironment,
        })
        setSaving(false)
        if (res.status === 1) toast({ title: 'Configuración fiscal guardada', variant: 'success' })
        else toast({ title: 'Error', description: res.message, variant: 'destructive' })
    }

    async function handleSaveArca() {
        setSaving(true)
        const res = await saveArca({
            cuit,
            pto_vta: Number(ptoVta),
            cert_pem: certPem || undefined,
            key_pem: keyPem || undefined,
            environment: arcaEnvironment,
            enabled: arcaEnabled,
        })
        setSaving(false)
        if (res.status === 1) toast({ title: 'Credenciales ARCA guardadas', variant: 'success' })
        else toast({ title: 'Error', description: res.message, variant: 'destructive' })
    }

    async function handleTestArca() {
        setTesting(true)
        const res = await testArca()
        setTesting(false)
        if (res.status === 1) {
            toast({ title: 'Prueba completada', description: res.data?.message, variant: 'success' })
        } else {
            toast({ title: 'Prueba falló', description: res.message || res.data?.message, variant: 'destructive' })
        }
    }

    async function handleSaveMercadoPago() {
        if (!mpAccessToken && !mpPublicKey) {
            toast({ title: 'Completá al menos el Access Token', variant: 'destructive' })
            return
        }
        setSavingMp(true)
        const res = await saveIntegration('mercadopago', {
            credentials: { access_token: mpAccessToken, public_key: mpPublicKey },
            config: {},
            enabled: mpEnabled,
        })
        setSavingMp(false)
        if (res.status === 1) {
            toast({ title: 'Credenciales MercadoPago guardadas', variant: 'success' })
            setMpAccessToken('')
            setMpPublicKey('')
        } else {
            toast({ title: 'Error', description: res.message, variant: 'destructive' })
        }
    }

    return (
        <div>
            <h1 className="text-2xl font-bold mb-2">Integraciones</h1>
            <p className="text-sm text-gray-500 mb-6">
                Conectá tu negocio con proveedores externos (AFIP/ARCA, MercadoPago, etc.)
            </p>

            {/* Datos fiscales base */}
            <Card className="mb-6">
                <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary-600" />
                        Datos fiscales del negocio
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label>CUIT</Label>
                        <Input value={cuit} onChange={(e) => setCuit(e.target.value)} placeholder="20-12345678-9" />
                    </div>
                    <div>
                        <Label>Razón social</Label>
                        <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                    </div>
                    <div>
                        <Label>Punto de venta</Label>
                        <Input type="number" min={1} value={ptoVta} onChange={(e) => setPtoVta(e.target.value)} />
                    </div>
                    <div>
                        <Label>Condición IVA</Label>
                        <Select value={ivaCondition} onValueChange={setIvaCondition}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="monotributo">Monotributo</SelectItem>
                                <SelectItem value="responsable_inscripto">Responsable inscripto</SelectItem>
                                <SelectItem value="exento">Exento</SelectItem>
                                <SelectItem value="consumidor_final">Consumidor final</SelectItem>
                                <SelectItem value="no_categorizado">No categorizado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-2">
                        <Button onClick={handleSaveFiscal} disabled={saving || loading}>
                            Guardar datos fiscales
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* ARCA / AFIP */}
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary-600" />
                            AFIP / ARCA (Facturación electrónica)
                        </CardTitle>
                        <IntegrationStatusBadge integration={arcaIntegration} />
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-gray-500">
                        Subí tu certificado y clave privada exportados desde AFIP (archivos .pem). Mientras no estén
                        cargados, las facturas se emiten en modo simulado con CAE fake para que puedas probar todo el flujo.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>Ambiente</Label>
                            <Select value={arcaEnvironment} onValueChange={(v) => setArcaEnvironment(v as 'testing' | 'production')}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="testing">Homologación (testing)</SelectItem>
                                    <SelectItem value="production">Producción</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-end gap-3">
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={arcaEnabled} onChange={(e) => setArcaEnabled(e.target.checked)} />
                                Integración habilitada
                            </label>
                        </div>
                    </div>

                    <div>
                        <Label>Certificado (.pem)</Label>
                        <Input
                            type="file"
                            accept=".pem,.crt,.cer"
                            onChange={(e) => e.target.files?.[0] && handleFileRead(e.target.files[0], setCertPem)}
                        />
                        <Textarea
                            className="mt-2 font-mono text-[10px]"
                            rows={4}
                            placeholder="-----BEGIN CERTIFICATE----- ..."
                            value={certPem}
                            onChange={(e) => setCertPem(e.target.value)}
                        />
                    </div>

                    <div>
                        <Label>Clave privada (.key)</Label>
                        <Input
                            type="file"
                            accept=".pem,.key"
                            onChange={(e) => e.target.files?.[0] && handleFileRead(e.target.files[0], setKeyPem)}
                        />
                        <Textarea
                            className="mt-2 font-mono text-[10px]"
                            rows={4}
                            placeholder="-----BEGIN PRIVATE KEY----- ..."
                            value={keyPem}
                            onChange={(e) => setKeyPem(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={handleSaveArca} disabled={saving || loading}>Guardar credenciales</Button>
                        <Button variant="outline" onClick={handleTestArca} disabled={testing}>
                            {testing ? 'Verificando...' : 'Verificar CAE'}
                        </Button>
                    </div>

                    {arcaIntegration?.last_tested_at && (
                        <div className="text-xs text-gray-500">
                            Última prueba: {new Date(arcaIntegration.last_tested_at).toLocaleString('es-AR')}
                            {arcaIntegration.last_test_status === 'error' && arcaIntegration.last_test_error && (
                                <span className="ml-2 text-red-500">— {arcaIntegration.last_test_error}</span>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* MercadoPago */}
            <Card className="mb-6">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-blue-500" />
                            MercadoPago
                        </CardTitle>
                        <IntegrationStatusBadge integration={mpIntegration} />
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-gray-500">
                        Ingresá tus credenciales de MercadoPago para habilitar pagos con tarjeta, transferencia y QR
                        en el punto de venta. Las credenciales se guardan cifradas.
                    </p>

                    <div>
                        <Label>Access Token</Label>
                        <div className="flex gap-2">
                            <Input
                                type={showMpToken ? 'text' : 'password'}
                                value={mpAccessToken}
                                onChange={(e) => setMpAccessToken(e.target.value)}
                                placeholder={mpIntegration?.has_credentials ? '••••••••••••••• (guardado)' : 'APP_USR-...'}
                                className="font-mono text-sm"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                type="button"
                                onClick={() => setShowMpToken((v) => !v)}
                            >
                                {showMpToken ? 'Ocultar' : 'Ver'}
                            </Button>
                        </div>
                    </div>

                    <div>
                        <Label>Public Key</Label>
                        <Input
                            value={mpPublicKey}
                            onChange={(e) => setMpPublicKey(e.target.value)}
                            placeholder={mpIntegration?.has_credentials ? '••••••••••••••• (guardada)' : 'APP_USR-...'}
                            className="font-mono text-sm"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={mpEnabled} onChange={(e) => setMpEnabled(e.target.checked)} />
                            Integración habilitada
                        </label>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={handleSaveMercadoPago} disabled={savingMp || loading}>
                            {savingMp ? 'Guardando...' : 'Guardar credenciales'}
                        </Button>
                    </div>

                    {mpIntegration?.last_tested_at && (
                        <div className="text-xs text-gray-500">
                            Última prueba: {new Date(mpIntegration.last_tested_at).toLocaleString('es-AR')}
                            {mpIntegration.last_test_status === 'error' && mpIntegration.last_test_error && (
                                <span className="ml-2 text-red-500">— {mpIntegration.last_test_error}</span>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
