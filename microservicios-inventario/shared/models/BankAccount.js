import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const BankAccount = sequelize.define('bank_accounts', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    nombre: {
        type: DataTypes.STRING(200),
        allowNull: false,
    },
    banco: {
        type: DataTypes.STRING(200),
        allowNull: false,
    },
    numero_cuenta: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    cbu_cvu: {
        type: DataTypes.STRING(22),
        allowNull: true,
    },
    tipo: {
        type: DataTypes.ENUM('corriente', 'caja_ahorro', 'cuenta_sueldo', 'inversion'),
        allowNull: false,
        defaultValue: 'corriente',
    },
    moneda: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'ARS',
    },
    saldo_inicial: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
    },
    activa: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
}, {
    tableName: 'bank_accounts',
    timestamps: true,
    paranoid: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
    ],
});

export default BankAccount;
