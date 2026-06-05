import TaxSetting from '../models/TaxSetting.js';
import { errorMessage, successMessage } from '../utils/messages.js';

/**
 * Listar configuraciones de alícuotas IIBB
 */
export async function list(req, res) {
    try {
        const { page = 1, limit = 50, tipo, impuesto, activa } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const where = {};

        if (tipo) where.tipo = tipo;
        if (impuesto) where.impuesto = impuesto;
        if (activa !== undefined) where.activa = activa === 'true';

        const { count, rows } = await TaxSetting.findAndCountAll({
            where,
            order: [['jurisdiccion', 'ASC'], ['tipo', 'ASC']],
            limit: Number(limit),
            offset,
        });

        return res.status(200).json(successMessage({
            data: rows,
            pagination: {
                totalItems: count,
                totalPages: Math.ceil(count / Number(limit)),
                currentPage: Number(page),
                perPage: Number(limit),
            },
        }));
    } catch (error) {
        console.error('tax-settings list error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener configuraciones de impuesto' }));
    }
}

/**
 * Obtener configuración por ID
 */
export async function getById(req, res) {
    try {
        const setting = await TaxSetting.findOne({ where: { id: req.params.id } });
        if (!setting) return res.status(404).json(errorMessage({ message: 'Configuración de impuesto no encontrada' }));
        return res.status(200).json(successMessage({ data: setting }));
    } catch (error) {
        console.error('tax-settings getById error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener configuración de impuesto' }));
    }
}

/**
 * Crear configuración de alícuota
 */
export async function create(req, res) {
    try {
        const { jurisdiccion, tipo, impuesto, alicuota, monto_minimo } = req.body;

        if (!jurisdiccion || !tipo || !impuesto || alicuota === undefined) {
            return res.status(400).json(errorMessage({ message: 'jurisdiccion, tipo, impuesto y alicuota son requeridos' }));
        }

        const setting = await TaxSetting.create({
            jurisdiccion,
            tipo,
            impuesto: impuesto || 'IIBB',
            alicuota: Number(alicuota),
            monto_minimo: monto_minimo || 0,
            activa: true,
        });

        return res.status(201).json(successMessage({ data: setting, message: 'Configuración de impuesto creada' }));
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json(errorMessage({ message: 'Ya existe una configuración para esa jurisdicción, tipo e impuesto' }));
        }
        console.error('tax-settings create error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al crear configuración de impuesto' }));
    }
}

/**
 * Actualizar configuración de alícuota
 */
export async function update(req, res) {
    try {
        const setting = await TaxSetting.findOne({ where: { id: req.params.id } });
        if (!setting) return res.status(404).json(errorMessage({ message: 'Configuración de impuesto no encontrada' }));

        const { alicuota, monto_minimo, activa } = req.body;

        await setting.update({
            ...(alicuota !== undefined && { alicuota: Number(alicuota) }),
            ...(monto_minimo !== undefined && { monto_minimo: Number(monto_minimo) }),
            ...(activa !== undefined && { activa }),
        });

        return res.status(200).json(successMessage({ data: setting, message: 'Configuración de impuesto actualizada' }));
    } catch (error) {
        console.error('tax-settings update error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al actualizar configuración de impuesto' }));
    }
}

/**
 * Eliminar configuración (soft delete)
 */
export async function remove(req, res) {
    try {
        const setting = await TaxSetting.findOne({ where: { id: req.params.id } });
        if (!setting) return res.status(404).json(errorMessage({ message: 'Configuración de impuesto no encontrada' }));

        await setting.destroy();
        return res.status(200).json(successMessage({ message: 'Configuración de impuesto eliminada' }));
    } catch (error) {
        console.error('tax-settings delete error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al eliminar configuración de impuesto' }));
    }
}
