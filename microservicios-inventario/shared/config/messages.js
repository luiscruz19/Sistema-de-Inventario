const messages = Object.freeze({
    system: {
        common: {
            errors: {
                unexpected: 'Ocurrió un error inesperado. Intenta nuevamente.',
                notFound: 'Registro no encontrado.',
                idRequired: 'El ID es requerido.',
                permissionDenied: 'No tienes permisos para realizar esta acción.',
                userIdRequired: 'El user_id es requerido.',
                invalidUserInToken: 'Token inválido o sin usuario asociado.',
                misconfiguredAuthorization: 'Configuración de seguridad inválida en el servidor.',
                tooManyRequests: 'Demasiadas solicitudes. Intenta nuevamente en unos minutos.',
                externalConnectionFailed: 'Ocurrió un error con los datos que estás enviando'
            }
        },
        http: {
            errors: {
                routeNotFoundPrefix: 'Ruta no encontrada'
            }
        },
        auth: {
            errors: {
                loginRequired: 'Debes iniciar sesión para continuar.',
                authorizationRequired: 'Autorización requerida.',
                credentialsInvalid: 'Credenciales inválidas.',
                tokenExpired: 'El token ingresado ha expirado.',
                tokenInvalid: 'El token ingresado no es válido.',
                tokenNotFound: 'El token ingresado no fue encontrado.'
            }
        },
        validation: {
            errors: {
                fieldsRequired: 'Todos los campos requeridos deben ser completados',
                invalidStatus: 'El estado proporcionado no es válido',
                invalidEnumValue: 'El valor proporcionado no está permitido',
                requestInvalid: 'Error de validación en los campos ingresados',
            }
        }
    },
    entities: {
        businessConfig: {
            errors: {
                notFound: 'Configuración del negocio no encontrada.',
            },
            success: {
                fetch: 'Configuración obtenida correctamente.',
                updated: 'Configuración actualizada correctamente.',
            }
        },
        branch: {
            errors: {
                notFound: 'Sucursal no encontrada.',
            },
            success: {
                list: 'Sucursales obtenidas correctamente.',
                fetch: 'Sucursal obtenida correctamente.',
                created: 'Sucursal creada correctamente.',
                updated: 'Sucursal actualizada correctamente.',
                deleted: 'Sucursal eliminada correctamente.',
                toggled: 'Estado de la sucursal actualizado correctamente.',
            }
        },
        category: {
            errors: {
                notFound: 'Categoría no encontrada.',
            },
            success: {
                list: 'Categorías obtenidas correctamente.',
                fetch: 'Categoría obtenida correctamente.',
                created: 'Categoría creada correctamente.',
                updated: 'Categoría actualizada correctamente.',
                deleted: 'Categoría eliminada correctamente.',
            }
        },
        product: {
            errors: {
                notFound: 'Producto no encontrado.',
                skuDuplicate: 'El SKU ya existe para este negocio.',
            },
            success: {
                list: 'Productos obtenidos correctamente.',
                fetch: 'Producto obtenido correctamente.',
                created: 'Producto creado correctamente.',
                updated: 'Producto actualizado correctamente.',
                deleted: 'Producto eliminado correctamente.',
                toggled: 'Estado del producto actualizado correctamente.',
            }
        },
        productVariant: {
            errors: {
                notFound: 'Variante no encontrada.',
            },
            success: {
                list: 'Variantes obtenidas correctamente.',
                created: 'Variante creada correctamente.',
                updated: 'Variante actualizada correctamente.',
                deleted: 'Variante eliminada correctamente.',
            }
        },
        stock: {
            errors: {
                notFound: 'Registro de stock no encontrado.',
                insufficientStock: 'Stock insuficiente para esta operación.',
            },
            success: {
                list: 'Stock obtenido correctamente.',
                fetch: 'Stock obtenido correctamente.',
                adjusted: 'Stock ajustado correctamente.',
            }
        },
        stockMovement: {
            success: {
                list: 'Movimientos de stock obtenidos correctamente.',
            }
        },
        stockTransfer: {
            errors: {
                notFound: 'Transferencia no encontrada.',
                alreadyReceived: 'La transferencia ya fue recibida.',
                alreadyCancelled: 'La transferencia ya fue cancelada.',
            },
            success: {
                list: 'Transferencias obtenidas correctamente.',
                fetch: 'Transferencia obtenida correctamente.',
                created: 'Transferencia creada correctamente.',
                received: 'Transferencia recibida correctamente.',
                cancelled: 'Transferencia cancelada correctamente.',
            }
        },
        supplier: {
            errors: {
                notFound: 'Proveedor no encontrado.',
            },
            success: {
                list: 'Proveedores obtenidos correctamente.',
                fetch: 'Proveedor obtenido correctamente.',
                created: 'Proveedor creado correctamente.',
                updated: 'Proveedor actualizado correctamente.',
                deleted: 'Proveedor eliminado correctamente.',
                toggled: 'Estado del proveedor actualizado correctamente.',
            }
        },
        purchaseOrder: {
            errors: {
                notFound: 'Orden de compra no encontrada.',
                alreadyCancelled: 'La orden de compra ya fue cancelada.',
                alreadyReceived: 'La orden de compra ya fue recibida completamente.',
            },
            success: {
                list: 'Órdenes de compra obtenidas correctamente.',
                fetch: 'Orden de compra obtenida correctamente.',
                created: 'Orden de compra creada correctamente.',
                updated: 'Orden de compra actualizada correctamente.',
                sent: 'Orden de compra enviada al proveedor.',
                received: 'Mercadería recibida correctamente.',
                cancelled: 'Orden de compra cancelada correctamente.',
            }
        },
        customer: {
            errors: {
                notFound: 'Cliente no encontrado.',
                creditLimitExceeded: 'El monto excede el límite de crédito del cliente.',
            },
            success: {
                list: 'Clientes obtenidos correctamente.',
                fetch: 'Cliente obtenido correctamente.',
                created: 'Cliente creado correctamente.',
                updated: 'Cliente actualizado correctamente.',
                deleted: 'Cliente eliminado correctamente.',
                toggled: 'Estado del cliente actualizado correctamente.',
            }
        },
        sale: {
            errors: {
                notFound: 'Venta no encontrada.',
                alreadyCancelled: 'La venta ya fue cancelada.',
                emptyItems: 'La venta debe tener al menos un item.',
                insufficientPayment: 'El monto pagado es insuficiente.',
            },
            success: {
                list: 'Ventas obtenidas correctamente.',
                fetch: 'Venta obtenida correctamente.',
                created: 'Venta registrada correctamente.',
                cancelled: 'Venta cancelada correctamente.',
                refunded: 'Devolución procesada correctamente.',
            }
        },
        saleReport: {
            success: {
                fetch: 'Reporte obtenido correctamente.',
            }
        },
        cashRegister: {
            errors: {
                notFound: 'Caja no encontrada.',
                alreadyOpen: 'Ya hay una caja abierta en esta sucursal.',
                noneOpen: 'No hay una caja abierta en esta sucursal.',
                alreadyClosed: 'La caja ya fue cerrada.',
            },
            success: {
                list: 'Cajas obtenidas correctamente.',
                fetch: 'Caja obtenida correctamente.',
                opened: 'Caja abierta correctamente.',
                closed: 'Caja cerrada correctamente.',
            }
        },
        priceList: {
            errors: {
                notFound: 'Lista de precios no encontrada.',
            },
            success: {
                list: 'Listas de precios obtenidas correctamente.',
                fetch: 'Lista de precios obtenida correctamente.',
                created: 'Lista de precios creada correctamente.',
                updated: 'Lista de precios actualizada correctamente.',
                deleted: 'Lista de precios eliminada correctamente.',
            }
        },
        alert: {
            success: {
                list: 'Alertas de stock obtenidas correctamente.',
            }
        }
    }
});

export default messages;
