import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const SupplierTransaction = sequelize.define('supplier_transactions', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    supplier_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    // credit = se incrementa la deuda con el proveedor (compra a cuenta);
    // debit = se cancela deuda (pago al proveedor).
    type: {
        type: DataTypes.ENUM('credit', 'debit'),
        allowNull: false,
    },
    amount: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
    },
    description: {
        type: DataTypes.STRING(300),
        allowNull: false,
    },
    reference_type: {
        type: DataTypes.ENUM('purchase_order', 'payment', 'manual'),
        allowNull: false,
        defaultValue: 'manual',
    },
    reference_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    balance_after: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
    },
    created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    tableName: 'supplier_transactions',
    timestamps: true,
    updatedAt: false,
    indexes: [
        { fields: ['supplier_id'] },
    ],
});

export default SupplierTransaction;
