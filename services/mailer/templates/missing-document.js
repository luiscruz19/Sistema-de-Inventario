import { baseLayout, getColors, getEnvVars } from './base-layout.js';
import { ctaButton } from './cta-button.js';

export function missingDocumentEmail({ name, documentName }) {
    const colors = getColors();
    const env = getEnvVars();
    const portalUrl = env.WEB_URL || '#';

    const content = `
        <h1 style="margin:0 0 24px 0;font-size:28px;color:${colors.primary};font-weight:700;">
            Documento Pendiente
        </h1>
        <p style="margin:0 0 16px 0;font-size:16px;color:${colors.darkGray};line-height:1.6;">
            Hola <strong>${name}</strong>, todav&iacute;a falta un documento necesario para avanzar con tu proceso.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;background-color:${colors.lightGray};border-left:4px solid ${colors.accent};">
            <tr>
                <td style="padding:24px;">
                    <span style="font-size:13px;color:${colors.gray};text-transform:uppercase;letter-spacing:1px;">Documento requerido</span><br/>
                    <span style="font-size:18px;color:${colors.darkGray};font-weight:700;">${documentName}</span>
                </td>
            </tr>
        </table>
        <p style="margin:0 0 16px 0;font-size:16px;color:${colors.darkGray};line-height:1.6;">
            Para continuar sin demoras, sub&iacute; el documento lo antes posible.
        </p>
        ${ctaButton('Subir documento', portalUrl)}
        <p style="margin:0;font-size:14px;color:${colors.gray};line-height:1.6;">
            Si ten&eacute;s dificultades, contact&aacute;nos y te ayudamos.
        </p>`;
    return baseLayout(content);
}
