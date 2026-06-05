export default (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        return next();
    }

    const SENSITIVE_FIELDS = ['password', 'token', 'authorization', 'secret', 'mercadopagoaccesstoken', 'cbu', 'cuit'];

    const sanitizeValue = (value) => {
        if (Array.isArray(value)) return value.map(sanitizeValue);
        if (!value || typeof value !== 'object') return value;
        return Object.entries(value).reduce((acc, [key, current]) => {
            acc[key] = SENSITIVE_FIELDS.some(f => key.toLowerCase().includes(f)) ? '[REDACTED]' : sanitizeValue(current);
            return acc;
        }, {});
    };

    const { path, body, query, params, method, headers, protocol, hostname, originalUrl, baseUrl } = req;

    const timestamp = new Date();
    const horaFormateada = timestamp.toLocaleString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });

    const origen = headers.origin || headers.referer || 'Origen desconocido';
    const ip = req.ip || req.connection?.remoteAddress || headers['x-forwarded-for'] || 'IP desconocida';
    const userAgent = headers['user-agent'] || 'User-Agent desconocido';
    const host = headers.host || 'Host desconocido';
    const contentType = headers['content-type'] || 'No especificado';
    const acceptLanguage = headers['accept-language'] || 'No especificado';
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
    console.info('   Idioma:', acceptLanguage);
    console.info('AUTENTICACION Y SEGURIDAD:');
    console.info('   Authorization:', authorization);
    console.info('   Content-Type:', contentType);
    console.info('   Cookies:', headers.cookie ? 'Presentes' : 'No presentes');
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
            const safe = sanitizeValue(value);
            const display = typeof safe === 'object' ? JSON.stringify(safe, null, 2).replace(/\n/g, '\n         ') : safe;
            console.info(`      ${key}: ${display}`);
        });
    } else {
        console.info('   Body: (vacío)');
    }

    console.info('HEADERS PERSONALIZADOS:');
    const customHeaders = Object.entries(headers)
        .filter(([key]) => !['host', 'user-agent', 'accept-language', 'authorization', 'content-type', 'cookie', 'origin', 'referer'].includes(key))
        .filter(([key]) => !key.startsWith('sec-') && !key.startsWith('accept'));

    if (customHeaders.length > 0) {
        customHeaders.forEach(([key, value]) => console.info(`   ${key}: ${value}`));
    } else {
        console.info('   (Ninguno)');
    }


    const originalSend = res.send;
    const originalJson = res.json;
    const startTime = Date.now();

    const interceptResponse = function (data) {
        const duration = Date.now() - startTime;
        const horaRespuesta = new Date().toLocaleString('es-AR', {
            timeZone: 'America/Argentina/Buenos_Aires',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
        });

        console.info('RESPUESTA ENVIADA - ' + horaRespuesta);
        console.info('INFORMACION DE RESPUESTA:');
        console.info('   Status Code:', res.statusCode);
        console.info('   Duración:', duration + 'ms');
        console.info('   Content-Type:', res.get('Content-Type') || 'No especificado');
        console.info('DATOS DE RESPUESTA:');

        try {
            let responseData = data;
            if (typeof data === 'string') {
                try { responseData = JSON.parse(data); } catch { responseData = data; }
            }
            if (typeof responseData === 'object' && responseData !== null) {
                console.info('   Contenido:');
                const formatted = JSON.stringify(responseData, null, 2).split('\n').map(l => '      ' + l).join('\n');
                console.info(formatted);
            } else {
                console.info('   Contenido:', responseData);
            }
            const responseSize = Buffer.byteLength(typeof data === 'string' ? data : JSON.stringify(data));
            console.info('   Tamaño:', formatBytes(responseSize));
        } catch {
            console.info('   (Error al parsear respuesta)');
        }

        console.info('PETICION COMPLETADA - Duración total: ' + duration + 'ms');

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

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
