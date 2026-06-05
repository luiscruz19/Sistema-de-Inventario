import { baseLayout, getColors, getEnvVars } from './base-layout.js';
import { ctaButton } from './cta-button.js';

export function welcomeEmail({ name }) {
    const colors = getColors();
    const env = getEnvVars();
    const portalUrl = env.WEB_URL || '#';
    const supportEmail = env.SUPPORT_EMAIL || '';
    const phone = env.PHONE || '';
    const appName = env.APP_NAME;

    const content = `
        <h1 style="margin:0 0 24px 0;font-size:28px;color:${colors.primary};font-weight:700;">
            &iexcl;Bienvenido/a, ${name}!
        </h1>
        <p style="margin:0 0 16px 0;font-size:16px;color:${colors.darkGray};line-height:1.6;">
            Gracias por registrarte en <strong>${appName}</strong>. Est&aacute;s un paso m&aacute;s cerca de tu objetivo.
        </p>
        <p style="margin:0 0 16px 0;font-size:16px;color:${colors.darkGray};line-height:1.6;">
            Nuestro equipo va a revisar tu perfil y se pondr&aacute; en contacto pronto.
        </p>
        <p style="margin:0 0 8px 0;font-size:16px;color:${colors.darkGray};line-height:1.6;font-weight:600;">
            &iquest;Qu&eacute; sigue?
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px 0;">
            <tr>
                <td style="padding:12px 0;border-bottom:1px solid ${colors.border};">
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                        <td style="width:32px;vertical-align:top;">
                            <span style="display:inline-block;width:24px;height:24px;background-color:${colors.accent};color:${colors.darkGray};text-align:center;line-height:24px;font-size:13px;font-weight:700;">1</span>
                        </td>
                        <td style="padding-left:12px;font-size:15px;color:${colors.darkGray};line-height:1.5;">
                            Complet&aacute; tu perfil con tu informaci&oacute;n.
                        </td>
                    </tr></table>
                </td>
            </tr>
            <tr>
                <td style="padding:12px 0;border-bottom:1px solid ${colors.border};">
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                        <td style="width:32px;vertical-align:top;">
                            <span style="display:inline-block;width:24px;height:24px;background-color:${colors.accent};color:${colors.darkGray};text-align:center;line-height:24px;font-size:13px;font-weight:700;">2</span>
                        </td>
                        <td style="padding-left:12px;font-size:15px;color:${colors.darkGray};line-height:1.5;">
                            Sub&iacute; la documentaci&oacute;n requerida.
                        </td>
                    </tr></table>
                </td>
            </tr>
            <tr>
                <td style="padding:12px 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                        <td style="width:32px;vertical-align:top;">
                            <span style="display:inline-block;width:24px;height:24px;background-color:${colors.accent};color:${colors.darkGray};text-align:center;line-height:24px;font-size:13px;font-weight:700;">3</span>
                        </td>
                        <td style="padding-left:12px;font-size:15px;color:${colors.darkGray};line-height:1.5;">
                            Esper&aacute; el contacto de tu asesor asignado.
                        </td>
                    </tr></table>
                </td>
            </tr>
        </table>
        ${ctaButton('Ir a mi portal', portalUrl)}
        <p style="margin:0;font-size:14px;color:${colors.gray};line-height:1.6;">
            Si ten&eacute;s alguna duda${supportEmail ? `, escribinos a <a href="mailto:${supportEmail}" style="color:${colors.primary};">${supportEmail}</a>` : ''}${phone ? ` o al ${phone}` : ''}.
        </p>`;
    return baseLayout(content);
}
