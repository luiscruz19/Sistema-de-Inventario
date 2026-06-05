import { DataTypes } from 'sequelize';
import sequelize from '../db/sequelize.js';

/**
 * Invoice — comprobante electrónico emitido (factura/NC/ND).
 * Tipos AFIP codificados como letras: A/B/C/NCA/NCB/NCC/NDA/NDB/NDC.
 */
const Invoice = sequelize.define('invoices', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    sale_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'FK a sales si la factura nació de una venta',
    },
    parent_invoice_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Factura original cuando ésta es una NC/ND',
    },
    doc_type: {
        type: DataTypes.ENUM(
            'A', 'B', 'C',
            'NCA', 'NCB', 'NCC',
            'NDA', 'NDB', 'NDC',
        ),
        allowNull: false,
    },
    afip_cbte_tipo: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Código numérico AFIP del tipo de comprobante',
    },
    pto_vta: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Número correlativo dentro del pto_vta + doc_type',
    },
    full_number: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Ej: 0001-00000123',
    },

    // Emisor (snapshot)
    issuer_cuit: { type: DataTypes.STRING(20), allowNull: true },
    issuer_name: { type: DataTypes.STRING(200), allowNull: true },
    issuer_iva_condition: { type: DataTypes.STRING(50), allowNull: true },

    // Receptor
    customer_id: { type: DataTypes.INTEGER, allowNull: true },
    receiver_doc_type: {
        type: DataTypes.ENUM('CUIT', 'CUIL', 'DNI', 'CF', 'OTRO'),
        allowNull: false,
        defaultValue: 'CF',
    },
    receiver_doc_number: { type: DataTypes.STRING(20), allowNull: true },
    receiver_name: { type: DataTypes.STRING(200), allowNull: true },
    receiver_iva_condition: { type: DataTypes.STRING(50), allowNull: true },
    receiver_address: { type: DataTypes.STRING(300), allowNull: true },

    // Totales
    currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'PES' },
    exchange_rate: { type: DataTypes.DECIMAL(12, 4), allowNull: false, defaultValue: 1 },
    net_amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    non_taxed_amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    exempt_amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    tax_amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    other_taxes_amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    total: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },

    // CAE / ARCA
    cae: { type: DataTypes.STRING(20), allowNull: true },
    cae_expiration: { type: DataTypes.DATEONLY, allowNull: true },
    qr_url: { type: DataTypes.TEXT, allowNull: true },
    pdf_url: { type: DataTypes.STRING(500), allowNull: true },

    // Estado interno
    status: {
        type: DataTypes.ENUM('draft', 'approved', 'rejected', 'void'),
        allowNull: false,
        defaultValue: 'draft',
    },
    mode: {
        type: DataTypes.ENUM('real', 'simulated'),
        allowNull: false,
        defaultValue: 'simulated',
        comment: 'real=con credenciales ARCA; simulated=stub',
    },
    afip_response: {
        type: DataTypes.TEXT('long'),
        allowNull: true,
        comment: 'JSON crudo de la respuesta AFIP (para debug)',
    },
    rejection_reason: { type: DataTypes.STRING(500), allowNull: true },

    issued_at: { type: DataTypes.DATE, allowNull: true },
    service_date_from: { type: DataTypes.DATEONLY, allowNull: true },
    service_date_to: { type: DataTypes.DATEONLY, allowNull: true },
    due_date: { type: DataTypes.DATEONLY, allowNull: true },

    notes: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.INTEGER, allowNull: true },
}, {
    tableName: 'invoices',
    timestamps: true,
    indexes: [
        { fields: ['doc_type'] },
        { fields: ['sale_id'] },
        { fields: ['customer_id'] },
        { fields: ['status'] },
        { fields: ['cae'] },
    ],
});

export default Invoice;
