import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import jwt from 'jsonwebtoken';

import { errorMessage, successMessage } from '../utils/messages.js';
import logger from '../utils/logger.js';
import User from '../models/User.js';
import CONFIG from '../config/config.js';

const { APP_NAME, SECRET_KEY } = CONFIG;

export async function setup2FA(req, res) {
    try {
        const { id } = req.user;
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json(errorMessage({ message: 'Usuario no encontrado' }));
        }
        if (user.totp_enabled) {
            return res.status(409).json(errorMessage({ message: '2FA ya está activado en esta cuenta.' }));
        }

        const secret = speakeasy.generateSecret({
            name: `${APP_NAME} (${user.email})`,
            length: 32,
        });

        await User.update({ totp_secret: secret.base32 }, { where: { id } });

        const qrDataUrl = await qrcode.toDataURL(secret.otpauth_url);

        return res.status(200).json(successMessage({
            message: 'Escaneá el código QR con tu app de autenticación y verificá con /auth/2fa/verify',
            extra: {
                data: {
                    qr_code: qrDataUrl,
                    secret: secret.base32,
                },
            },
        }));
    } catch (error) {
        logger.error('setup2FA', { error: error?.message });
        return res.status(500).json(errorMessage({ message: 'Error al configurar 2FA' }));
    }
}

export async function verify2FA(req, res) {
    try {
        const { id } = req.user;
        const { code } = req.body;
        if (!code) {
            return res.status(400).json(errorMessage({ message: 'Código requerido' }));
        }

        const user = await User.findByPk(id);
        if (!user || !user.totp_secret) {
            return res.status(400).json(errorMessage({ message: 'Primero configurá el 2FA con /auth/2fa/setup' }));
        }
        if (user.totp_enabled) {
            return res.status(409).json(errorMessage({ message: '2FA ya está activado.' }));
        }

        const isValid = speakeasy.totp.verify({
            secret: user.totp_secret,
            encoding: 'base32',
            token: String(code),
            window: 1,
        });

        if (!isValid) {
            return res.status(401).json(errorMessage({ message: 'Código inválido o expirado' }));
        }

        await User.update({ totp_enabled: true }, { where: { id } });

        return res.status(200).json(successMessage({ message: '2FA activado correctamente' }));
    } catch (error) {
        logger.error('verify2FA', { error: error?.message });
        return res.status(500).json(errorMessage({ message: 'Error al verificar 2FA' }));
    }
}

export async function disable2FA(req, res) {
    try {
        const { id } = req.user;
        const { code } = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json(errorMessage({ message: 'Usuario no encontrado' }));
        }
        if (!user.totp_enabled) {
            return res.status(400).json(errorMessage({ message: '2FA no está activado en esta cuenta.' }));
        }
        if (!code) {
            return res.status(400).json(errorMessage({ message: 'Código requerido para desactivar 2FA' }));
        }

        const isValid = speakeasy.totp.verify({
            secret: user.totp_secret,
            encoding: 'base32',
            token: String(code),
            window: 1,
        });

        if (!isValid) {
            return res.status(401).json(errorMessage({ message: 'Código inválido o expirado' }));
        }

        await User.update({ totp_enabled: false, totp_secret: null }, { where: { id } });

        return res.status(200).json(successMessage({ message: '2FA desactivado correctamente' }));
    } catch (error) {
        logger.error('disable2FA', { error: error?.message });
        return res.status(500).json(errorMessage({ message: 'Error al desactivar 2FA' }));
    }
}

export function verifyTotpCode(secret, code) {
    return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: String(code),
        window: 1,
    });
}

export async function verifyTotpLogin(req, res) {
    try {
        const { temp_token, code } = req.body;
        if (!temp_token || !code) {
            return res.status(400).json(errorMessage({ message: 'Token y código requeridos' }));
        }

        let decoded;
        try {
            decoded = jwt.verify(temp_token, SECRET_KEY, { algorithms: ['HS256'] });
        } catch {
            return res.status(401).json(errorMessage({ message: 'Token inválido o expirado' }));
        }

        if (!decoded.pending_2fa) {
            return res.status(400).json(errorMessage({ message: 'Token no requiere 2FA' }));
        }

        const user = await User.findByPk(decoded.id);
        if (!user || !user.totp_enabled || !user.totp_secret) {
            return res.status(400).json(errorMessage({ message: 'Usuario no tiene 2FA configurado' }));
        }

        const isValid = speakeasy.totp.verify({
            secret: user.totp_secret,
            encoding: 'base32',
            token: String(code),
            window: 1,
        });

        if (!isValid) {
            return res.status(401).json(errorMessage({ message: 'Código incorrecto' }));
        }

        const finalToken = User.prototype.generateToken({
            id: user.id,
            email: user.email,
            remember_token: user.remember_token,
        });

        return res.status(200).json(successMessage({
            message: 'Verificación exitosa',
            extra: { user: { id: user.id, token: finalToken } },
        }));
    } catch (error) {
        logger.error('verifyTotpLogin', { error: error?.message });
        return res.status(500).json(errorMessage({ message: 'Error interno' }));
    }
}
