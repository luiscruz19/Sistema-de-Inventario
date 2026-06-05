import { errorMessage, successMessage } from '../utils/messages.js';
import messages from '../config/messages.js';
import logger from '../utils/logger.js';
import User from '../models/User.js';

export const view = async (req, res) => {
    try {
        const id = req.params.id;
        const user = req.user;
        if (Number(id) !== Number(user.id)) {
            return res.status(403).json(errorMessage({ message: messages.generic.permission_denied }));
        }
        if (!id) {
            return res.status(400).json(errorMessage({ message: messages.generic.id_required }));
        }
        const result = await User.findByPk(id);
        if (!result) {
            return res.status(404).json(errorMessage({ message: messages.generic.user_not_found }));
        }
        const { dataValues: data } = result;
        return res.status(200).json(successMessage({
            extra: { data: { id: data.id, email: data.email, verified: data.verified, contact_email: data.contact_email ?? null, is_guest: data.is_guest ?? false } },
        }));
    } catch (error) {
        logger.error('view_user', { error });
        return res.status(500).json(errorMessage({ message: messages.generic.error }));
    }
};

export const findByEmail = async (req, res) => {
    try {
        const { email } = req.params;
        if (!email) {
            return res.status(400).json(errorMessage({ message: 'Email requerido' }));
        }
        const user = await User.findOne({
            where: { email: email.toLowerCase().trim() },
            attributes: ['id', 'email', 'verified'],
        });
        if (!user) {
            return res.status(404).json(errorMessage({ message: 'Usuario no encontrado' }));
        }
        return res.status(200).json(successMessage({ extra: { data: user } }));
    } catch (error) {
        logger.error('findByEmail', { error });
        return res.status(500).json(errorMessage({ message: messages.generic.error }));
    }
};

export const findById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json(errorMessage({ message: 'ID requerido' }));
        const user = await User.findByPk(id, { attributes: ['id', 'email'] });
        if (!user) return res.status(404).json(errorMessage({ message: 'Usuario no encontrado' }));
        return res.status(200).json(successMessage({ extra: { data: user } }));
    } catch (error) {
        logger.error('findById', { error });
        return res.status(500).json(errorMessage({ message: messages.generic.error }));
    }
};

export const remove = async (req, res) => {
    try {
        const id = req.params.id;
        const user = req.user;
        if (Number(id) !== Number(user.id)) {
            return res.status(403).json(errorMessage({ message: messages.generic.permission_denied }));
        }
        if (!id) {
            return res.status(400).json(errorMessage({ message: messages.generic.id_required }));
        }
        const result = await User.destroy({ where: { id } });
        if (result) {
            return res.status(200).json(successMessage({ message: messages.success.remove }));
        }
        return res.status(404).json(errorMessage({ message: messages.error.remove }));
    } catch (error) {
        logger.error('delete_user', { error });
        return res.status(500).json(errorMessage({ message: messages.generic.error }));
    }
};

export const updatePassword = async (req, res) => {
    try {
        const { current_password, password } = req.body;
        const { id: user_id } = req.user;
        const user = await User.findByPk(user_id);
        if (!user) {
            return res.status(404).json(errorMessage({ message: messages.generic.user_not_found }));
        }
        const validate_password = await user.validPassword(current_password);
        if (!validate_password) {
            return res.status(400).json(errorMessage({ message: messages.error.update_password.current_incorrect }));
        }
        if (user.previous_password) {
            const { compareSync } = await import('bcryptjs');
            if (compareSync(password, user.previous_password)) {
                return res.status(400).json(errorMessage({ message: 'No podés reutilizar tu contraseña anterior.' }));
            }
        }
        const password_hash = await User.prototype.generateHash(password);
        const updateUser = await User.update(
            { password: password_hash, previous_password: user.password },
            { where: { id: user_id } }
        );
        if (!updateUser) {
            return res.status(500).json(errorMessage({ message: messages.error.update_password.error }));
        }
        return res.status(200).json(successMessage({ message: messages.success.update_password }));
    } catch (error) {
        logger.error('updatePassword', { error });
        return res.status(500).json(errorMessage({ message: messages.generic.error }));
    }
};
