import { baseLayout, getColors, getEnvVars } from './base-layout.js';
import { ctaButton } from './cta-button.js';

export function newRegistrationEmail({ alumno_name, alumno_email, referral_code, backoffice_url }) {
    const colors = getColors();
    const env = getEnvVars();
    const resolvedUrl = backoffice_url || `${env.WEB_URL}/backoffice` || '#';

    const referralRow = referral_code ? `
        <tr>
            <td style="padding:8px 0;">
                <span style="font-size:13px;color:${colors.gray};text-transform:uppercase;letter-spacing:1px;">C&oacute;digo de referido</span><br/>
                <span style="font-size:16px;color:${colors.darkGray};font-weight:600;">${referral_code}</span>
            </td>
        </tr>` : '';

    const content = `
        <h1 style="margin:0 0 24px 0;font-size:28px;color:${colors.primary};font-weight:700;">
            Nuevo Alumno Registrado
        </h1>
        <p style="margin:0 0 16px 0;font-size:16px;color:${colors.darkGray};line-height:1.6;">
            Se registr&oacute; un nuevo alumno en <strong>${env.APP_NAME}</strong>.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;background-color:${colors.lightGray};border-left:4px solid ${colors.accent};">
            <tr>
                <td style="padding:24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td style="padding:8px 0;">
                                <span style="font-size:13px;color:${colors.gray};text-transform:uppercase;letter-spacing:1px;">Nombre</span><br/>
                                <span style="font-size:16px;color:${colors.darkGray};font-weight:600;">${alumno_name}</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;">
                                <span style="font-size:13px;color:${colors.gray};text-transform:uppercase;letter-spacing:1px;">Email</span><br/>
                                <span style="font-size:16px;color:${colors.darkGray};font-weight:600;">${alumno_email}</span>
                            </td>
                        </tr>
                        ${referralRow}
                    </table>
                </td>
            </tr>
        </table>
        <p style="margin:0 0 16px 0;font-size:16px;color:${colors.darkGray};line-height:1.6;">
            Ingres&aacute; al backoffice para ver el perfil y asignarle un asesor.
        </p>
        ${ctaButton('Ver en Backoffice', resolvedUrl)}`;
    return baseLayout(content);
}
