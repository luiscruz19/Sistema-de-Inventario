import { baseLayout, getColors, getEnvVars } from './base-layout.js';
import { ctaButton } from './cta-button.js';

export function adminNotificationEmail({ title, alumno_name, detail, detail_label, backoffice_url }) {
    const colors = getColors();
    const env = getEnvVars();
    const resolvedUrl = backoffice_url || `${env.WEB_URL}/backoffice` || '#';

    const content = `
        <h1 style="margin:0 0 24px 0;font-size:28px;color:${colors.primary};font-weight:700;">
            ${title}
        </h1>
        <p style="margin:0 0 16px 0;font-size:16px;color:${colors.darkGray};line-height:1.6;">
            El alumno <strong>${alumno_name}</strong> realiz&oacute; una acci&oacute;n que requiere tu atenci&oacute;n.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;background-color:${colors.lightGray};border-left:4px solid ${colors.accent};">
            <tr>
                <td style="padding:24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td style="padding:8px 0;">
                                <span style="font-size:13px;color:${colors.gray};text-transform:uppercase;letter-spacing:1px;">Alumno</span><br/>
                                <span style="font-size:16px;color:${colors.darkGray};font-weight:600;">${alumno_name}</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;">
                                <span style="font-size:13px;color:${colors.gray};text-transform:uppercase;letter-spacing:1px;">${detail_label || 'Detalle'}</span><br/>
                                <span style="font-size:16px;color:${colors.darkGray};font-weight:600;">${detail}</span>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        ${ctaButton('Ver en Backoffice', resolvedUrl)}`;
    return baseLayout(content);
}
