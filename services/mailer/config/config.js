import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
    const required = ['AUTH_BASIC_USER', 'AUTH_BASIC_PW', 'MAILER_USER', 'MAILER_SMTP_HOST'];
    for (const key of required) {
        if (!process.env[key]) {
            console.error(`[config] Missing required env var in production: ${key}`);
            process.exit(1);
        }
    }
}

const CONFIG = {
    AUTHORIZATION: {
        USER: process.env.AUTH_BASIC_USER,
        PASSWORD: process.env.AUTH_BASIC_PW,
    },
    PORT: process.env.MAILER_PORT || 80,
    MAILER: {
        USER: process.env.MAILER_USER,
        PASSWORD: process.env.MAILER_PASSWORD,
        SMTP_HOST: process.env.MAILER_SMTP_HOST || process.env.MAILER_SMPT_HOST,
        SMTP_PORT: process.env.MAILER_SMTP_PORT,
        SMTP_SECURE:
            process.env.MAILER_SMTP_SECURE === 'yes' ||
            process.env.MAILER_SMTP_SECURE === 'true' ||
            process.env.MAILER_SMTP_SECURE === '1',
        FROM_NAME: process.env.MAILER_FROM_NAME || process.env.APP_NAME || 'App',
        FROM_EMAIL: process.env.MAILER_FROM_EMAIL || process.env.MAILER_USER,
    },
    DATABASE: {
        HOST: process.env.DB_HOST_MAILER || process.env.DB_HOST,
        USER: process.env.DB_USER_MAILER || process.env.DB_USER,
        PASSWORD: process.env.DB_ROOT_PASSWORD_MAILER || process.env.DB_ROOT_PASSWORD,
        NAME: process.env.DB_NAME_MAILER || process.env.DB_NAME,
        PORT: Number(process.env.DB_PORT_MAILER || process.env.DB_PORT || 3306),
        DIALECT: process.env.DB_DIALECT_MAILER || process.env.DB_DIALECT || 'mysql',
    },
    MAILCHIMP: {
        API_KEY: process.env.MAILCHIMP_API_KEY,
        LIST_ID: process.env.MAILCHIMP_LIST_ID,
        SERVER: process.env.MAILCHIMP_SERVER,
    },
    MAILERLITE: {
        API_KEY: process.env.MAILERLITE_API_KEY,
    },
    SECRET_KEY: process.env.SECRET_KEY || 'token',
    AUTH_API_URL: process.env.AUTH_API_URL,
    MICROSERVICES_URL: {
        CONFIG: process.env.CONFIG_API_URL,
    },
};

export default CONFIG;
