import CONFIG from "../config/config.js";
const { LOGO_URL } = CONFIG;

export default ({ email, link }) => {

    return `<!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Bienvenido a Nóvitas</title>
        <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&display=swap" rel="stylesheet">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Lato', sans-serif; background-color: #ffffff;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff;">
                        
                        <!-- Header con gradiente -->
                        <tr>
                            <td style="background: linear-gradient(90deg, #006634 0%, #007045 100%); padding: 40px; text-align: center; border-top: 1px solid rgba(0,0,0,0.1); border-bottom: 1px solid rgba(0,0,0,0.1);">
                                <img src="https://novitas.sda.ovh/images/logos/logo-blanco.png" alt="Nóvitas" style="max-width: 180px; height: auto;" />
                                <p style="color: #ffffff; font-size: 14px; margin: 12px 0 0 0; letter-spacing: 0.5px; font-weight: 400;">Nuestro campo, la información</p>
                            </td>
                        </tr>
                        
                        <!-- Contenido principal -->
                        <tr>
                            <td style="padding: 48px 40px;">
                                <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin: 0 0 8px 0; text-align: center;">Bienvenido a Nóvitas</h1>
                                <p style="font-size: 14px; color: #6b7280; text-align: center; margin: 0 0 32px 0;">La mejor lectura del mercado agropecuario</p>
                                
                                <p style="font-size: 14px; line-height: 1.6; color: #374151; margin: 0 0 16px 0;">
                                    Hola,
                                </p>
                                
                                <p style="font-size: 14px; line-height: 1.6; color: #374151; margin: 0 0 24px 0;">
                                    Tu cuenta de Nóvitas está lista. Ahora formás parte de la comunidad de profesionales del agro que confían en nuestra plataforma para tomar decisiones estratégicas.
                                </p>
                                
                                <p style="font-size: 14px; line-height: 1.6; color: #374151; margin: 0 0 24px 0;">
                                    Con tu suscripción tenés acceso completo a:
                                </p>

                                <!-- Lista de beneficios -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 0 0 32px 0;">
                                    <tr>
                                        <td style="padding: 0;">
                                            <table cellpadding="0" cellspacing="0" style="width: 100%;">
                                                <tr>
                                                    <td style="padding: 6px 0; font-size: 14px; color: #374151; line-height: 1.6;">
                                                        • Reportes diarios: STARTER, AGROFAX y FLASH
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 6px 0; font-size: 14px; color: #374151; line-height: 1.6;">
                                                        • Cotizaciones en vivo: Chicago, MAT, Pizarra
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 6px 0; font-size: 14px; color: #374151; line-height: 1.6;">
                                                        • Nóvitas TV: Análisis de Enrique Erize y Diego de la Puente
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 6px 0; font-size: 14px; color: #374151; line-height: 1.6;">
                                                        • Estadísticas y datos climáticos de Argentina y el mundo
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 6px 0; font-size: 14px; color: #374151; line-height: 1.6;">
                                                        • Opinión de expertos del mercado agroindustrial
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                
                                <!-- CTA Button -->
                                <table width="100%" cellpadding="0" cellspacing="0" style="margin: 32px 0;">
                                    <tr>
                                        <td align="center">
                                            <table cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="background-color: #007045; text-align: center;">
                                                        <a href="${link}" style="display: inline-block; padding: 12px 48px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700;">
                                                            Activar mi cuenta
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                                
                                <p style="font-size: 13px; color: #6b7280; text-align: center; margin: 32px 0 0 0; padding-top: 24px; border-top: 1px solid #d1d5db;">
                                    Este enlace es válido por 48 horas. Si no creaste esta cuenta, podés ignorar este correo.
                                </p>
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 32px 40px;">
                                <table width="100%" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td align="center">
                                            <p style="font-size: 13px; color: #6b7280; margin: 0 0 4px 0; font-weight: 600;">Nóvitas S.A.</p>
                                            <p style="font-size: 12px; color: #9ca3af; margin: 0 0 4px 0;">Lavalle 465 6° - Buenos Aires, Argentina</p>
                                            <p style="font-size: 12px; color: #9ca3af; margin: 0 0 12px 0;">Tel: <a target="_blank" href="tel:+541161878510" style="color: #007045; text-decoration: none;">+54 11 6187-8510</a></p>
                                            <p style="font-size: 12px; margin: 0 0 12px 0;">
                                                <a target="_blank" href="https://www.novitas.com.ar" style="color: #007045; text-decoration: none; font-weight: 600;">www.novitas.com.ar</a>
                                            </p>
                                            <p style="font-size: 11px; color: #d1d5db; margin: 12px 0 0 0;">
                                                © ${new Date().getFullYear()} Nóvitas - Todos los derechos reservados
                                            </p>
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
};
