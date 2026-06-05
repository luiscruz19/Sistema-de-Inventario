import { baseLayout, getColors, getEnvVars } from './base-layout.js';
import { ctaButton } from './cta-button.js';

export function documentStatusEmail({ name, documentName, status, reason }) {
    const colors = getColors();
    const env = getEnvVars();
    const portalUrl = env.WEB_URL || '#';
    const supportEmail = env.SUPPORT_EMAIL || '';

    const isApproved = status === 'approved' || status === 'aprobado';
    const statusLabel = isApproved ? 'Aprobado' : 'Rechazado';
    const statusColor = isApproved ? '#16a34a' : '#dc2626';

    const content = `
        <h1 style="margin:0 0 24px 0;font-size:28px;color:${colors.primary};font-weight:700;">
            Actualizaci&oacute;n de Documento
        </h1>
        <p style="margin:0 0 16px 0;font-size:16px;color:${colors.darkGray};line-height:1.6;">
            Hola <strong>${name}</strong>, te informamos sobre el estado de tu documento.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;background-color:${colors.lightGray};border-left:4px solid ${statusColor};">
            <tr>
                <td style="padding:24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td style="padding:8px 0;">
                                <span style="font-size:13px;color:${colors.gray};text-transform:uppercase;letter-spacing:1px;">Documento</span><br/>
                                <span style="font-size:16px;color:${colors.darkGray};font-weight:600;">${documentName}</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;">
                                <span style="font-size:13px;color:${colors.gray};text-transform:uppercase;letter-spacing:1px;">Estado</span><br/>
                                <span style="display:inline-block;margin-top:4px;padding:4px 12px;background-color:${statusColor};color:${colors.white};font-size:14px;font-weight:700;">
                                    ${statusLabel}
                                </span>
                            </td>
                        </tr>
                        ${reason ? `
                        <tr>
                            <td style="padding:8px 0;">
                                <span style="font-size:13px;color:${colors.gray};text-transform:uppercase;letter-spacing:1px;">Observaciones</span><br/>
                                <span style="font-size:15px;color:${colors.darkGray};line-height:1.5;">${reason}</span>
                            </td>
                        </tr>` : ''}
                    </table>
                </td>
            </tr>
        </table>
        ${isApproved
            ? `<p style="margin:0 0 16px 0;font-size:16px;color:${colors.darkGray};line-height:1.6;">
                &iexcl;Excelente! Tu documento fue aprobado. Pod&eacute;s seguir tu progreso desde el portal.
            </p>`
            : `<p style="margin:0 0 16px 0;font-size:16px;color:${colors.darkGray};line-height:1.6;">
                Tu documento fue rechazado. Revis&aacute; las observaciones y volv&eacute; a subirlo.
            </p>`
        }
        ${ctaButton('Ir a mi portal', portalUrl)}
        <p style="margin:0;font-size:14px;color:${colors.gray};line-height:1.6;">
            ${supportEmail ? `Dudas a <a href="mailto:${supportEmail}" style="color:${colors.primary};">${supportEmail}</a>.` : ''}
        </p>`;
    return baseLayout(content);
}
