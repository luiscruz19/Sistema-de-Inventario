import mailchimp from '@mailchimp/mailchimp_marketing';
import CONFIG from '../config/config.js';
import { logger } from '../utils/logger.js';

const { MAILCHIMP: { API_KEY, SERVER } } = CONFIG;

const ENABLE_MAILCHIMP = process.env.ENABLE_MAILCHIMP === 'true';

if (ENABLE_MAILCHIMP) {
    if (!API_KEY || !SERVER) {
        logger.warn('[mailchimp] ENABLE_MAILCHIMP=true pero faltan MAILCHIMP_API_KEY o MAILCHIMP_SERVER.');
    } else {
        mailchimp.setConfig({ apiKey: API_KEY, server: SERVER });
        logger.info('[mailchimp] Cliente inicializado.');
    }
}

export default mailchimp;
