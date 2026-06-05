import TaxWithholding from '../models/TaxWithholding.js';
import TaxSetting from '../models/TaxSetting.js';
import { errorMessage, successMessage } from '../utils/messages.js';
import { Op } from 'sequelize';

/**
 * Listar retenciones/percepciones
 */
export async function list(req, res) {
    try {
        const {
            page = 1, limit = 20,
            tipo, tax_setting_id, sale_id, purchase_order_id,
            fecha_desde, fecha_hasta,
        } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const where = {};

        if (tipo) where.tipo = tipo;
        if (tax_setting_id) where.tax_setting_id = Number(tax_setting_id);
        if (sale_id) where.sale_id = Number(sale_id);
        if (purchase_order_id) where.purchase_order_id = Number(purchase_order_id);

        if (fecha_desde && fecha_hasta) {
            where.fecha = { [Op.between]: [fecha_desde, fecha_hasta] };
        } else if (fecha_desde) {
            where.fecha = { [Op.gte]: fecha_desde };
        } else if (fecha_hasta) {
            where.fecha = { [Op.lte]: fecha_hasta };
        }

        const { count, rows } = await TaxWithholding.findAndCountAll({
            where,
            include: [
                { model: TaxSetting, as: 'taxSetting', attributes: ['id', 'jurisdiccion', 'tipo', 'impuesto', 'alicuota'] },
            ],
            order: [['fecha', 'DESC']],
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
        console.error('tax-withholdings list error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener retenciones' }));
    }
}

/**
 * Obtener retención por ID
 */
export async function getById(req, res) {
    try {
        const withholding = await TaxWithholding.findOne({
            where: { id: req.params.id },
            include: [
                { model: TaxSetting, as: 'taxSetting' },
            ],
        });

        if (!withholding) {
            return res.status(404).json(errorMessage({ message: 'Retención no encontrada' }));
        }

        return res.status(200).json(successMessage({ data: withholding }));
    } catch (error) {
        console.error('tax-withholdings getById error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener retención' }));
    }
}

/**
 * Crear retención/percepción
 */
export async function create(req, res) {
    try {
        const {
            tax_setting_id, sale_id, purchase_order_id,
            tipo, base_imponible, alicuota,
            numero_certificado, fecha,
        } = req.body;

        if (!tax_setting_id || !tipo || !base_imponible || !alicuota || !fecha) {
            return res.status(400).json(errorMessage({ message: 'tax_setting_id, tipo, base_imponible, alicuota y fecha son requeridos' }));
        }

        const monto = Number(base_imponible) * Number(alicuota) / 100;

        const withholding = await TaxWithholding.create({
            tax_setting_id,
            sale_id: sale_id || null,
            purchase_order_id: purchase_order_id || null,
            tipo,
            base_imponible: Number(base_imponible),
            alicuota: Number(alicuota),
            monto: Number(monto.toFixed(2)),
            numero_certificado: numero_certificado || null,
            fecha,
        });

        return res.status(201).json(successMessage({ data: withholding, message: 'Retención registrada correctamente' }));
    } catch (error) {
        console.error('tax-withholdings create error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al crear retención' }));
    }
}

/**
 * Reporte de retenciones por período
 */
export async function report(req, res) {
    try {
        const { periodo } = req.query;

        if (!periodo) {
            return res.status(400).json(errorMessage({ message: 'El parámetro periodo (YYYY-MM) es requerido' }));
        }

        // periodo = YYYY-MM, filtrar por fecha dentro del período
        const [year, month] = periodo.split('-');
        const startDate = `${year}-${month}-01`;
        const endDate = new Date(Number(year), Number(month), 0).toISOString().split('T')[0]; // último día del mes

        const withholdings = await TaxWithholding.findAll({
            where: {
                fecha: { [Op.between]: [startDate, endDate] },
            },
            include: [
                { model: TaxSetting, as: 'taxSetting', attributes: ['id', 'jurisdiccion', 'tipo', 'impuesto', 'alicuota'] },
            ],
            order: [['fecha', 'ASC']],
        });

        // Agrupar por jurisdicción y tipo de impuesto
        const resumen = {};
        let totalMonto = 0;

        for (const w of withholdings) {
            const key = `${w.taxSetting?.jurisdiccion || 'N/A'}-${w.taxSetting?.impuesto || 'N/A'}`;
            if (!resumen[key]) {
                resumen[key] = {
                    jurisdiccion: w.taxSetting?.jurisdiccion,
                    impuesto: w.taxSetting?.impuesto,
                    tipo: w.tipo,
                    total_base: 0,
                    total_monto: 0,
                    cantidad: 0,
                };
            }
            resumen[key].total_base += Number(w.base_imponible);
            resumen[key].total_monto += Number(w.monto);
            resumen[key].cantidad++;
            totalMonto += Number(w.monto);
        }

        return res.status(200).json(successMessage({
            data: {
                periodo,
                withholdings,
                resumen: Object.values(resumen),
                total_monto: Number(totalMonto.toFixed(2)),
                count: withholdings.length,
            },
        }));
    } catch (error) {
        console.error('tax-withholdings report error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al generar reporte de retenciones' }));
    }
}
