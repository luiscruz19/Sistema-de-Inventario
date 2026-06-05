import { baseLayout, getColors, getEnvVars } from './base-layout.js';
import { ctaButton } from './cta-button.js';

export function paymentReminderEmail({ name, amount, dueDate, concept }) {
    const colors = getColors();
    const env = getEnvVars();
    const portalUrl = env.WEB_URL || '#';
    const supportEmail = env.SUPPORT_EMAIL || '';

    const content = `
        <h1 style="margin:0 0 24px 0;font-size:28px;color:${colors.primary};font-weight:700;">
            Recordatorio de Pago
        </h1>
        <p style="margin:0 0 16px 0;font-size:16px;color:${colors.darkGray};line-height:1.6;">
            Hola <strong>${name}</strong>, ten&eacute;s un pago pendiente.
        </p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;background-color:${colors.lightGray};border-left:4px solid ${colors.accent};">
            <tr>
                <td style="padding:24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td style="padding:8px 0;">
                                <span style="font-size:13px;color:${colors.gray};text-transform:uppercase;letter-spacing:1px;">Concepto</span><br/>
                                <span style="font-size:16px;color:${colors.darkGray};font-weight:600;">${concept}</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;">
                                <span style="font-size:13px;color:${colors.gray};text-transform:uppercase;letter-spacing:1px;">Monto</span><br/>
                                <span style="font-size:24px;color:${colors.primary};font-weight:700;">${amount}</span>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding:8px 0;">
                                <span style="font-size:13px;color:${colors.gray};text-transform:uppercase;letter-spacing:1px;">Vencimiento</span><br/>
                                <span style="font-size:16px;color:${colors.darkGray};font-weight:600;">${dueDate}</span>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
        <p style="margin:0 0 16px 0;font-size:16px;color:${colors.darkGray};line-height:1.6;">
            Pod&eacute;s realizar el pago desde tu portal o comunic&aacute;ndote con tu asesor.
        </p>
        ${ctaButton('Realizar pago', portalUrl)}
        <p style="margin:0;font-size:14px;color:${colors.gray};line-height:1.6;">
            Si ya realizaste el pago, ignor&aacute; este mensaje.${supportEmail ? ` Dudas a <a href="mailto:${supportEmail}" style="color:${colors.primary};">${supportEmail}</a>.` : ''}
        </p>`;
    return baseLayout(content);
}
