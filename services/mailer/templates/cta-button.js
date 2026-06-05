import { getColors, getEnvVars } from './base-layout.js';

export function ctaButton(text, url) {
    const colors = getColors();
    const env = getEnvVars();
    const resolvedUrl = url || env.WEB_URL || '#';

    return `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0;">
  <tr>
    <td style="background-color:${colors.primary};padding:14px 32px;">
      <a href="${resolvedUrl}" style="color:${colors.white};text-decoration:none;font-size:16px;font-weight:600;display:inline-block;">
        ${text}
      </a>
    </td>
  </tr>
</table>`;
}
