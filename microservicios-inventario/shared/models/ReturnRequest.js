import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const ReturnRequest = sequelize.define('return_requests', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    sale_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    customer_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    numero_rma: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
    estado: {
        type: DataTypes.ENUM('pendiente', 'aprobada', 'rechazada', 'procesada'),
        allowNull: false,
        defaultValue: 'pendiente',
    },
    motivo: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    aprobado_por: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    aprobado_at: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    nota_credito_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    observaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'return_requests',
    timestamps: true,
    paranoid: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
        { fields: ['sale_id'] },
        { fields: ['estado'] },
    ],
});

export default ReturnRequest;
