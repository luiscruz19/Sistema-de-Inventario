import { baseLayout, getColors, getEnvVars } from './base-layout.js';
import { ctaButton } from './cta-button.js';

export function stageAdvanceEmail({ name, newStage }) {
    const colors = getColors();
    const env = getEnvVars();
    const portalUrl = env.WEB_URL || '#';

    const content = `
        <h1 style="margin:0 0 24px 0;font-size:28px;color:${colors.primary};font-weight:700;">
            &iexcl;Avanzaste de Etapa!
        </h1>
        <p style="margin:0 0 16px 0;font-size:16px;color:${colors.darkGray};line-height:1.6;">
            Hola <strong>${name}</strong>, &iexcl;tenemos buenas noticias! Tu proceso avanz&oacute; a una nueva etapa.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;background-color:${colors.lightGray};border-left:4px solid ${colors.accent};">
            <tr>
                <td style="padding:24px;text-align:center;">
                    <span style="font-size:13px;color:${colors.gray};text-transform:uppercase;letter-spacing:1px;">Nueva etapa</span><br/>
                    <span style="font-size:24px;color:${colors.primary};font-weight:700;">${newStage}</span>
                </td>
            </tr>
        </table>
        <p style="margin:0 0 16px 0;font-size:16px;color:${colors.darkGray};line-height:1.6;">
            Ingres&aacute; a tu portal para ver los detalles de esta etapa y los pr&oacute;ximos pasos.
        </p>
        ${ctaButton('Ver mi progreso', portalUrl)}
        <p style="margin:0;font-size:14px;color:${colors.gray};line-height:1.6;">
            Tu asesor estar&aacute; en contacto para guiarte en esta nueva etapa. &iexcl;Seguimos avanzando juntos!
        </p>`;
    return baseLayout(content);
}
