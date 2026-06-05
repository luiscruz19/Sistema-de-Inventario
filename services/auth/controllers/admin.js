import { errorMessage, successMessage } from '../utils/messages.js';
import messages from '../config/messages.js';
import logger from '../utils/logger.js';
import User from '../models/User.js';
import { Normalize } from '../utils/helpers.js';

export const batch = async (req, res) => {
    try {
        const { users } = req.body;
        if (!users || users.length === 0) {
            return res.status(400).json(errorMessage({ message: messages.generic.error }));
        }
        const results = await Promise.all(
            users.map(id =>
                User.findByPk(id).then(data => (data ? Normalize(data) : null))
            )
        );
        return res.status(200).json(successMessage({
            extra: { data: results.filter(u => u !== null) },
        }));
    } catch (error) {
        logger.error('batch_user', { error: error?.message });
        return res.status(400).json(errorMessage({ message: messages.generic.error }));
    }
};

export const remove = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json(errorMessage({ message: messages.generic.id_required }));
        }
        // Hard-delete para liberar el email (que tiene unique constraint y cuenta soft-deleted)
        const result = await User.destroy({ where: { id }, force: true });
        if (result) {
            return res.status(200).json(successMessage({ message: messages.success.remove }));
        }
        return res.status(404).json(errorMessage({ message: messages.error.remove }));
    } catch (error) {
        logger.error('delete_user', { error: error?.message });
        return res.status(400).json(errorMessage({ message: messages.generic.error }));
    }
};

export const findByEmail = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json(errorMessage({ message: 'Email requerido' }));
        }
        const user = await User.findOne({ where: { email }, paranoid: false });
        if (!user) {
            return res.status(404).json(errorMessage({ message: 'Usuario no encontrado' }));
        }
        const { dataValues: data } = user;
        return res.status(200).json(successMessage({
            extra: {
                data: {
                    id: data.id,
                    email: data.email,
                    verified: data.verified,
                    deletedAt: data.deletedAt,
                    is_soft_deleted: data.deletedAt !== null
                }
            }
        }));
    } catch (error) {
        logger.error('find_user_by_email', { error: error?.message });
        return res.status(400).json(errorMessage({ message: messages.generic.error }));
    }
};

export const updateEmail = async (req, res) => {
    try {
        const { id } = req.params;
        const { email } = req.body;
        if (!id) {
            return res.status(400).json(errorMessage({ message: messages.generic.id_required }));
        }
        if (!email || typeof email !== 'string') {
            return res.status(400).json(errorMessage({ message: 'Email requerido' }));
        }
        const normalized = String(email).trim().toLowerCase();
        const user = await User.findOne({ where: { id }, paranoid: false });
        if (!user) {
            return res.status(404).json(errorMessage({ message: messages.generic.user_not_found }));
        }
        if (String(user.email).toLowerCase() === normalized) {
            // Nada que hacer
            return res.status(200).json(successMessage({ message: 'Sin cambios', extra: { data: { id: user.id, email: user.email } } }));
        }
        // Verificar que el nuevo email no esté en uso por otro user (incluye soft-deleted)
        const taken = await User.findOne({ where: { email: normalized }, paranoid: false });
        if (taken && Number(taken.id) !== Number(id)) {
            return res.status(409).json(errorMessage({ message: 'Ese email ya está en uso por otro usuario.', code: 409 }));
        }
        await User.update({ email: normalized }, { where: { id } });
        return res.status(200).json(successMessage({
            message: 'Email actualizado',
            extra: { data: { id: user.id, email: normalized } }
        }));
    } catch (error) {
        logger.error('update_email', { error: error?.message });
        return res.status(400).json(errorMessage({ message: messages.generic.error }));
    }
};

export const restore = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json(errorMessage({ message: messages.generic.id_required }));
        }
        const user = await User.findOne({ where: { id }, paranoid: false });
        if (!user) {
            return res.status(404).json(errorMessage({ message: messages.generic.user_not_found }));
        }
        if (user.deletedAt === null) {
            return res.status(200).json(successMessage({ message: 'Usuario ya activo' }));
        }
        await User.restore({ where: { id } });
        return res.status(200).json(successMessage({ message: 'Usuario restaurado' }));
    } catch (error) {
        logger.error('restore_user', { error: error?.message });
        return res.status(400).json(errorMessage({ message: messages.generic.error }));
    }
};

export const validate = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json(errorMessage({ message: messages.generic.id_required }));
        }
        const result = await User.findByPk(id);
        if (!result) {
            return res.status(404).json(errorMessage({ message: messages.generic.user_not_found }));
        }
        const { dataValues: data } = result;
        const update = await User.update({ verified: !data.verified }, { where: { id } });
        if (!update) {
            return res.status(500).json(errorMessage({ message: messages.error.validate_account.error.not_verified }));
        }
        return res.status(200).json(successMessage({
            message: !data.verified ? messages.success.validate_account : messages.success.not_validate_account,
        }));
    } catch (error) {
        logger.error('validate_user', { error: error?.message });
        return res.status(400).json(errorMessage({ message: messages.generic.error }));
    }
};

export const view = async (req, res) => {
    try {
        const id = req.params.id;
        if (!id) {
            return res.status(400).json(errorMessage({ message: messages.generic.id_required }));
        }
        const result = await User.findByPk(id);
        if (!result) {
            return res.status(404).json(errorMessage({ message: messages.generic.user_not_found }));
        }
        const { dataValues: data } = result;
        return res.status(200).json(successMessage({
            extra: { data: { id: data.id, email: data.email, verified: data.verified } },
        }));
    } catch (error) {
        logger.error('view_admin_user', { error: error?.message });
        return res.status(400).json(errorMessage({ message: messages.generic.error }));
    }
};
