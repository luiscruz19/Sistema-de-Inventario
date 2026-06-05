import nodemailer from 'nodemailer';
import CONFIG from '../config/config.js';
import logger from '../utils/logger.js';

const { MAILER } = CONFIG;

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;
    if (!MAILER.SMTP_HOST || !MAILER.USER) return null;
    transporter = nodemailer.createTransport({
        host: MAILER.SMTP_HOST,
        port: Number(MAILER.SMTP_PORT) || 587,
        secure: MAILER.SMTP_SECURE,
        auth: {
            user: MAILER.USER,
            pass: MAILER.PASSWORD,
        },
    });
    return transporter;
}

function resolveFrom() {
    const name = MAILER.FROM_NAME || 'App';
    const email = MAILER.FROM_EMAIL || MAILER.USER;
    return `${name} <${email}>`;
}

export default async function sendMailService({ to, subject, content }) {
    const tx = getTransporter();
    if (!tx) {
        logger.warn('[mailer] SMTP no configurado — email no enviado a: ' + to);
        return { status: 0, message: 'Mailer not configured' };
    }
    try {
        await tx.sendMail({ from: resolveFrom(), to, subject, html: content });
        return { status: 1, message: 'Email enviado' };
    } catch (error) {
        logger.error('sendMailService', { error: error?.message });
        return { status: 0, message: 'Error al enviar el email' };
    }
}
