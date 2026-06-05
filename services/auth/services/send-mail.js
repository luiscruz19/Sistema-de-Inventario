import CONFIG from '../config/config.js';
import connection from '../utils/connection.js';

const { MAILER_URL } = CONFIG;

export default async function sendMailService({ to, subject, content }) {
    if (!MAILER_URL) {
        console.warn('[mailer] MAILER_API_URL not configured — email not sent to:', to);
        return { status: 0, message: 'Mailer not configured' };
    }
    return connection({ method: 'POST', url: `${MAILER_URL}/send-email`, data: { to, subject, content } });
}
