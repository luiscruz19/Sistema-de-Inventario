const getEnv = () => ({
    APP_NAME: process.env.APP_NAME || 'App',
    LOGO_URL: process.env.PROJECT_LOGO_URL || '',
    WEB_URL: process.env.PROJECT_WEB_URL || process.env.WEB_URL || '#',
    SUPPORT_EMAIL: process.env.PROJECT_SUPPORT_EMAIL || '',
    PHONE: process.env.PROJECT_PHONE || '',
    PRIMARY_COLOR: process.env.BRAND_PRIMARY_COLOR || '#01003d',
    ACCENT_COLOR: process.env.BRAND_ACCENT_COLOR || '#BF0000',
    LIGHT_GRAY: '#f5f5f5',
    WHITE: '#ffffff',
    GRAY: '#666666',
    DARK_GRAY: '#333333',
    BORDER: '#e0e0e0',
});

export function baseLayout(content) {
    const env = getEnv();
    const logoHtml = env.LOGO_URL
        ? `<img src="${env.LOGO_URL}" alt="${env.APP_NAME}" width="180" style="max-width:180px;height:auto;" />`
        : `<span style="color:${env.WHITE};font-size:22px;font-weight:700;">${env.APP_NAME}</span>`;

    const footerEmail = env.SUPPORT_EMAIL
        ? `<p style="margin:0 0 4px 0;font-size:13px;color:${env.GRAY};">${env.SUPPORT_EMAIL}</p>`
        : '';
    const footerPhone = env.PHONE
        ? `<p style="margin:0 0 4px 0;font-size:13px;color:${env.GRAY};">${env.PHONE}</p>`
        : '';

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${env.APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background-color:${env.LIGHT_GRAY};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:${env.LIGHT_GRAY};">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;width:100%;background-color:${env.WHITE};">
        <tr>
          <td style="background-color:${env.PRIMARY_COLOR};padding:32px 40px;text-align:center;">
            ${logoHtml}
          </td>
        </tr>
        <tr>
          <td style="background-color:${env.ACCENT_COLOR};height:4px;font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:40px;">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="background-color:${env.LIGHT_GRAY};padding:32px 40px;border-top:1px solid ${env.BORDER};">
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td style="text-align:center;">
                  <p style="margin:0 0 8px 0;font-size:14px;color:${env.GRAY};font-weight:600;">${env.APP_NAME}</p>
                  ${footerEmail}
                  ${footerPhone}
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export function getColors() {
    const env = getEnv();
    return {
        primary: env.PRIMARY_COLOR,
        accent: env.ACCENT_COLOR,
        white: env.WHITE,
        lightGray: env.LIGHT_GRAY,
        gray: env.GRAY,
        darkGray: env.DARK_GRAY,
        border: env.BORDER,
    };
}

export function getEnvVars() {
    return getEnv();
}
