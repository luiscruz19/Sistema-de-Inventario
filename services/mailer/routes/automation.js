import { Router } from 'express';
import transporter from '../config/transporter.js';
import { errorMessage, successMessage } from '../utils/messages.js';
import messages from '../config/messages.js';
import CONFIG from '../config/config.js';
import { logger } from '../utils/logger.js';
import EmailLog from '../models/EmailLog.js';
import {
    welcomeEmail,
    paymentReminderEmail,
    missingDocumentEmail,
    documentStatusEmail,
    stageAdvanceEmail,
    nextStepsEmail,
    newRegistrationEmail,
    adminNotificationEmail,
} from '../templates/index.js';

const { MAILER: { FROM_NAME, FROM_EMAIL, USER } } = CONFIG;
const NODE_ENV = process.env.NODE_ENV || 'development';

function resolveFrom() {
    const name = FROM_NAME || process.env.APP_NAME || 'App';
    const email = FROM_EMAIL || USER;
    return `${name} <${email}>`;
}

function resolveDevRedirect(originalTo) {
    if (NODE_ENV === 'production') return { to: originalTo, redirected: false };
    const redirect = process.env.MAILER_DEV_REDIRECT_EMAIL;
    if (redirect) return { to: redirect, redirected: true, originalTo };
    return { to: originalTo, redirected: false };
}

const sendMailAsync = (mailOptions) => {
    return new Promise((resolve, reject) => {
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) reject(error);
            else resolve(info);
        });
    });
};

const project = process.env.APP_NAME || undefined;

const router = Router();

router.post('/welcome', async (req, res) => {
    try {
        const { email, name } = req.body;
        if (!email || !name) {
            return res.status(400).json(errorMessage({ message: messages.generic.fields_empty }));
        }
        const appName = process.env.APP_NAME || 'App';
        const html = welcomeEmail({ name });
        const { to: effectiveTo, redirected, originalTo } = resolveDevRedirect(email);
        const mailOptions = {
            from: resolveFrom(),
            to: effectiveTo,
            subject: `¡Bienvenido/a a ${appName}!`,
            html,
            ...(redirected ? { headers: { 'X-Original-To': originalTo } } : {}),
        };
        await sendMailAsync(mailOptions);
        EmailLog.create({ recipient: effectiveTo, subject: mailOptions.subject, from: mailOptions.from, project, status: 'sent' })
            .catch(e => logger.error('[email_log]', e));
        return res.status(200).json(successMessage({ message: messages.success.send_mail }));
    } catch (error) {
        logger.error('[automation/welcome]', error);
        return res.status(500).json(errorMessage({ message: messages.error.send_mail.service_error }));
    }
});

router.post('/payment-reminder', async (req, res) => {
    try {
        const { email, name, amount, dueDate, concept } = req.body;
        if (!email || !name || !amount || !dueDate || !concept) {
            return res.status(400).json(errorMessage({ message: messages.generic.fields_empty }));
        }
        const appName = process.env.APP_NAME || 'App';
        const html = paymentReminderEmail({ name, amount, dueDate, concept });
        const { to: effectiveTo, redirected, originalTo } = resolveDevRedirect(email);
        const mailOptions = {
            from: resolveFrom(),
            to: effectiveTo,
            subject: `Recordatorio de pago - ${appName}`,
            html,
            ...(redirected ? { headers: { 'X-Original-To': originalTo } } : {}),
        };
        await sendMailAsync(mailOptions);
        EmailLog.create({ recipient: effectiveTo, subject: mailOptions.subject, from: mailOptions.from, project, status: 'sent' })
            .catch(e => logger.error('[email_log]', e));
        return res.status(200).json(successMessage({ message: messages.success.send_mail }));
    } catch (error) {
        logger.error('[automation/payment-reminder]', error);
        return res.status(500).json(errorMessage({ message: messages.error.send_mail.service_error }));
    }
});

router.post('/missing-document', async (req, res) => {
    try {
        const { email, name, documentName } = req.body;
        if (!email || !name || !documentName) {
            return res.status(400).json(errorMessage({ message: messages.generic.fields_empty }));
        }
        const appName = process.env.APP_NAME || 'App';
        const html = missingDocumentEmail({ name, documentName });
        const { to: effectiveTo, redirected, originalTo } = resolveDevRedirect(email);
        const mailOptions = {
            from: resolveFrom(),
            to: effectiveTo,
            subject: `Documento pendiente - ${appName}`,
            html,
            ...(redirected ? { headers: { 'X-Original-To': originalTo } } : {}),
        };
        await sendMailAsync(mailOptions);
        EmailLog.create({ recipient: effectiveTo, subject: mailOptions.subject, from: mailOptions.from, project, status: 'sent' })
            .catch(e => logger.error('[email_log]', e));
        return res.status(200).json(successMessage({ message: messages.success.send_mail }));
    } catch (error) {
        logger.error('[automation/missing-document]', error);
        return res.status(500).json(errorMessage({ message: messages.error.send_mail.service_error }));
    }
});

router.post('/document-status', async (req, res) => {
    try {
        const { email, name, documentName, status, reason } = req.body;
        if (!email || !name || !documentName || !status) {
            return res.status(400).json(errorMessage({ message: messages.generic.fields_empty }));
        }
        const appName = process.env.APP_NAME || 'App';
        const isApproved = status === 'approved' || status === 'aprobado';
        const html = documentStatusEmail({ name, documentName, status, reason: reason || '' });
        const { to: effectiveTo, redirected, originalTo } = resolveDevRedirect(email);
        const mailOptions = {
            from: resolveFrom(),
            to: effectiveTo,
            subject: `Documento ${isApproved ? 'aprobado' : 'rechazado'} - ${appName}`,
            html,
            ...(redirected ? { headers: { 'X-Original-To': originalTo } } : {}),
        };
        await sendMailAsync(mailOptions);
        EmailLog.create({ recipient: effectiveTo, subject: mailOptions.subject, from: mailOptions.from, project, status: 'sent' })
            .catch(e => logger.error('[email_log]', e));
        return res.status(200).json(successMessage({ message: messages.success.send_mail }));
    } catch (error) {
        logger.error('[automation/document-status]', error);
        return res.status(500).json(errorMessage({ message: messages.error.send_mail.service_error }));
    }
});

router.post('/stage-advance', async (req, res) => {
    try {
        const { email, name, newStage } = req.body;
        if (!email || !name || !newStage) {
            return res.status(400).json(errorMessage({ message: messages.generic.fields_empty }));
        }
        const appName = process.env.APP_NAME || 'App';
        const html = stageAdvanceEmail({ name, newStage });
        const { to: effectiveTo, redirected, originalTo } = resolveDevRedirect(email);
        const mailOptions = {
            from: resolveFrom(),
            to: effectiveTo,
            subject: `¡Avanzaste de etapa! - ${appName}`,
            html,
            ...(redirected ? { headers: { 'X-Original-To': originalTo } } : {}),
        };
        await sendMailAsync(mailOptions);
        EmailLog.create({ recipient: effectiveTo, subject: mailOptions.subject, from: mailOptions.from, project, status: 'sent' })
            .catch(e => logger.error('[email_log]', e));
        return res.status(200).json(successMessage({ message: messages.success.send_mail }));
    } catch (error) {
        logger.error('[automation/stage-advance]', error);
        return res.status(500).json(errorMessage({ message: messages.error.send_mail.service_error }));
    }
});

router.post('/next-steps', async (req, res) => {
    try {
        const { email, name, steps } = req.body;
        if (!email || !name || !Array.isArray(steps) || steps.length === 0) {
            return res.status(400).json(errorMessage({ message: messages.generic.fields_empty }));
        }
        const appName = process.env.APP_NAME || 'App';
        const html = nextStepsEmail({ name, steps });
        const { to: effectiveTo, redirected, originalTo } = resolveDevRedirect(email);
        const mailOptions = {
            from: resolveFrom(),
            to: effectiveTo,
            subject: `Próximos pasos - ${appName}`,
            html,
            ...(redirected ? { headers: { 'X-Original-To': originalTo } } : {}),
        };
        await sendMailAsync(mailOptions);
        EmailLog.create({ recipient: effectiveTo, subject: mailOptions.subject, from: mailOptions.from, project, status: 'sent' })
            .catch(e => logger.error('[email_log]', e));
        return res.status(200).json(successMessage({ message: messages.success.send_mail }));
    } catch (error) {
        logger.error('[automation/next-steps]', error);
        return res.status(500).json(errorMessage({ message: messages.error.send_mail.service_error }));
    }
});

router.post('/new-registration', async (req, res) => {
    try {
        const { alumno_name, alumno_email, referral_code, recipient_emails } = req.body;
        if (!alumno_name || !alumno_email || !Array.isArray(recipient_emails) || recipient_emails.length === 0) {
            return res.status(400).json(errorMessage({ message: messages.generic.fields_empty }));
        }
        const appName = process.env.APP_NAME || 'App';
        const backoffice_url = process.env.PROJECT_WEB_URL
            ? `${process.env.PROJECT_WEB_URL}/backoffice`
            : (process.env.WEB_URL ? `${process.env.WEB_URL}/backoffice` : '#');
        const html = newRegistrationEmail({ alumno_name, alumno_email, referral_code, backoffice_url });

        const sendPromises = recipient_emails.map(async (email) => {
            const { to: effectiveTo, redirected, originalTo } = resolveDevRedirect(email);
            const mailOptions = {
                from: resolveFrom(),
                to: effectiveTo,
                subject: `Nuevo alumno registrado - ${appName}`,
                html,
                ...(redirected ? { headers: { 'X-Original-To': originalTo } } : {}),
            };
            try {
                await sendMailAsync(mailOptions);
                EmailLog.create({ recipient: effectiveTo, subject: mailOptions.subject, from: mailOptions.from, project, status: 'sent' })
                    .catch(e => logger.error('[email_log]', e));
                return { email, success: true };
            } catch (error) {
                logger.error('[automation/new-registration] error sending to', email, error);
                EmailLog.create({ recipient: effectiveTo, subject: mailOptions.subject, from: mailOptions.from, project, status: 'error', error_message: error?.message })
                    .catch(e => logger.error('[email_log]', e));
                return { email, success: false };
            }
        });

        const results = await Promise.all(sendPromises);
        return res.status(200).json(successMessage({ message: messages.success.send_mail, extra: { results } }));
    } catch (error) {
        logger.error('[automation/new-registration]', error);
        return res.status(500).json(errorMessage({ message: messages.generic.error }));
    }
});

router.post('/admin-notification', async (req, res) => {
    try {
        const { title, alumno_name, detail, detail_label, recipient_emails } = req.body;
        if (!title || !alumno_name || !detail || !Array.isArray(recipient_emails) || recipient_emails.length === 0) {
            return res.status(400).json(errorMessage({ message: messages.generic.fields_empty }));
        }
        const backoffice_url = process.env.PROJECT_WEB_URL
            ? `${process.env.PROJECT_WEB_URL}/backoffice`
            : (process.env.WEB_URL ? `${process.env.WEB_URL}/backoffice` : '#');
        const html = adminNotificationEmail({ title, alumno_name, detail, detail_label, backoffice_url });

        const sendPromises = recipient_emails.map(async (email) => {
            const { to: effectiveTo, redirected, originalTo } = resolveDevRedirect(email);
            const mailOptions = {
                from: resolveFrom(),
                to: effectiveTo,
                subject: `${title} - ${process.env.APP_NAME || 'App'}`,
                html,
                ...(redirected ? { headers: { 'X-Original-To': originalTo } } : {}),
            };
            try {
                await sendMailAsync(mailOptions);
                EmailLog.create({ recipient: effectiveTo, subject: mailOptions.subject, from: mailOptions.from, project, status: 'sent' })
                    .catch(e => logger.error('[email_log]', e));
                return { email, success: true };
            } catch (error) {
                logger.error('[automation/admin-notification] error sending to', email, error);
                EmailLog.create({ recipient: effectiveTo, subject: mailOptions.subject, from: mailOptions.from, project, status: 'error', error_message: error?.message })
                    .catch(e => logger.error('[email_log]', e));
                return { email, success: false };
            }
        });

        const results = await Promise.all(sendPromises);
        return res.status(200).json(successMessage({ message: messages.success.send_mail, extra: { results } }));
    } catch (error) {
        logger.error('[automation/admin-notification]', error);
        return res.status(500).json(errorMessage({ message: messages.generic.error }));
    }
});

export default router;
