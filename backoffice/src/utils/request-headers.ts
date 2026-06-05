/**
 * Construye headers para requests desde el cliente (browser) hacia las API routes del backoffice.
 */
export function getRequestHeaders(token?: string): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers.token = token;
    }

    return headers;
}
