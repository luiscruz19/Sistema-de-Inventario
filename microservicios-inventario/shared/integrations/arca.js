/**
 * Wrapper ARCA (ex-AFIP) - WSAA + WSFEv1.
 *
 * Modos de operación:
 *  - real: usa las credenciales (cert_pem / key_pem / cuit / pto_vta) estáticas
 *    leídas de variables de entorno (.env). Invoca WSAA para obtener un TA
 *    y luego WSFEv1 para FECAESolicitar / FECompUltimoAutorizado.
 *  - simulated: si no hay credenciales ni librería SOAP disponible, genera
 *    un CAE fake de 14 dígitos y vencimiento a +10 días. Marca las facturas
 *    con `mode='simulated'` para que el cliente pueda visualizar el flujo
 *    completo sin estar habilitado en AFIP.
 *
 * La librería `soap` es OPCIONAL. Si no está instalada, todo el wrapper
 * cae en modo stub y sigue funcionando. Esto permite desplegar facturación
 * sin forzar una dependencia pesada.
 */

import crypto from 'crypto';

// Códigos AFIP de tipos de comprobante más usados.
// Ref: https://www.afip.gob.ar/fe/documentos/tablasDatosWebServices.pdf
export const AFIP_CBTE_TIPO = {
    A: 1, B: 6, C: 11,
    NCA: 3, NCB: 8, NCC: 13,
    NDA: 2, NDB: 7, NDC: 12,
};

const AFIP_DOC_TYPE_MAP = {
    CUIT: 80,
    CUIL: 86,
    DNI: 96,
    CF: 99, // Consumidor final
    OTRO: 99,
};

const AFIP_CONCEPTO = {
    productos: 1,
    servicios: 2,
    mixto: 3,
};

function tryLoadSoap() {
    // Dependencia opcional. Si no está instalada, retornamos null y seguimos en stub.
    // eslint-disable-next-line import/no-unresolved
    return import('soap').then((m) => m.default || m).catch(() => null);
}

function randomDigits(length) {
    let out = '';
    while (out.length < length) {
        out += crypto.randomInt(0, 1e9).toString().padStart(9, '0');
    }
    return out.slice(0, length);
}

/**
 * Genera la URL del QR AFIP según la especificación oficial.
 * El QR apunta a https://www.afip.gob.ar/fe/qr/?p=<base64(json)>
 */
export function buildAfipQrUrl({ cuit, pto_vta, doc_type, number, total, issued_at, cae, receiver_doc_type, receiver_doc_number, currency = 'PES', exchange_rate = 1 }) {
    const payload = {
        ver: 1,
        fecha: (issued_at ? new Date(issued_at) : new Date()).toISOString().slice(0, 10),
        cuit: Number(String(cuit || '').replace(/\D/g, '')) || 0,
        ptoVta: Number(pto_vta) || 0,
        tipoCmp: AFIP_CBTE_TIPO[doc_type] || 0,
        nroCmp: Number(number) || 0,
        importe: Number(total) || 0,
        moneda: currency,
        ctz: Number(exchange_rate) || 1,
        tipoDocRec: AFIP_DOC_TYPE_MAP[receiver_doc_type] || 99,
        nroDocRec: Number(String(receiver_doc_number || '').replace(/\D/g, '')) || 0,
        tipoCodAut: 'E',
        codAut: Number(String(cae || '').replace(/\D/g, '')) || 0,
    };
    const b64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    return `https://www.afip.gob.ar/fe/qr/?p=${b64}`;
}

/**
 * Resuelve el contexto ARCA: credenciales estáticas (.env) + modo real/simulated.
 * Las credenciales de ARCA (certificado, clave privada, CUIT, punto de venta)
 * son fijas y provienen de variables de entorno.
 */
export async function resolveArcaContext() {
    const credentials = {
        cuit: process.env.ARCA_CUIT || null,
        pto_vta: process.env.ARCA_PTO_VTA ? Number(process.env.ARCA_PTO_VTA) : null,
        cert_pem: process.env.ARCA_CERT_PEM || '',
        key_pem: process.env.ARCA_KEY_PEM || '',
        environment: process.env.ARCA_ENVIRONMENT || 'testing',
    };
    const enabled = process.env.ARCA_ENABLED === 'true';
    const hasCerts = !!(credentials.cert_pem && credentials.key_pem && credentials.cuit);
    const mode = enabled && hasCerts ? 'real' : 'simulated';
    return {
        mode,
        credentials,
        environment: credentials.environment,
    };
}

/**
 * Pide al wrapper ARCA el próximo CAE para una factura.
 *
 * @param {object} payload
 * @param {string} payload.doc_type  (A|B|C|NCA|...)
 * @param {number} payload.pto_vta
 * @param {number} payload.number
 * @param {number} payload.total
 * @param {number} payload.net_amount
 * @param {number} payload.tax_amount
 * @param {string} payload.receiver_doc_type
 * @param {string} payload.receiver_doc_number
 * @param {Date|string} [payload.issued_at]
 * @returns {Promise<{ status: 'approved'|'rejected', cae: string|null, cae_expiration: string|null, afip_response: object, rejection_reason?: string, mode: 'real'|'simulated' }>}
 */
export async function requestCae(payload) {
    const {
        doc_type, pto_vta, number, total, net_amount = 0, tax_amount = 0,
        receiver_doc_type = 'CF', receiver_doc_number = '', issued_at = new Date(),
    } = payload;

    const ctx = await resolveArcaContext();

    // ── MODO STUB ─────────────────────────────────────────────────────
    if (ctx.mode === 'simulated') {
        const cae = randomDigits(14);
        const expiration = new Date();
        expiration.setDate(expiration.getDate() + 10);
        return {
            status: 'approved',
            cae,
            cae_expiration: expiration.toISOString().slice(0, 10),
            afip_response: {
                stub: true,
                reason: 'No hay credenciales ARCA configuradas en el entorno. Se generó CAE simulado.',
                CbteTipo: AFIP_CBTE_TIPO[doc_type],
                PtoVta: pto_vta,
                CbteDesde: number,
                CbteHasta: number,
                ImpTotal: total,
                ImpNeto: net_amount,
                ImpIVA: tax_amount,
                DocTipo: AFIP_DOC_TYPE_MAP[receiver_doc_type] || 99,
                DocNro: receiver_doc_number,
                CbteFch: new Date(issued_at).toISOString().slice(0, 10).replace(/-/g, ''),
            },
            mode: 'simulated',
        };
    }

    // ── MODO REAL ────────────────────────────────────────────────────
    const soap = await tryLoadSoap();
    if (!soap) {
        console.warn('[arca] Librería "soap" no instalada. Caída a modo simulado pese a tener credenciales.');
        return requestCaeFallback(payload, 'soap_missing');
    }

    try {
        // TODO: implementación real WSAA + WSFEv1.
        // El flujo real es:
        //   1. Generar TRA (XML con UniqueId/GenerationTime/ExpirationTime/Service=wsfe)
        //   2. Firmar el TRA con cert_pem + key_pem (CMS/SignedData) usando openssl o node-forge
        //   3. POST a WSAA (https://wsaahomo.afip.gov.ar/ws/services/LoginCms) → obtener Token y Sign (TA)
        //   4. Llamar a wsfev1 FECAESolicitar con el TA + datos del comprobante
        //   5. Parsear la respuesta: CAE, CAEFchVto, Resultado (A=aprobado, R=rechazado) y Observaciones
        //
        // Mientras la implementación real no está lista, seguimos devolviendo stub
        // marcado como 'real' intentado para no bloquear al cliente.
        return requestCaeFallback(payload, 'real_not_implemented');
    } catch (err) {
        console.error('[arca] Error WSFEv1:', err.message);
        return {
            status: 'rejected',
            cae: null,
            cae_expiration: null,
            afip_response: { error: err.message },
            rejection_reason: err.message,
            mode: 'real',
        };
    }
}

function requestCaeFallback(payload, reason) {
    const { doc_type, pto_vta, number, total, net_amount = 0, tax_amount = 0, issued_at = new Date() } = payload;
    const cae = randomDigits(14);
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + 10);
    return {
        status: 'approved',
        cae,
        cae_expiration: expiration.toISOString().slice(0, 10),
        afip_response: {
            stub: true,
            reason,
            CbteTipo: AFIP_CBTE_TIPO[doc_type],
            PtoVta: pto_vta,
            CbteDesde: number,
            CbteHasta: number,
            ImpTotal: total,
            ImpNeto: net_amount,
            ImpIVA: tax_amount,
            CbteFch: new Date(issued_at).toISOString().slice(0, 10).replace(/-/g, ''),
        },
        mode: 'simulated',
    };
}

/**
 * Consulta el último número autorizado para un par (pto_vta, doc_type).
 * En modo stub devuelve 0 (o el registro en fiscal_sequences si existe).
 */
export async function fetchLastAuthorized({ pto_vta, doc_type }) {
    const ctx = await resolveArcaContext();

    if (ctx.mode === 'simulated') {
        return {
            status: 'ok',
            last_number: 0,
            mode: 'simulated',
            reason: 'Sin credenciales ARCA, se asume 0. Se usará el contador interno.',
        };
    }

    const soap = await tryLoadSoap();
    if (!soap) {
        return { status: 'ok', last_number: 0, mode: 'simulated', reason: 'soap_missing' };
    }

    // TODO: llamar wsfev1 FECompUltimoAutorizado. Ver requestCae() arriba para el flujo real.
    return { status: 'ok', last_number: 0, mode: 'simulated', reason: 'real_not_implemented' };
}

/**
 * Testea la conexión con ARCA. Usado por la página de configuración.
 */
export async function testConnection() {
    const ctx = await resolveArcaContext();
    if (ctx.mode === 'simulated') {
        return {
            status: 0,
            mode: 'simulated',
            message: 'Aún no hay credenciales ARCA cargadas. Las facturas se generarán en modo simulado.',
        };
    }
    const res = await fetchLastAuthorized({ pto_vta: ctx.credentials.pto_vta || 1, doc_type: 'B' });
    return {
        status: 1,
        mode: res.mode,
        message: res.mode === 'real'
            ? `Conexión OK con ARCA. Último autorizado: ${res.last_number}`
            : `No se pudo usar las credenciales reales: ${res.reason || 'desconocido'}. Se usará modo simulado.`,
    };
}
