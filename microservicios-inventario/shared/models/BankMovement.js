import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const BankMovement = sequelize.define('bank_movements', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    bank_account_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    fecha: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    concepto: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    tipo: {
        type: DataTypes.ENUM('ingreso', 'egreso'),
        allowNull: false,
    },
    monto: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
    },
    saldo_resultante: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: true,
    },
    referencia: {
        type: DataTypes.STRING(200),
        allowNull: true,
    },
    conciliado: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    sale_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    purchase_order_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    tableName: 'bank_movements',
    timestamps: true,
    paranoid: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
        { fields: ['bank_account_id'] },
        { fields: ['fecha'] },
    ],
});

export default BankMovement;
