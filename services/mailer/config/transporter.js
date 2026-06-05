import nodemailer from 'nodemailer';
import CONFIG from './config.js';

const { MAILER: { USER, PASSWORD, SMTP_HOST, SMTP_PORT, SMTP_SECURE } } = CONFIG;

export default nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: SMTP_SECURE,
    auth: {
        user: USER,
        pass: PASSWORD,
    },
});
