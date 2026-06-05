const REDACTED_KEYS = ['accesskey', 'secretkey', 'password', 'authorization', 'token', 'secret'];
const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const SERVICE = 'mailer';
const isProduction = process.env.NODE_ENV === 'production';
const minLevel = LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ?? (isProduction ? LEVELS.info : LEVELS.debug);

function redactSensitive(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(redactSensitive);
    return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => {
            if (REDACTED_KEYS.some(r => k.toLowerCase().includes(r))) return [k, '[REDACTED]'];
            return [k, redactSensitive(v)];
        })
    );
}

function emit(level, message, meta) {
    if (LEVELS[level] < minLevel) return;
    const safeMeta = (meta !== undefined && typeof meta === 'object') ? redactSensitive(meta) : meta;

    if (isProduction) {
        const entry = { ts: new Date().toISOString(), level: level.toUpperCase(), service: SERVICE, msg: message };
        if (safeMeta !== undefined) {
            if (typeof safeMeta === 'object') Object.assign(entry, safeMeta);
            else entry.meta = safeMeta;
        }
        process.stdout.write(JSON.stringify(entry) + '\n');
    } else {
        const tag = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;
        const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : level === 'debug' ? console.debug : console.info;
        safeMeta !== undefined ? fn(tag, message, safeMeta) : fn(tag, message);
    }
}

export const logger = {
    debug(message, meta) { emit('debug', message, meta); },
    info(message, meta)  { emit('info',  message, meta); },
    warn(message, meta)  { emit('warn',  message, meta); },
    error(message, meta) { emit('error', message, meta); },
};

export default logger;
