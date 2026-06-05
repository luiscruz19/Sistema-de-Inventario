import CONFIG from './config.js';
const APP_NAME = CONFIG.APP_NAME;

export default {
    generic: {
        autorization_required: 'No se proporcionó autorización válida. Por favor, incluí el token de autenticación en el encabezado de la petición.',
        credential_invalid: 'Las credenciales proporcionadas son inválidas. Verificá tu email y contraseña.',
        error: 'Ocurrió un error inesperado al procesar tu solicitud. Por favor, intentá nuevamente o contactá al soporte si el problema persiste.',
        fields_empty: 'Faltan campos obligatorios en tu solicitud. Completá todos los campos requeridos.',
        id_required: 'El identificador de usuario es obligatorio para completar esta operación.',
        email_required: 'La dirección de email es obligatoria para realizar esta búsqueda.',
        login_required: 'Necesitás iniciar sesión para acceder a este recurso. Por favor, autenticate primero.',
        permission_denied: 'No tenés los permisos necesarios para realizar esta acción. Esta operación está restringida.',
        token_expirated: 'Tu sesión ha expirado por razones de seguridad. Por favor, iniciá sesión nuevamente.',
        token_invalid: 'El token de autenticación proporcionado no es válido o fue alterado.',
        token_not_found: 'No se encontró el token de autenticación. Asegurate de incluirlo en el encabezado de la petición.',
        user_not_found: 'No se encontró ningún usuario con los datos proporcionados en nuestra base de datos.',
        user_not_found_email: 'No existe una cuenta asociada a este email. Verificá que esté escrito correctamente.',
        account_not_found: 'No pudimos localizar tu cuenta con el token de activación proporcionado. Puede que haya expirado.',
    },
    success: {
        login: '¡Bienvenido de vuelta! Iniciaste sesión correctamente.',
        remove: 'La cuenta de usuario fue eliminada permanentemente de forma exitosa.',
        signup: '¡Cuenta creada con éxito! Revisá tu email para activar tu cuenta.',
        validate_account: `Tu cuenta ha sido verificada correctamente. Ya podés acceder a todos los servicios de ${APP_NAME}.`,
        not_validate_account: 'La verificación de cuenta fue deshabilitada correctamente.',
        validate_token: 'Tu sesión es válida y está activa.',
        forgot_password: 'Te enviamos un email con las instrucciones para restablecer tu contraseña. Revisá tu bandeja de entrada.',
        restore_password: 'Tu contraseña fue actualizada exitosamente. Ya podés iniciar sesión con tu nueva contraseña.',
        update_password: 'Tu contraseña fue modificada correctamente. Tu sesión permanece activa.',
        search_user: 'Usuario encontrado exitosamente.',
    },
    error: {
        login: {
            fields_empty: {
                email: 'El campo email es obligatorio para iniciar sesión.',
                password: 'La contraseña es obligatoria para acceder a tu cuenta.',
            },
            error: 'Email o contraseña incorrectos. Verificá tus credenciales e intentá nuevamente.',
            not_active: 'Tu cuenta está desactivada. Contactá al soporte para más información.',
            not_verified: 'Tu cuenta aún no ha sido verificada. Revisá tu email y hacé clic en el enlace de activación que te enviamos.',
        },
        signup: {
            fields_empty: {
                email: 'El email es obligatorio para crear tu cuenta.',
                password: 'Debés ingresar una contraseña de al menos 6 caracteres.',
                verify_password: 'Debés confirmar tu contraseña ingresándola nuevamente.',
            },
            password: {
                lowercase: 'Por seguridad, tu contraseña debe contener al menos una letra minúscula (a-z).',
                min_length: 'Tu contraseña es demasiado corta. Debe tener al menos 6 caracteres.',
                not_match: 'Las contraseñas no coinciden. Asegurate de escribir la misma contraseña en ambos campos.',
                number: 'Por seguridad, tu contraseña debe incluir al menos un número (0-9).',
                special_character: 'Por seguridad, tu contraseña debe contener al menos un carácter especial (!@#$%^&*).',
                uppercase: 'Por seguridad, tu contraseña debe contener al menos una letra mayúscula (A-Z).',
            },
            error: {
                email_exists: `Este email ya está registrado en ${APP_NAME}. Intentá iniciar sesión o recuperar tu contraseña.`,
                error: 'No pudimos completar tu registro en este momento. Por favor, intentá nuevamente.'
            },
        },
        remove: 'No se pudo eliminar la cuenta de usuario. Verificá que el usuario exista o intentá más tarde.',
        validate_account: {
            fields_empty: {
                id: 'El identificador de usuario es necesario para verificar la cuenta.',
                token: 'El token de verificación es obligatorio para activar tu cuenta.',
            },
            error: {
                verified: 'Esta cuenta ya fue verificada previamente. Podés iniciar sesión normalmente.',
                not_verified: 'No pudimos verificar tu cuenta. El enlace puede haber expirado o ser inválido.',
            }
        },
        forgot_password: {
            fields_empty: {
                email: 'Ingresá tu email para que podamos enviarte las instrucciones de recuperación.',
            },
            error: "No pudimos enviar el email de recuperación. Verificá que tu email esté correcto o intentá más tarde.",
        },
        restore_password: {
            fields_empty: {
                password: 'Ingresá tu nueva contraseña (mínimo 6 caracteres).',
                verify_password: 'Confirmá tu nueva contraseña ingresándola nuevamente.',
                hash: "El token de seguridad es necesario para restablecer tu contraseña."
            },
            password: {
                lowercase: 'Tu nueva contraseña debe contener al menos una letra minúscula (a-z).',
                min_length: 'Tu nueva contraseña debe tener al menos 6 caracteres.',
                not_match: 'Las contraseñas no coinciden. Verificá que hayas escrito la misma contraseña en ambos campos.',
                number: 'Tu nueva contraseña debe incluir al menos un número (0-9).',
                special_character: 'Tu nueva contraseña debe contener al menos un carácter especial (!@#$%^&*).',
                uppercase: 'Tu nueva contraseña debe contener al menos una letra mayúscula (A-Z).',
            },
            error: "No pudimos actualizar tu contraseña. El enlace puede haber expirado. Solicitá uno nuevo.",
            hash_invalid: "El enlace de recuperación no es válido o ha expirado. Solicitá un nuevo enlace de recuperación.",
        },
        update_password: {
            current_incorrect: "La contraseña actual que ingresaste es incorrecta. Verificá e intentá nuevamente.",
            error: "No pudimos modificar tu contraseña en este momento. Intentá más tarde.",
        }
    }
}
