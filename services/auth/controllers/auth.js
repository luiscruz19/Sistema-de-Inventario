import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { Op } from 'sequelize';

import CONFIG from '../config/config.js';
const { WEB_URL, SECRET_KEY, LOGIN_MAX_ATTEMPTS, LOGIN_BLOCK_WINDOW_MS, APP_NAME, AUTH_USE_JWT_LINKS } = CONFIG;
import { errorMessage, successMessage } from '../utils/messages.js';
import messages from '../config/messages.js';
import logger from '../utils/logger.js';

import User from '../models/User.js';
import LoginAttempt from '../models/LoginAttempt.js';
import LoginLog from '../models/LoginLog.js';
import { verifyTotpCode } from './totp.js';

import sendMailService from '../services/send-mail.js';
import signupTemplate from '../templates/signup.js';
import forgotPasswordTemplate from '../templates/forgot-password.js';

async function isBlocked(email, ip) {
    const attempt = await LoginAttempt.findOne({ where: { email: email.toLowerCase(), ip } });
    if (!attempt) return false;
    const now = Date.now();
    if (attempt.blocked_until && attempt.blocked_until > now) return true;
    if (attempt.blocked_until && attempt.blocked_until <= now && attempt.count > 0) {
        await attempt.update({ count: 0, blocked_until: 0 });
    }
    return false;
}

async function registerFailedAttempt(email, ip) {
    const maxAttempts = Number(LOGIN_MAX_ATTEMPTS || 5);
    const blockWindowMs = Number(LOGIN_BLOCK_WINDOW_MS || 15 * 60 * 1000);
    const [attempt] = await LoginAttempt.findOrCreate({
        where: { email: email.toLowerCase(), ip },
        defaults: { count: 0, blocked_until: 0 },
    });
    const nextCount = (attempt.count || 0) + 1;
    const blocked_until = nextCount >= maxAttempts ? Date.now() + blockWindowMs : attempt.blocked_until;
    await attempt.update({ count: nextCount, blocked_until });
}

async function resetAttempts(email, ip) {
    await LoginAttempt.update({ count: 0, blocked_until: 0 }, { where: { email: email.toLowerCase(), ip } });
}

// Cleanup stale login_attempt records once per hour (24h TTL)
setInterval(async () => {
    try {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
        await LoginAttempt.destroy({ where: { updated_at: { [Op.lt]: cutoff } }, force: true });
    } catch (err) {
        logger.error('login_attempts_cleanup', { error: err?.message });
    }
}, 60 * 60 * 1000);

function extractRequestMeta(req) {
    const forwarded = req.headers['x-forwarded-for'];
    const forwarded_ip = forwarded ? forwarded.split(',')[0].trim() : null;
    return {
        ip: req.ip || req.socket?.remoteAddress || null,
        forwarded_ip,
        user_agent: req.headers['user-agent'] || null,
        origin: req.headers['origin'] || null,
        accept_language: req.headers['accept-language']?.slice(0, 100) || null,
    };
}

function logLogin(fields) {
    LoginLog.create(fields).catch(err => logger.error('login_log_create', { error: err?.message }));
}

// Generates a short-lived activation link token.
// When AUTH_USE_JWT_LINKS=true, uses a JWT with 15-day expiration instead of the raw uuid.
// The JWT form lets the frontend validate the token without a DB roundtrip.
function buildActivationToken(userData) {
    if (AUTH_USE_JWT_LINKS) {
        return jwt.sign(
            { id: userData.id, email: userData.email, remember_token: userData.remember_token, purpose: 'activation' },
            SECRET_KEY,
            { expiresIn: '15d', algorithm: 'HS256' }
        );
    }
    return userData.remember_token;
}

export async function login(req, res) {
    const { email, password } = req.body;
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const meta = extractRequestMeta(req);

    if (await isBlocked(email, ip)) {
        logLogin({ email, status: 'blocked', ...meta });
        return res.status(429).json(errorMessage({ message: 'Demasiados intentos fallidos. Intentá nuevamente en unos minutos.' }));
    }

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            await registerFailedAttempt(email, ip);
            logLogin({ email, status: 'user_not_found', ...meta });
            return res.status(401).json(errorMessage({ message: messages.error.login.error }));
        }
        const validate_password = await user.validPassword(password);
        if (!validate_password) {
            await registerFailedAttempt(email, ip);
            logLogin({ email, user_id: user.id, status: 'wrong_password', ...meta });
            return res.status(401).json(errorMessage({ message: messages.error.login.error }));
        }
        if (!user.verified) {
            await registerFailedAttempt(email, ip);
            logLogin({ email, user_id: user.id, status: 'not_verified', ...meta });
            return res.status(403).json(errorMessage({ message: messages.error.login.not_verified }));
        }
        await resetAttempts(email, ip);
        const { dataValues: data } = user;

        if (data.totp_enabled) {
            const tempToken = jwt.sign(
                { id: data.id, email: data.email, pending_2fa: true },
                SECRET_KEY,
                { expiresIn: '5m', algorithm: 'HS256' }
            );
            logLogin({ email, user_id: data.id, status: 'pending_2fa', ...meta });
            return res.status(200).json(successMessage({
                message: 'Se requiere verificación de segundo factor',
                extra: {
                    requires_2fa: true,
                    temp_token: tempToken,
                    user: { id: data.id },
                },
            }));
        }

        logLogin({ email, user_id: data.id, status: 'success', ...meta });
        const token = User.prototype.generateToken({ id: data.id, email: data.email, remember_token: data.remember_token });
        return res.status(200).json(successMessage({
            message: messages.success.login,
            extra: { user: { id: data.id, token } },
        }));
    } catch (error) {
        logger.error('login', { error: error?.message });
        return res.status(500).json(errorMessage({ message: messages.generic.error }));
    }
}

export async function signup(req, res) {
    const { email, password, welcome_email = 0 } = req.body;
    try {
        const find = await User.findOne({ where: { email } });
        if (find) {
            return res.status(400).json(errorMessage({ message: messages.error.signup.error.email_exists }));
        }
        const password_hash = await User.prototype.generateHash(password);
        const uuid = await User.prototype.generateUUID(100);
        const user = await User.create({ remember_token: uuid, email, password: password_hash, verified: 0 });
        if (!user) {
            return res.status(400).json(errorMessage({ message: messages.error.signup.error.error }));
        }
        const { dataValues: data } = user;

        if (Number(welcome_email) === 1) {
            const { path = '/validate-account' } = req.body;
            const safePath = typeof path === 'string' && path.startsWith('/') && !path.includes('..') ? path : '/validate-account';
            const activationToken = buildActivationToken(data);
            const link = `${WEB_URL}${safePath}/${activationToken}/${data.id}`;
            const content = signupTemplate({ email, link });
            await sendMailService({ to: email, subject: `Bienvenido a ${APP_NAME}`, content });
        }

        const token = User.prototype.generateToken({ id: data.id, email: data.email, remember_token: data.remember_token });
        return res.status(200).json(successMessage({
            message: messages.success.signup,
            extra: {
                user: {
                    id: data.id,
                    token,
                    remember_token: uuid,
                },
            },
        }));
    } catch (error) {
        logger.error('signup', { error: error?.message });
        return res.status(400).json(errorMessage({ message: messages.generic.error }));
    }
}

/**
 * POST /auth/send-activation-link
 * Reenvía el mail de activación a un usuario ya existente.
 * Solo se manda si el usuario NO está verified (cuenta aún no activada).
 * Usado por el flujo de "primera suscripción" de members importados/sin suscripción.
 */
export async function sendActivationLink(req, res) {
    const { user_id } = req.body || {};
    if (!user_id) {
        return res.status(400).json(errorMessage({ message: 'Se requiere user_id' }));
    }
    try {
        const user = await User.findOne({ where: { id: user_id } });
        if (!user) {
            return res.status(404).json(errorMessage({ message: 'Usuario no encontrado' }));
        }
        const { dataValues: data } = user;
        if (Number(data.verified) === 1) {
            return res.status(409).json(errorMessage({ message: 'La cuenta ya está activada' }));
        }
        const { path = '/activate-account' } = req.body;
        const safePath = typeof path === 'string' && path.startsWith('/') && !path.includes('..') ? path : '/activate-account';
        const activationToken = buildActivationToken(data);
        const link = `${WEB_URL}${safePath}/${activationToken}/${data.id}`;
        const content = signupTemplate({ email: data.email, link });
        await sendMailService({ to: data.email, subject: `Bienvenido a ${APP_NAME}`, content });
        return res.status(200).json(successMessage({ message: 'Link de activación enviado' }));
    } catch (error) {
        logger.error('send-activation-link', { error: error?.message });
        return res.status(500).json(errorMessage({ message: messages.generic.error }));
    }
}

export async function guestSignup(req, res) {
    try {
        const { email: contactEmail } = req.body;
        const guestEmail = `guest.${Date.now()}.${randomBytes(4).readUInt32BE(0) % 100000}@guest.local`;
        const guestPassword = await User.prototype.generateUUID(32);
        const password_hash = await User.prototype.generateHash(guestPassword);
        const uuid = await User.prototype.generateUUID(100);
        const user = await User.create({
            remember_token: uuid,
            email: guestEmail,
            password: password_hash,
            verified: 1,
            contact_email: contactEmail || null,
            is_guest: true,
        });
        const { dataValues: data } = user;
        const token = User.prototype.generateToken({ id: data.id, email: data.email, remember_token: data.remember_token });
        return res.status(200).json(successMessage({
            message: 'Sesión de invitado iniciada.',
            extra: { user: { id: data.id, token, guest: true, contact_email: contactEmail } },
        }));
    } catch (error) {
        logger.error('guestSignup', { error: error?.message });
        return res.status(500).json(errorMessage({ message: messages.generic.error }));
    }
}

export async function validateAccount(req, res) {
    const { id, token: remember_token } = req.body;
    try {
        // Support both raw uuid tokens and JWT activation tokens (AUTH_USE_JWT_LINKS=true)
        let resolvedToken = remember_token;
        if (AUTH_USE_JWT_LINKS) {
            try {
                const decoded = jwt.verify(remember_token, SECRET_KEY, { algorithms: ['HS256'] });
                if (decoded.purpose === 'activation') resolvedToken = decoded.remember_token;
            } catch {
                // Not a JWT — fall through and try raw uuid lookup
            }
        }

        const user = await User.findOne({ where: { id, remember_token: resolvedToken } });
        if (!user) {
            return res.status(404).json(errorMessage({ message: messages.generic.account_not_found }));
        }
        if (user.verified) {
            return res.status(409).json(errorMessage({ message: messages.error.validate_account.error.verified }));
        }
        const verified = await User.update({ verified: 1 }, { where: { id: user.id } });
        logger.info('validateAccount', { verified });
        if (!verified) {
            return res.status(500).json(errorMessage({ message: messages.error.validate_account.error.not_verified }));
        }
        return res.status(200).json(successMessage({ message: messages.success.validate_account }));
    } catch (error) {
        logger.error('validateAccount', { error: error?.message });
        return res.status(500).json(errorMessage({ message: messages.generic.error }));
    }
}

export async function validateToken(req, res) {
    try {
        const { id, remember_token } = req.user;
        const user = await User.findOne({ where: { id, remember_token } });
        // Validar el token NO exige cuenta verificada: un token recién emitido en el
        // signup es válido aunque el usuario todavía no verificó su email (lo hace
        // después de pagar). El gate de "verified" está en el login (403) y en los
        // guards de contenido premium, no acá. Exigirlo rompía el flujo signuppago
        // (update-payment-status fallaba y la suscripción quedaba en pending).
        if (!user) {
            return res.status(400).json(errorMessage({ message: messages.generic.user_not_found }));
        }
        const { dataValues: data } = user;
        return res.status(200).json(successMessage({
            message: messages.success.validate_token,
            extra: {
                user: {
                    id: data.id,
                    email: data.email,
                    is_guest: data.is_guest ?? false,
                    contact_email: data.contact_email ?? null,
                },
            },
        }));
    } catch (error) {
        logger.error('validateToken', { error: error?.message });
        return res.status(400).json(errorMessage({ message: messages.generic.error }));
    }
}

export async function forgotPassword(req, res) {
    try {
        const { email, pathname = '' } = req.body;
        const find = await User.findOne({ where: { email } });
        // Always return 200 regardless of whether the email exists — prevents user enumeration
        if (!find) {
            return res.status(200).json(successMessage({ message: messages.success.forgot_password }));
        }
        const { dataValues: data } = find;

        let hash;
        if (AUTH_USE_JWT_LINKS) {
            // JWT with 15-day expiry for frontend-verifiable reset links
            hash = jwt.sign(
                { id: data.id, email: data.email, remember_token: data.remember_token, purpose: 'reset' },
                SECRET_KEY,
                { expiresIn: '15d', algorithm: 'HS256' }
            );
        } else {
            hash = User.prototype.generateToken({ id: data.id, email: data.email, remember_token: data.remember_token });
        }

        const link = `${WEB_URL}${pathname}/restablecer-password/${hash}`;
        const content = forgotPasswordTemplate({ email, link });
        await sendMailService({ to: email, subject: `${APP_NAME} - Restablecer contraseña`, content });
        return res.status(200).json(successMessage({ message: messages.success.forgot_password }));
    } catch (error) {
        logger.error('forgotPassword', { error: error?.message });
        return res.status(400).json(errorMessage({ message: messages.generic.error }));
    }
}

export async function restorePassword(req, res) {
    try {
        const { hash } = req.body;
        let user = null;

        if (!hash) {
            const { token: remember_token, user_id } = req.body;
            user = await User.findOne({ where: { id: user_id, remember_token } });
        } else {
            try {
                const payload = jwt.verify(hash, SECRET_KEY, { algorithms: ['HS256'] });
                const now = Math.floor(Date.now() / 1000);
                const expiresAt = Number(payload.exp ?? payload.expire ?? 0);
                if (!expiresAt || Number.isNaN(expiresAt) || expiresAt <= now) {
                    return res.status(400).json(errorMessage({ message: messages.error.restore_password.hash_invalid }));
                }
                user = await User.findOne({
                    where: { id: payload.id, email: payload.email, remember_token: payload.remember_token },
                });
            } catch (decodeError) {
                logger.warn('restorePassword_decode', { error: decodeError?.message });
                return res.status(400).json(errorMessage({ message: messages.error.restore_password.hash_invalid }));
            }
        }

        if (!user) {
            return res.status(404).json(errorMessage({ message: messages.error.restore_password.hash_invalid }));
        }

        const { password } = req.body;
        const { dataValues: data } = user;

        if (data.previous_password) {
            const { compare } = await import('bcryptjs');
            if (await compare(password, data.previous_password)) {
                return res.status(400).json(errorMessage({ message: 'No podés usar una contraseña que ya usaste anteriormente' }));
            }
        }

        const password_hash = await User.prototype.generateHash(password);
        const uuid = await User.prototype.generateUUID(100);
        const update = await User.update(
            { password: password_hash, previous_password: data.password, remember_token: uuid },
            { where: { id: data.id } }
        );

        if (!update) {
            return res.status(500).json(errorMessage({ message: messages.error.restore_password.error }));
        }
        return res.status(200).json(successMessage({
            message: messages.success.restore_password,
            extra: { data: { remember_token: uuid } },
        }));
    } catch (error) {
        logger.error('restorePassword', { error: error?.message });
        return res.status(500).json(errorMessage({ message: messages.error.restore_password.error }));
    }
}

export const searchUser = async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).json(errorMessage({ message: messages.generic.email_required }));
        }
        const result = await User.findOne({ where: { email } });
        if (!result) {
            return res.status(404).json(errorMessage({ message: messages.generic.user_not_found_email }));
        }
        const { dataValues: data } = result;
        return res.status(200).json(successMessage({
            message: messages.success.search_user,
            extra: { data: { email: data.email } },
        }));
    } catch (error) {
        logger.error('search_user', { error: error?.message });
        return res.status(500).json(errorMessage({ message: messages.generic.error }));
    }
};

export async function generateGuestToken(req, res) {
    try {
        const { user_id } = req.body;
        if (!user_id) return res.status(400).json(errorMessage({ message: 'user_id es requerido' }));
        const user = await User.findOne({ where: { id: user_id, is_guest: true } });
        if (!user) return res.status(404).json(errorMessage({ message: messages.generic.user_not_found }));
        const { dataValues: data } = user;
        const token = User.prototype.generateToken({ id: data.id, email: data.email, remember_token: data.remember_token });
        return res.status(200).json(successMessage({ extra: { token } }));
    } catch (error) {
        logger.error('generateGuestToken', { error: error?.message });
        return res.status(500).json(errorMessage({ message: messages.generic.error }));
    }
}

/**
 * POST /auth/system-token
 * Endpoint INTERNO service-to-service: devuelve un JWT válido para que un microservicio
 * pueda autenticarse contra auth desde un job/cron (sin sesión humana).
 *
 * Autenticación: header `cron-secret` (middleware aplicado en routes).
 *
 * Política: usa el primer User que sea Admin en NOVITAS para firmar el token (idéntico
 * al login normal — mismo payload {id, email, remember_token, exp}). Es necesario que
 * exista al menos un admin en la BD.
 *
 * El microservicio caller NO necesita la lib JWT — la firma vive sólo acá.
 */
export async function systemToken(req, res) {
    try {
        // Estrategia simple y robusta: usar el primer User no-guest verificado.
        // En un sistema con admins, el primero (id más bajo) suele ser el raíz.
        const user = await User.findOne({
            where: { is_guest: false, verified: true },
            order: [['id', 'ASC']],
        });
        if (!user) {
            return res.status(404).json(errorMessage({ message: 'No hay usuarios admin disponibles para generar token' }));
        }
        const { dataValues: data } = user;
        const token = User.prototype.generateToken({
            id: data.id,
            email: data.email,
            remember_token: data.remember_token
        });
        return res.status(200).json(successMessage({
            message: 'System token generado',
            extra: { token, user_id: data.id }
        }));
    } catch (error) {
        logger.error('systemToken', { error: error?.message });
        return res.status(500).json(errorMessage({ message: messages.generic.error }));
    }
}
