import { baseLayout, getColors, getEnvVars } from './base-layout.js';
import { ctaButton } from './cta-button.js';

export function nextStepsEmail({ name, steps }) {
    const colors = getColors();
    const env = getEnvVars();
    const portalUrl = env.WEB_URL || '#';
    const supportEmail = env.SUPPORT_EMAIL || '';

    const stepsHtml = steps.map((step, index) => `
        <tr>
            <td style="padding:12px 0;${index < steps.length - 1 ? `border-bottom:1px solid ${colors.border};` : ''}">
                <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                    <td style="width:32px;vertical-align:top;">
                        <span style="display:inline-block;width:24px;height:24px;background-color:${colors.accent};color:${colors.darkGray};text-align:center;line-height:24px;font-size:13px;font-weight:700;">${index + 1}</span>
                    </td>
                    <td style="padding-left:12px;font-size:15px;color:${colors.darkGray};line-height:1.5;">
                        ${step}
                    </td>
                </tr></table>
            </td>
        </tr>`).join('');

    const content = `
        <h1 style="margin:0 0 24px 0;font-size:28px;color:${colors.primary};font-weight:700;">
            Pr&oacute;ximos Pasos
        </h1>
        <p style="margin:0 0 16px 0;font-size:16px;color:${colors.darkGray};line-height:1.6;">
            Hola <strong>${name}</strong>, te compartimos los pr&oacute;ximos pasos de tu proceso.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;">
            ${stepsHtml}
        </table>
        <p style="margin:0 0 16px 0;font-size:16px;color:${colors.darkGray};line-height:1.6;">
            Pod&eacute;s seguir tu progreso desde tu portal.
        </p>
        ${ctaButton('Ir a mi portal', portalUrl)}
        <p style="margin:0;font-size:14px;color:${colors.gray};line-height:1.6;">
            ${supportEmail ? `Ante cualquier consulta, escrib&iacute;nos a <a href="mailto:${supportEmail}" style="color:${colors.primary};">${supportEmail}</a>.` : ''}
        </p>`;
    return baseLayout(content);
}
