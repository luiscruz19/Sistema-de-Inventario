import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

const ProductSerial = sequelize.define('product_serials', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    product_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    variant_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    numero_serie: {
        type: DataTypes.STRING(200),
        allowNull: false,
    },
    batch_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    estado: {
        type: DataTypes.ENUM('disponible', 'vendido', 'devuelto', 'dado_de_baja'),
        allowNull: false,
        defaultValue: 'disponible',
    },
    sale_item_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    customer_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    fecha_venta: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    garantia_hasta: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
}, {
    tableName: 'product_serials',
    timestamps: true,
    paranoid: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    indexes: [
        { fields: ['product_id'] },
        { fields: ['numero_serie'] },
        { fields: ['numero_serie'], unique: true, name: 'uq_product_serial_serie' },
    ],
});

export default ProductSerial;
