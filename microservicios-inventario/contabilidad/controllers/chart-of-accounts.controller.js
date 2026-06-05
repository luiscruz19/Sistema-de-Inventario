import ChartOfAccount from '../models/ChartOfAccount.js';
import { errorMessage, successMessage } from '../utils/messages.js';

/**
 * Listar plan de cuentas
 */
export async function list(req, res) {
    try {
        const { page = 1, limit = 100, tipo, parent_id, imputable } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const where = {};

        if (tipo) where.tipo = tipo;
        if (parent_id !== undefined) where.parent_id = parent_id === 'null' ? null : Number(parent_id);
        if (imputable !== undefined) where.imputable = imputable === 'true';

        const { count, rows } = await ChartOfAccount.findAndCountAll({
            where,
            include: [
                { model: ChartOfAccount, as: 'parent', attributes: ['id', 'codigo', 'nombre'], required: false },
            ],
            order: [['codigo', 'ASC']],
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
        console.error('chart-of-accounts list error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener plan de cuentas' }));
    }
}

/**
 * Obtener cuenta por ID
 */
export async function getById(req, res) {
    try {
        const account = await ChartOfAccount.findOne({
            where: { id: req.params.id },
            include: [
                { model: ChartOfAccount, as: 'parent', attributes: ['id', 'codigo', 'nombre'], required: false },
                { model: ChartOfAccount, as: 'children', required: false },
            ],
        });

        if (!account) {
            return res.status(404).json(errorMessage({ message: 'Cuenta contable no encontrada' }));
        }

        return res.status(200).json(successMessage({ data: account }));
    } catch (error) {
        console.error('chart-of-accounts getById error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al obtener cuenta contable' }));
    }
}

/**
 * Crear cuenta contable
 */
export async function create(req, res) {
    try {
        const { codigo, nombre, tipo, parent_id, nivel, imputable } = req.body;

        if (!codigo || !nombre || !tipo) {
            return res.status(400).json(errorMessage({ message: 'codigo, nombre y tipo son requeridos' }));
        }

        // Verificar unicidad del código
        const existing = await ChartOfAccount.findOne({ where: { codigo } });
        if (existing) {
            return res.status(409).json(errorMessage({ message: `Ya existe una cuenta con código ${codigo}` }));
        }

        const account = await ChartOfAccount.create({
            codigo,
            nombre,
            tipo,
            parent_id: parent_id || null,
            nivel: nivel || 1,
            imputable: imputable !== false,
            saldo: 0,
        });

        return res.status(201).json(successMessage({ data: account, message: 'Cuenta contable creada correctamente' }));
    } catch (error) {
        console.error('chart-of-accounts create error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al crear cuenta contable' }));
    }
}

/**
 * Actualizar cuenta contable
 */
export async function update(req, res) {
    try {
        const account = await ChartOfAccount.findOne({ where: { id: req.params.id } });
        if (!account) {
            return res.status(404).json(errorMessage({ message: 'Cuenta contable no encontrada' }));
        }

        const { codigo, nombre, tipo, parent_id, nivel, imputable } = req.body;

        if (codigo && codigo !== account.codigo) {
            const existing = await ChartOfAccount.findOne({ where: { codigo } });
            if (existing) {
                return res.status(409).json(errorMessage({ message: `Ya existe una cuenta con código ${codigo}` }));
            }
        }

        await account.update({
            ...(codigo !== undefined && { codigo }),
            ...(nombre !== undefined && { nombre }),
            ...(tipo !== undefined && { tipo }),
            ...(parent_id !== undefined && { parent_id }),
            ...(nivel !== undefined && { nivel }),
            ...(imputable !== undefined && { imputable }),
        });

        return res.status(200).json(successMessage({ data: account, message: 'Cuenta contable actualizada' }));
    } catch (error) {
        console.error('chart-of-accounts update error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al actualizar cuenta contable' }));
    }
}

/**
 * Eliminar cuenta contable (soft delete)
 */
export async function remove(req, res) {
    try {
        const account = await ChartOfAccount.findOne({ where: { id: req.params.id } });
        if (!account) {
            return res.status(404).json(errorMessage({ message: 'Cuenta contable no encontrada' }));
        }

        await account.destroy();
        return res.status(200).json(successMessage({ message: 'Cuenta contable eliminada correctamente' }));
    } catch (error) {
        console.error('chart-of-accounts delete error:', error);
        return res.status(500).json(errorMessage({ message: 'Error al eliminar cuenta contable' }));
    }
}
