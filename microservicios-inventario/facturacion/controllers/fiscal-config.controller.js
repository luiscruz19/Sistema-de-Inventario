import FiscalConfig from '../models/FiscalConfig.js';
import { errorMessage, successMessage } from '../utils/messages.js';
import { testConnection } from '../integrations/arca.js';

/**
 * Lee las credenciales ARCA desde variables de entorno.
 * Los certificados/clave viven en el .env del servicio.
 */
function getArcaEnvCredentials() {
    return {
        cuit: process.env.ARCA_CUIT || null,
        pto_vta: process.env.ARCA_PTO_VTA ? Number(process.env.ARCA_PTO_VTA) : null,
        cert_pem: process.env.ARCA_CERT_PEM || '',
        key_pem: process.env.ARCA_KEY_PEM || '',
        environment: process.env.ARCA_ENVIRONMENT || 'testing',
        enabled: process.env.ARCA_ENABLED ? process.env.ARCA_ENABLED === 'true' : false,
    };
}

/**
 * GET /fiscal-config — devuelve la configuración fiscal + estado de la
 * integración ARCA. Las credenciales ARCA provienen del .env (enmascaradas).
 */
export async function get(req, res) {
    try {
        const config = await FiscalConfig.findOne();
        const arca = getArcaEnvCredentials();

        return res.status(200).json(successMessage({
            message: 'Configuración fiscal obtenida',
            extra: {
                data: {
                    config,
                    arca: {
                        enabled: arca.enabled,
                        has_certificate: !!(arca.cert_pem && arca.key_pem),
                        environment: arca.environment,
                        cuit: arca.cuit,
                        pto_vta: arca.pto_vta,
                    },
                },
            },
        }));
    } catch (err) {
        console.error('Error get fiscal config:', err);
        return res.status(500).json(errorMessage({ message: 'Error al obtener la configuración fiscal' }));
    }
}

/**
 * PUT /fiscal-config — crea/actualiza los datos fiscales base.
 * (Datos NO sensibles: razón social, punto de venta, condición IVA, etc.)
 */
export async function upsert(req, res) {
    try {
        const {
            cuit, business_name, pto_vta, iva_condition,
            gross_income, activity_start, fiscal_address, environment,
            next_numbers,
        } = req.body;

        const [config] = await FiscalConfig.findOrCreate({
            where: {},
            defaults: { pto_vta: pto_vta || 1 },
        });

        await config.update({
            cuit: cuit ?? config.cuit,
            business_name: business_name ?? config.business_name,
            pto_vta: pto_vta ?? config.pto_vta,
            iva_condition: iva_condition ?? config.iva_condition,
            gross_income: gross_income ?? config.gross_income,
            activity_start: activity_start ?? config.activity_start,
            fiscal_address: fiscal_address ?? config.fiscal_address,
            environment: environment ?? config.environment,
            next_numbers: next_numbers != null ? JSON.stringify(next_numbers) : config.next_numbers,
        });

        return res.status(200).json(successMessage({
            message: 'Configuración fiscal guardada',
            extra: { data: config },
        }));
    } catch (err) {
        console.error('Error upsert fiscal config:', err);
        return res.status(500).json(errorMessage({ message: 'Error al guardar la configuración fiscal' }));
    }
}

/**
 * PUT /fiscal-config/arca — las credenciales sensibles de ARCA (certificado/
 * clave/CUIT) se configuran en variables de entorno, no en base de datos.
 * Este endpoint sincroniza los datos NO sensibles (cuit, pto_vta, environment)
 * hacia FiscalConfig y reporta el estado del certificado del .env.
 * Body: { cuit, pto_vta, environment }
 */
export async function upsertArcaCredentials(req, res) {
    try {
        const { cuit, pto_vta, environment = 'testing' } = req.body;

        if (!cuit || !pto_vta) {
            return res.status(400).json(errorMessage({ message: 'CUIT y punto de venta son obligatorios' }));
        }

        const arca = getArcaEnvCredentials();

        // Sincronizar FiscalConfig para tener pto_vta y environment en el modelo principal.
        const [fc] = await FiscalConfig.findOrCreate({
            where: {},
            defaults: { pto_vta },
        });
        await fc.update({ cuit, pto_vta, environment });

        return res.status(200).json(successMessage({
            message: 'Datos ARCA guardados. El certificado y la clave se leen del entorno (.env).',
            extra: {
                data: {
                    enabled: arca.enabled,
                    has_certificate: !!(arca.cert_pem && arca.key_pem),
                    environment,
                },
            },
        }));
    } catch (err) {
        console.error('Error upsert ARCA credentials:', err);
        return res.status(500).json(errorMessage({ message: 'Error al guardar datos ARCA' }));
    }
}

/**
 * POST /fiscal-config/arca/test — prueba la conexión con ARCA usando las
 * credenciales del entorno.
 */
export async function testArca(req, res) {
    try {
        const result = await testConnection();

        return res.status(200).json(successMessage({
            message: result.message,
            extra: { data: result },
        }));
    } catch (err) {
        console.error('Error test arca:', err);
        return res.status(500).json(errorMessage({ message: 'Error al probar la conexión con ARCA' }));
    }
}

/**
 * GET /fiscal-config/integrations — las integraciones se configuran por
 * variables de entorno. Devuelve el estado de la integración ARCA derivado
 * del .env (credenciales enmascaradas).
 */
export async function listAllIntegrations(req, res) {
    try {
        const arca = getArcaEnvCredentials();
        const integrations = [
            {
                provider: 'arca',
                enabled: arca.enabled,
                environment: arca.environment,
                has_credentials: !!(arca.cert_pem && arca.key_pem),
            },
        ];
        return res.status(200).json(successMessage({
            message: 'Integraciones obtenidas',
            extra: { data: integrations },
        }));
    } catch (err) {
        console.error('Error list integrations:', err);
        return res.status(500).json(errorMessage({ message: 'Error al obtener integraciones' }));
    }
}

/**
 * PUT /fiscal-config/integrations/:provider — las credenciales de integraciones
 * se gestionan por variables de entorno y no se persisten en base de datos.
 */
export async function upsertIntegration(req, res) {
    try {
        const { provider } = req.params;
        return res.status(200).json(successMessage({
            message: `La integración ${provider} se configura mediante variables de entorno (.env).`,
            extra: { data: { provider, source: 'env' } },
        }));
    } catch (err) {
        console.error('Error upsert integration:', err);
        return res.status(500).json(errorMessage({ message: 'Error al guardar la integración' }));
    }
}

/**
 * DELETE /fiscal-config/integrations/:provider — las credenciales se gestionan
 * por variables de entorno; deshabilitar una integración implica ajustar el
 * .env del servicio.
 */
export async function deleteIntegration(req, res) {
    try {
        const { provider } = req.params;
        return res.status(200).json(successMessage({
            message: `La integración ${provider} se gestiona mediante variables de entorno (.env).`,
            extra: { data: { provider, source: 'env' } },
        }));
    } catch (err) {
        console.error('Error delete integration:', err);
        return res.status(500).json(errorMessage({ message: 'Error al deshabilitar la integración' }));
    }
}
