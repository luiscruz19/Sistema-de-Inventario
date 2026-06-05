import BusinessConfig from '../models/BusinessConfig.js';
import { errorMessage, successMessage } from '../utils/messages.js';
import messages from '../config/messages.js';

/**
 * Obtener la configuración del negocio.
 * Si no existe, se devuelve un registro vacío creado automáticamente
 * para facilitar el alta inicial del backoffice.
 */
export async function get(req, res) {
    try {
        let config = await BusinessConfig.findOne();

        if (!config) {
            config = await BusinessConfig.create({
                name: 'Mi negocio',
            });
        }

        return res.status(200).json(successMessage({
            message: 'Configuración cargada',
            extra: { data: config },
        }));
    } catch (error) {
        console.error('Error fetching business config:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}

/**
 * Actualizar (o crear) la configuración del negocio.
 */
export async function update(req, res) {
    try {
        const payload = {
            name: req.body.name,
            tax_id: req.body.tax_id ?? null,
            address: req.body.address ?? null,
            phone: req.body.phone ?? null,
            currency: req.body.currency || 'ARS',
            tax_rate_default: req.body.tax_rate_default ?? 21,
            receipt_prefix: req.body.receipt_prefix || 'T',
            receipt_next_number: req.body.receipt_next_number ?? 1,
        };

        if (!payload.name || !String(payload.name).trim()) {
            return res.status(400).json(errorMessage({ message: 'El nombre del negocio es requerido' }));
        }

        let config = await BusinessConfig.findOne();

        if (!config) {
            config = await BusinessConfig.create({ ...payload });
        } else {
            await config.update(payload);
        }

        return res.status(200).json(successMessage({
            message: 'Configuración actualizada',
            extra: { data: config },
        }));
    } catch (error) {
        console.error('Error updating business config:', error);
        return res.status(500).json(errorMessage({ message: messages.system.common.errors.unexpected }));
    }
}
