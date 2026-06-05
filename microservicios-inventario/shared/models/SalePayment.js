import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const SalePayment = sequelize.define('sale_payments', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    sale_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    method: {
        type: DataTypes.ENUM('cash', 'card', 'transfer', 'mercadopago'),
        allowNull: false,
    },
    amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
    },
    reference: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    tableName: 'sale_payments',
    timestamps: true,
    indexes: [
        { fields: ['sale_id'] },
    ]
});

export default SalePayment;
