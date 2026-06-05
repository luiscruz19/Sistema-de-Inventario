const MESSAGE_KEYS = Object.freeze({
    SYSTEM: {
        COMMON: {
            ERRORS: {
                UNEXPECTED: 'system.common.errors.unexpected',
                NOT_FOUND: 'system.common.errors.notFound',
                ID_REQUIRED: 'system.common.errors.idRequired',
                PERMISSION_DENIED: 'system.common.errors.permissionDenied',
                USER_ID_REQUIRED: 'system.common.errors.userIdRequired',
                INVALID_USER_IN_TOKEN: 'system.common.errors.invalidUserInToken',
                MISCONFIGURED_AUTHORIZATION: 'system.common.errors.misconfiguredAuthorization',
                TOO_MANY_REQUESTS: 'system.common.errors.tooManyRequests',
                EXTERNAL_CONNECTION_FAILED: 'system.common.errors.externalConnectionFailed'
            }
        },
        HTTP: {
            ERRORS: {
                ROUTE_NOT_FOUND_PREFIX: 'system.http.errors.routeNotFoundPrefix'
            }
        },
        AUTH: {
            ERRORS: {
                LOGIN_REQUIRED: 'system.auth.errors.loginRequired',
                AUTHORIZATION_REQUIRED: 'system.auth.errors.authorizationRequired',
                CREDENTIALS_INVALID: 'system.auth.errors.credentialsInvalid',
                TOKEN_EXPIRED: 'system.auth.errors.tokenExpired',
                TOKEN_INVALID: 'system.auth.errors.tokenInvalid',
                TOKEN_NOT_FOUND: 'system.auth.errors.tokenNotFound'
            }
        },
        VALIDATION: {
            ERRORS: {
                REQUEST_INVALID: 'system.validation.errors.requestInvalid',
                INVALID_ENUM_VALUE: 'system.validation.errors.invalidEnumValue',
            }
        }
    },
});

export default MESSAGE_KEYS;
