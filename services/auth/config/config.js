import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';

// In production, critical vars must be present
if (isProduction) {
    const required = ['SECRET_KEY', 'DB_HOST_AUTH', 'DB_USER_AUTH', 'DB_ROOT_PASSWORD_AUTH', 'DB_NAME_AUTH'];
    for (const key of required) {
        if (!process.env[key]) {
            console.error(`[config] Missing required env var in production: ${key}`);
            process.exit(1);
        }
    }
}

const CONFIG = {
    AUTHORIZATION: {
        USER: process.env.AUTH_BASIC_USER || 'auth',
        PASSWORD: process.env.AUTH_BASIC_PW || 'secret',
    },
    DATABASE: {
        HOST: process.env.DB_HOST_AUTH || 'localhost',
        USER: process.env.DB_USER_AUTH || 'root',
        PASSWORD: process.env.DB_ROOT_PASSWORD_AUTH || '',
        NAME: process.env.DB_NAME_AUTH || 'app_auth',
        PORT: process.env.DB_PORT_AUTH || 3306,
        DIALECT: process.env.DB_DIALECT_AUTH || 'mysql',
    },
    MAILER: {
        USER: process.env.MAILER_USER || '',
        PASSWORD: process.env.MAILER_PASSWORD || '',
        SMTP_HOST: process.env.MAILER_SMTP_HOST || '',
        SMTP_PORT: process.env.MAILER_SMTP_PORT || 587,
        SMTP_SECURE:
            process.env.MAILER_SMTP_SECURE === 'yes' ||
            process.env.MAILER_SMTP_SECURE === 'true' ||
            process.env.MAILER_SMTP_SECURE === '1',
        FROM_NAME: process.env.MAILER_FROM_NAME || process.env.APP_NAME || 'App',
        FROM_EMAIL: process.env.MAILER_FROM_EMAIL || process.env.MAILER_USER || '',
    },
    MICROSERVICES_URL: {
        USUARIOS: process.env.USUARIOS_API_URL || '',
    },
    WEB_URL: process.env.WEB_URL || 'http://localhost:3000',
    LOGO_URL: process.env.LOGO_URL || '',
    APP_NAME: process.env.APP_NAME || 'App',
    PORT: process.env.AUTH_PORT || 80,
    SECRET_KEY: process.env.SECRET_KEY || (isProduction ? '' : 'dev-secret-change-in-production'),
    CRON_SECRET: process.env.CRON_SECRET || '',
    SESSION_TIMEOUT: Number(process.env.SESSION_TIMEOUT || 1000 * 60 * 60 * 8),
    LOGIN_MAX_ATTEMPTS: Number(process.env.LOGIN_MAX_ATTEMPTS || 5),
    LOGIN_BLOCK_WINDOW_MS: Number(process.env.LOGIN_BLOCK_WINDOW_MS || 15 * 60 * 1000),
    DB_AUTOCREATE: process.env.DB_AUTOCREATE === 'true',
    AUTH_USE_JWT_LINKS: process.env.AUTH_USE_JWT_LINKS === 'true',
};

export default CONFIG;
