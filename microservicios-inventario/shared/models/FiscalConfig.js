import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * FiscalConfig — configuración fiscal AFIP/ARCA de la instancia.
 * El certificado y la clave privada se leen desde variables de entorno (.env).
 */
const FiscalConfig = sequelize.define('fiscal_configs', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    cuit: {
        type: DataTypes.STRING(20),
        allowNull: true,
    },
    business_name: {
        type: DataTypes.STRING(200),
        allowNull: true,
    },
    pto_vta: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Punto de venta AFIP',
    },
    iva_condition: {
        type: DataTypes.ENUM(
            'responsable_inscripto',
            'monotributo',
            'exento',
            'consumidor_final',
            'no_categorizado',
        ),
        allowNull: false,
        defaultValue: 'monotributo',
    },
    gross_income: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'IIBB',
    },
    activity_start: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    fiscal_address: {
        type: DataTypes.STRING(300),
        allowNull: true,
    },
    environment: {
        type: DataTypes.ENUM('testing', 'production'),
        allowNull: false,
        defaultValue: 'testing',
    },
    // Próximos números por tipo de comprobante (fallback si no hay consulta a AFIP).
    next_numbers: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'JSON { "A": 1, "B": 1, "C": 1, "NCA": 1, ... }',
    },
}, {
    tableName: 'fiscal_configs',
    timestamps: true,
    indexes: [
    ],
});

export default FiscalConfig;
