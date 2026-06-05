import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const Cheque = sequelize.define('cheques', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    tipo: {
        type: DataTypes.ENUM('emitido', 'recibido'),
        allowNull: false,
    },
    numero: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
    banco: {
        type: DataTypes.STRING(200),
        allowNull: false,
    },
    monto: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
    },
    fecha_emision: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    fecha_vencimiento: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    beneficiario: {
        type: DataTypes.STRING(300),
        allowNull: true,
    },
    emisor: {
        type: DataTypes.STRING(300),
        allowNull: true,
    },
    estado: {
        type: DataTypes.ENUM('en_cartera', 'depositado', 'cobrado', 'rechazado', 'anulado', 'endosado'),
        allowNull: false,
        defaultValue: 'en_cartera',
    },
    bank_account_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    customer_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    supplier_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    observaciones: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'cheques',
    timestamps: true,
    paranoid: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
        { fields: ['estado'] },
        { fields: ['fecha_vencimiento'] },
    ],
});

export default Cheque;
