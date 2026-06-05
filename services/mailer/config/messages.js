export default {
    generic: {
        autorization_required: 'No se proporcionó autorización válida. Incluí el token de autenticación en el encabezado.',
        credential_invalid: 'Las credenciales proporcionadas son inválidas.',
        error: 'Ocurrió un error inesperado al procesar la solicitud del servicio de email.',
        fields_empty: 'Faltan campos obligatorios en la solicitud.',
        not_email: (email) => `El email proporcionado para "${email}" no tiene un formato válido.`,
        login_required: 'Necesitás iniciar sesión para acceder a este servicio de email.',
        permission_denied: 'No tenés permisos de administrador para realizar esta acción.',
        token_expirated: 'Tu sesión ha expirado. Iniciá sesión nuevamente.',
        token_invalid: 'El token de autenticación no es válido.',
        token_not_found: 'No se encontró el token de autenticación en la solicitud.',
        not_found: 'No se encontró el recurso solicitado.',
    },
    success: {
        send_mail: 'El email fue enviado exitosamente al destinatario.',
        subscribe: 'Te suscribiste exitosamente a nuestra lista de correo. ¡Bienvenido!',
        get_subscribers: 'Lista de suscriptores obtenida correctamente.',
    },
    error: {
        send_mail: {
            fields_empty: {
                from: 'Debés especificar una dirección de email de origen válida.',
                to: 'Debés especificar al menos una dirección de email de destino.',
                subject: 'El asunto del email es obligatorio.',
                content: 'El contenido del email no puede estar vacío.',
            },
            error: 'No pudimos enviar el email en este momento. Verificá los datos e intentá nuevamente.',
            service_error: 'El servicio de envío de emails no está disponible temporalmente. Intentá más tarde.',
        },
        subscribe: {
            error: 'No pudimos completar tu suscripción. Por favor, intentá nuevamente.',
            already_subscribed: 'Este email ya está suscripto a nuestra lista de correo.',
            invalid_email: 'El email proporcionado no es válido para la suscripción.',
        },
        get_subscribers: {
            error: 'No pudimos obtener la lista de suscriptores en este momento.',
        },
        contact: {
            fields_empty: 'Nombre, email y mensaje son requeridos.',
            error: 'No pudimos enviar tu consulta en este momento. Intentá nuevamente.',
        },
    },
};
