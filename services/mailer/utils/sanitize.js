import sanitizeHtml from 'sanitize-html';

// Sanitizado pensado para EMAIL HTML completo (no para user-generated content).
// El endpoint /send-email es interno (Basic Auth) y recibe plantillas controladas por
// los microservicios. Por eso se preserva la estructura de email (html/head/body/link),
// los estilos inline (incluido `background: linear-gradient`) y los atributos de tabla
// (bgcolor/align/valign), imprescindibles para que el correo se renderice como fue
// diseñado. La seguridad se mantiene: NO se permiten script/iframe/object/embed/form ni
// manejadores de eventos (on*), porque no están en las listas de permitidos.
export function sanitizeEmailHtml(dirty) {
    return sanitizeHtml(dirty, {
        allowedTags: [
            'html', 'head', 'body', 'meta', 'title', 'link', 'center', 'font',
            'p', 'br', 'b', 'i', 'strong', 'em', 'u', 's', 'a', 'img',
            'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'ul', 'ol', 'li',
            'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'col', 'colgroup',
            'span', 'div', 'blockquote', 'hr', 'pre', 'code',
        ],
        allowedAttributes: {
            a: ['href', 'target', 'style', 'class'],
            img: ['src', 'alt', 'width', 'height', 'style', 'class'],
            link: ['href', 'rel', 'type'],
            meta: ['charset', 'name', 'content'],
            font: ['color', 'face', 'size', 'style'],
            table: ['width', 'height', 'cellpadding', 'cellspacing', 'border', 'bgcolor', 'align', 'role', 'style', 'class'],
            td: ['width', 'height', 'bgcolor', 'align', 'valign', 'colspan', 'rowspan', 'style', 'class'],
            th: ['width', 'height', 'bgcolor', 'align', 'valign', 'colspan', 'rowspan', 'style', 'class'],
            tr: ['bgcolor', 'align', 'valign', 'style', 'class'],
            '*': ['style', 'class'],
        },
        allowedSchemes: ['http', 'https', 'mailto', 'tel'],
        // Sin `allowedStyles`: no se filtran los estilos inline, así se preservan
        // background/linear-gradient, border-top/bottom, line-height, etc.
        disallowedTagsMode: 'discard',
    });
}

export function sanitizeText(value) {
    if (typeof value !== 'string') return '';
    return sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} });
}
