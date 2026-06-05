import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const MarketplaceConnection = sequelize.define('marketplace_connections', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    marketplace: {
        type: DataTypes.ENUM('mercadolibre', 'tiendanube', 'shopify', 'woocommerce'),
        allowNull: false,
    },
    nombre: {
        type: DataTypes.STRING(200),
        allowNull: false,
    },
    access_token: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    refresh_token: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    token_expira_at: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    seller_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    shop_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
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
    sync_status: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
}, {
    tableName: 'marketplace_connections',
    timestamps: true,
    paranoid: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
        { fields: ['marketplace'], unique: true, name: 'uq_marketplace_connection_marketplace' },
    ],
});

export default MarketplaceConnection;
