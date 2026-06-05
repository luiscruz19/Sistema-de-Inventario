import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';

import transporter from '../config/transporter.js';
import { errorMessage, successMessage } from '../utils/messages.js';
import { validate } from '../utils/helpers.js';
import { sanitizeEmailHtml, sanitizeText } from '../utils/sanitize.js';
import messages from '../config/messages.js';
import CONFIG from '../config/config.js';
import validateToken from '../middlewares/validate-token.js';
import adminPermission from '../middlewares/admin-permission.js';
import { hasValidBasicAuth } from '../middlewares/authorization.js';
import EmailLog from '../models/EmailLog.js';
import mailchimp from '../services/mailchimp.js';
import { getMailerLiteClient } from '../services/mailerlite.js';
import { logger } from '../utils/logger.js';

const { MAILER: { USER, FROM_NAME, FROM_EMAIL } } = CONFIG;

const ENABLE_MAILCHIMP = process.env.ENABLE_MAILCHIMP === 'true';
const ENABLE_MAILERLITE = process.env.ENABLE_MAILERLITE === 'true';
const ENABLE_CONTACT = process.env.ENABLE_CONTACT === 'true';
const ENABLE_TEMPLATES = process.env.ENABLE_TEMPLATES === 'true';
const NODE_ENV = process.env.NODE_ENV || 'development';

const MAX_EMAIL_HTML_SIZE = 300_000;

// Requests con la credencial Basic interna (BFF + microservicios) NO se limitan:
// son tráfico server-to-server confiable y la protección anti-abuso pública la cubre Cloudflare.
const sendEmailLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 50,
    message: { status: 0, message: 'Rate limit exceeded' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: hasValidBasicAuth,
});

const subscribeLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { status: 0, message: 'Demasiadas solicitudes de suscripción' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: hasValidBasicAuth,
});

const contactLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { status: 0, message: 'Demasiadas solicitudes de contacto' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: hasValidBasicAuth,
});

const sendEmailValidation = [
    body('to')
        .notEmpty().withMessage(messages.error.send_mail.fields_empty.to)
        .isEmail().withMessage(messages.generic.not_email('Destinatario')),
    body('subject').notEmpty().withMessage(messages.error.send_mail.fields_empty.subject),
    body('content').notEmpty().withMessage(messages.error.send_mail.fields_empty.content),
];

const sendMailWithRetry = async (mailOptions, retries = 2) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await transporter.sendMail(mailOptions);
        } catch (error) {
            if (attempt === retries) throw error;
            await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
        }
    }
};

function resolveFrom() {
    const name = FROM_NAME || 'App';
    const email = FROM_EMAIL || USER;
    return `${name} <${email}>`;
}

function resolveDevRedirect(originalTo) {
    if (NODE_ENV === 'production') return { to: originalTo, redirected: false };
    const redirect = process.env.MAILER_DEV_REDIRECT_EMAIL;
    if (redirect) return { to: redirect, redirected: true, originalTo };
    return { to: originalTo, redirected: false };
}

const router = Router();

router.post('/send-email', [sendEmailLimit, validate(sendEmailValidation)], (req, res) => {
    (async () => {
        const { subject } = req.body;

        if (req.body.encoding === 'base64' && typeof req.body.content === 'string') {
            req.body.content = Buffer.from(req.body.content, 'base64').toString('utf8');
        }

        const html = sanitizeEmailHtml(String(req.body.content || '')).trim();

        if (!html || html.length > MAX_EMAIL_HTML_SIZE) {
            return res.status(400).json(errorMessage({ message: messages.error.send_mail.fields_empty.content }));
        }

        const { to: effectiveTo, redirected, originalTo } = resolveDevRedirect(req.body.to);

        const mailOptions = {
            from: resolveFrom(),
            to: effectiveTo,
            subject,
            html,
        };

        if (req.body.replyTo) {
            mailOptions.replyTo = req.body.replyTo;
        }

        if (redirected) {
            mailOptions.headers = { 'X-Original-To': originalTo };
        }

        const project = process.env.APP_NAME || undefined;

        try {
            await sendMailWithRetry(mailOptions, 2);
            EmailLog.create({
                recipient: effectiveTo,
                subject,
                from: mailOptions.from,
                project,
                status: 'sent',
            }).catch(e => logger.error('[email_log] create error', e));
            return res.status(200).json(successMessage({ message: messages.success.send_mail }));
        } catch (error) {
            logger.error('[send-email] error', error);
            EmailLog.create({
                recipient: effectiveTo,
                subject,
                from: mailOptions.from,
                project,
                status: 'error',
                error_message: error?.message ?? String(error),
            }).catch(e => logger.error('[email_log] create error', e));
            return res.status(500).json(errorMessage({ message: messages.error.send_mail.service_error }));
        }
    })().catch((error) => {
        logger.error('[send-email] unexpected error', error);
        return res.status(500).json(errorMessage({ message: messages.generic.error }));
    });
});

if (ENABLE_MAILCHIMP) {
    router.post('/suscribe', [subscribeLimit], async (req, res) => {
        try {
            const normalizedEmail = String(req.body.email || '').trim().toLowerCase();
            if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
                return res.status(400).json(errorMessage({ message: messages.error.subscribe.invalid_email }));
            }
            const LIST_ID = CONFIG.MAILCHIMP.LIST_ID;
            try {
                const response = await mailchimp.lists.addListMember(LIST_ID, {
                    email_address: normalizedEmail,
                    status: 'subscribed',
                });
                if (response.error) {
                    const err = JSON.parse(response.error);
                    return res.status(400).json(errorMessage({ message: err.detail ?? messages.error.subscribe.error }));
                }
                return res.status(200).json(successMessage({ message: messages.success.subscribe }));
            } catch (error) {
                const errorDetail = error.response?.text ? JSON.parse(error.response.text) : null;
                const errorMsg = errorDetail?.title === 'Member Exists'
                    ? messages.error.subscribe.already_subscribed
                    : messages.error.subscribe.error;
                return res.status(error.status || 500).json(errorMessage({ message: errorMsg }));
            }
        } catch (error) {
            logger.error('[suscribe]', error);
            return res.status(500).json(errorMessage({ message: messages.generic.error }));
        }
    });

    router.get('/suscribers', [validateToken, adminPermission], async (req, res) => {
        try {
            const LIST_ID = CONFIG.MAILCHIMP.LIST_ID;
            const response = await mailchimp.lists.getListMembersInfo(LIST_ID);
            return res.status(200).json(successMessage({ message: messages.success.get_subscribers, extra: { data: response } }));
        } catch (error) {
            logger.error('[suscribers]', error);
            return res.status(500).json(errorMessage({ message: messages.error.get_subscribers.error }));
        }
    });
}

if (ENABLE_MAILERLITE) {
    router.post('/mailerlite/suscribe', [subscribeLimit], async (req, res) => {
        try {
            const normalizedEmail = String(req.body.email || '').trim().toLowerCase();
            if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
                return res.status(400).json(errorMessage({ message: messages.error.subscribe.invalid_email }));
            }
            const client = await getMailerLiteClient();
            if (!client) {
                return res.status(503).json(errorMessage({ message: 'MailerLite no disponible.' }));
            }
            const response = await client.subscribers.createOrUpdate({ email: normalizedEmail });
            if (response.data) {
                return res.status(200).json(successMessage({ message: messages.success.subscribe, extra: { data: response.data.data } }));
            }
            return res.status(500).json(errorMessage({ message: messages.generic.error }));
        } catch (error) {
            logger.error('[mailerlite/suscribe]', error);
            return res.status(500).json(errorMessage({
                message: error.response ? (error.response.data?.message ?? messages.generic.error) : error.message,
            }));
        }
    });

    router.get('/mailerlite/suscribers', [validateToken, adminPermission], async (req, res) => {
        try {
            const client = await getMailerLiteClient();
            if (!client) {
                return res.status(503).json(errorMessage({ message: 'MailerLite no disponible.' }));
            }
            const response = await client.subscribers.get({ limit: 100 });
            if (response.data) {
                return res.status(200).json(successMessage({ message: messages.success.get_subscribers, extra: { data: response.data.data } }));
            }
            return res.status(500).json(errorMessage({ message: messages.generic.error }));
        } catch (error) {
            logger.error('[mailerlite/suscribers]', error);
            return res.status(500).json(errorMessage({
                message: error.response ? (error.response.data?.message ?? messages.generic.error) : error.message,
            }));
        }
    });
}

if (ENABLE_CONTACT) {
    router.post('/contact', [contactLimit], async (req, res) => {
        try {
            const { nombre, email, empresa, telefono, mensaje } = req.body;
            if (!nombre || !email || !mensaje) {
                return res.status(400).json(errorMessage({ message: messages.error.contact.fields_empty }));
            }
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) {
                return res.status(400).json(errorMessage({ message: messages.generic.not_email('Email') }));
            }

            const destinatario = process.env.MAILER_CONTACT_EMAIL || process.env.MAILER_SALES_EMAIL;
            if (!destinatario) {
                logger.warn('[contact] MAILER_CONTACT_EMAIL y MAILER_SALES_EMAIL no configurados.');
                return res.status(500).json(errorMessage({ message: messages.error.contact.error }));
            }

            const nombreSafe = sanitizeText(String(nombre));
            const empresaSafe = empresa ? sanitizeText(String(empresa)) : '';
            const telefonoSafe = telefono ? sanitizeText(String(telefono)) : '';
            const mensajeSafe = sanitizeText(String(mensaje));
            const appName = process.env.APP_NAME || 'App';

            const htmlBody = `
                <h2 style="color:#333;font-family:sans-serif;">Nueva consulta desde ${appName}</h2>
                <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse;width:100%;">
                    <tr><td style="padding:6px 12px;color:#666;font-weight:bold;">Nombre</td><td style="padding:6px 12px;">${nombreSafe}</td></tr>
                    <tr><td style="padding:6px 12px;color:#666;font-weight:bold;">Email</td><td style="padding:6px 12px;"><a href="mailto:${email}">${email}</a></td></tr>
                    ${empresaSafe ? `<tr><td style="padding:6px 12px;color:#666;font-weight:bold;">Empresa</td><td style="padding:6px 12px;">${empresaSafe}</td></tr>` : ''}
                    ${telefonoSafe ? `<tr><td style="padding:6px 12px;color:#666;font-weight:bold;">Teléfono</td><td style="padding:6px 12px;">${telefonoSafe}</td></tr>` : ''}
                </table>
                <hr style="margin:16px 0;border:none;border-top:1px solid #eee;"/>
                <p style="font-family:sans-serif;font-size:14px;color:#333;">${mensajeSafe.replace(/\n/g, '<br/>')}</p>
            `;

            await sendMailWithRetry({
                from: resolveFrom(),
                to: destinatario,
                replyTo: email,
                subject: `Consulta web — ${nombreSafe}${empresaSafe ? ` (${empresaSafe})` : ''}`,
                html: htmlBody,
            }, 2);

            const project = process.env.APP_NAME || undefined;
            EmailLog.create({
                recipient: destinatario,
                subject: `Consulta web — ${nombreSafe}`,
                from: resolveFrom(),
                project,
                status: 'sent',
            }).catch(e => logger.error('[email_log] create error', e));

            return res.status(200).json(successMessage({ message: 'Mensaje enviado correctamente.' }));
        } catch (error) {
            logger.error('[contact]', error);
            return res.status(500).json(errorMessage({ message: messages.error.contact.error }));
        }
    });
}

if (ENABLE_TEMPLATES) {
    const { default: automationRouter } = await import('./automation.js');
    router.use('/automation', automationRouter);
}

export default router;
