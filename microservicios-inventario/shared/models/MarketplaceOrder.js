import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const MarketplaceOrder = sequelize.define('marketplace_orders', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    connection_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    marketplace_order_id: {
        type: DataTypes.STRING(200),
        allowNull: false,
    },
    estado: {
        type: DataTypes.ENUM('pendiente', 'pagado', 'enviado', 'entregado', 'cancelado'),
        allowNull: false,
        defaultValue: 'pendiente',
    },
    buyer_nombre: {
        type: DataTypes.STRING(300),
        allowNull: false,
    },
    buyer_email: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    buyer_telefono: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    total: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
    },
    moneda: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: 'ARS',
    },
    sale_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    datos_raw: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'marketplace_orders',
    timestamps: true,
    paranoid: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
        { fields: ['connection_id'] },
        { fields: ['estado'] },
        { fields: ['connection_id', 'marketplace_order_id'], unique: true, name: 'uq_marketplace_order_connection_order' },
    ],
});

export default MarketplaceOrder;
