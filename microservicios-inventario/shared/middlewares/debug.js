export default (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        return next();
    }

    const SENSITIVE_FIELDS = ['password', 'token', 'authorization', 'secret', 'api_key', 'access_token', 'webhook_secret'];
    const sanitizeValue = (value) => {
        if (Array.isArray(value)) {
            return value.map((item) => sanitizeValue(item));
        }

        if (!value || typeof value !== 'object') {
            return value;
        }

        return Object.entries(value).reduce((acc, [key, current]) => {
            const isSensitive = SENSITIVE_FIELDS.some((field) => key.toLowerCase().includes(field));
            acc[key] = isSensitive ? '[REDACTED]' : sanitizeValue(current);
            return acc;
        }, {});
    };

    const { path, body, query, params, method, headers, protocol, hostname, originalUrl, baseUrl } = req;

    const timestamp = new Date();
    const horaFormateada = timestamp.toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    const origen = headers.origin || headers.referer || 'Origen desconocido';
    const ip = req.ip || req.connection?.remoteAddress || headers['x-forwarded-for'] || 'IP desconocida';
    const userAgent = headers['user-agent'] || 'User-Agent desconocido';
    const host = headers.host || 'Host desconocido';
    const contentType = headers['content-type'] || 'No especificado';
    const authorization = headers.authorization ? 'Presente (Bearer/Token)' : 'No presente';

    const fullUrl = `${protocol}://${hostname}${originalUrl}`;

    console.info('PETICION ENTRANTE - ' + horaFormateada);

    console.info('INFORMACION GENERAL:');
    console.info('   Método HTTP:', method);
    console.info('   URL Completa:', fullUrl);
    console.info('   Path:', path);
    console.info('   Base URL:', baseUrl || '/');
    console.info('   Original URL:', originalUrl);

    console.info('ORIGEN Y CLIENTE:');
    console.info('   Origen:', origen);
    console.info('   IP Cliente:', ip);
    console.info('   Host:', host);
    console.info('   User-Agent:', userAgent);

    console.info('AUTENTICACION Y SEGURIDAD:');
    console.info('   Authorization:', authorization);
    console.info('   Content-Type:', contentType);

    console.info('DATOS DE ENTRADA:');

    if (params && Object.keys(params).length > 0) {
        console.info('   Params (Ruta):');
        Object.entries(params).forEach(([key, value]) => {
            console.info(`      ${key}: ${JSON.stringify(sanitizeValue(value))}`);
        });
    } else {
        console.info('   Params: (vacío)');
    }

    if (query && Object.keys(query).length > 0) {
        console.info('   Query (URL):');
        Object.entries(query).forEach(([key, value]) => {
            console.info(`      ${key}: ${JSON.stringify(sanitizeValue(value))}`);
        });
    } else {
        console.info('   Query: (vacío)');
    }

    if (body && Object.keys(body).length > 0) {
        console.info('   Body (Cuerpo):');
        Object.entries(body).forEach(([key, value]) => {
            const safeBodyValue = sanitizeValue(value);
            const displayValue = typeof safeBodyValue === 'object' ? JSON.stringify(safeBodyValue, null, 2).replace(/\n/g, '\n         ') : safeBodyValue;
            console.info(`      ${key}: ${displayValue}`);
        });
    } else {
        console.info('   Body: (vacío)');
    }


    const originalSend = res.send;
    const originalJson = res.json;
    const startTime = Date.now();

    const interceptResponse = function (data) {
        const duration = Date.now() - startTime;
        const horaRespuesta = new Date().toLocaleString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        console.info('RESPUESTA ENVIADA - ' + horaRespuesta);

        console.info('INFORMACION DE RESPUESTA:');
        console.info('   Status Code:', res.statusCode);
        console.info('   Duración:', duration + 'ms');


        return data;
    };

    res.send = function (data) {
        interceptResponse(data);
        return originalSend.call(this, data);
    };

    res.json = function (data) {
        interceptResponse(data);
        return originalJson.call(this, data);
    };

    next();
};
