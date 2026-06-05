import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const ChartOfAccount = sequelize.define('chart_of_accounts', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    codigo: {
        type: DataTypes.STRING(20),
        allowNull: false,
    },
    nombre: {
        type: DataTypes.STRING(300),
        allowNull: false,
    },
    tipo: {
        type: DataTypes.ENUM('activo', 'pasivo', 'patrimonio', 'ingreso', 'egreso', 'costo'),
        allowNull: false,
    },
    parent_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    nivel: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    },
    imputable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    saldo: {
        type: DataTypes.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0,
    },
}, {
    tableName: 'chart_of_accounts',
    timestamps: true,
    paranoid: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
        { fields: ['codigo'], name: 'idx_chart_of_accounts_codigo' },
    ],
});

export default ChartOfAccount;
