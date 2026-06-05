import { logger } from '../utils/logger.js';

const ENABLE_MAILERLITE = process.env.ENABLE_MAILERLITE === 'true';

let mailerliteClient = null;

async function createClient(apiKey) {
    const { default: MailerLite } = await import('@mailerlite/mailerlite-nodejs');
    return new MailerLite({ api_key: apiKey });
}

export async function getMailerLiteClient() {
    if (!ENABLE_MAILERLITE) return null;

    if (mailerliteClient) return mailerliteClient;

    const staticKey = process.env.MAILERLITE_API_KEY;
    if (staticKey) {
        mailerliteClient = await createClient(staticKey);
        logger.info('[mailerlite] Cliente inicializado con MAILERLITE_API_KEY.');
        return mailerliteClient;
    }

    const configUrl = process.env.CONFIG_API_URL;
    if (configUrl) {
        const { default: getRemoteConfig } = await import('./get-config.js');
        const remoteConfig = await getRemoteConfig();
        const dynamicKey = remoteConfig?.mailerlite_api_key || remoteConfig?.MAILERLITE_API_KEY;
        if (dynamicKey) {
            mailerliteClient = await createClient(dynamicKey);
            logger.info('[mailerlite] Cliente inicializado con key dinámica desde CONFIG_API_URL.');
            return mailerliteClient;
        }
        logger.warn('[mailerlite] CONFIG_API_URL disponible pero no retornó mailerlite_api_key.');
    }

    logger.warn('[mailerlite] ENABLE_MAILERLITE=true pero no hay MAILERLITE_API_KEY ni CONFIG_API_URL.');
    return null;
}

export default { getMailerLiteClient };
