import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const MarketplaceProduct = sequelize.define('marketplace_products', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    connection_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    variant_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    marketplace_item_id: {
        type: DataTypes.STRING(200),
        allowNull: false,
    },
    titulo: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },
    precio_publicado: {
        type: DataTypes.DECIMAL(12, 2),
        allowNull: false,
    },
    stock_publicado: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    activa: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    ultimo_sync_at: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
}, {
    tableName: 'marketplace_products',
    timestamps: true,
    paranoid: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
        { fields: ['connection_id'] },
        { fields: ['product_id'] },
        { fields: ['connection_id', 'marketplace_item_id'], unique: true, name: 'uq_marketplace_product_connection_item' },
    ],
});

export default MarketplaceProduct;
