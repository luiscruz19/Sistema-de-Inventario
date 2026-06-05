/**
 * Servicio compartido de contabilidad: generación de asientos automáticos
 * en el libro diario al confirmar ventas y compras.
 *
 * El asiento se genera SOLO si:
 *   - business_configs.accounting_auto_entries === true
 *   - existe un plan de cuentas con las cuentas mapeadas en la configuración
 *
 * Si falta configuración, la función no falla la operación de negocio: simplemente
 * no genera el asiento y devuelve null (la venta/compra se confirma igual).
 *
 * Todas las funciones reciben una transacción Sequelize existente para que el
 * asiento se haga atómico junto a la operación que lo origina.
 */

import BusinessConfig from '../models/BusinessConfig.js';
import ChartOfAccount from '../models/ChartOfAccount.js';
import JournalEntry from '../models/JournalEntry.js';
import JournalEntryLine from '../models/JournalEntryLine.js';

const round = (n) => Number(Number(n || 0).toFixed(2));

/**
 * Resuelve cuentas por código dentro de una transacción.
 * @returns {Promise<Map<string, object>>} mapa codigo -> cuenta
 */
async function resolveAccounts(codes, t) {
    const filtered = [...new Set(codes.filter(Boolean))];
    if (filtered.length === 0) return new Map();
    const accounts = await ChartOfAccount.findAll({
        where: { codigo: filtered },
        transaction: t,
    });
    return new Map(accounts.map((a) => [a.codigo, a]));
}

/**
 * Crea un asiento balanceado a partir de líneas {codigo, debe, haber, descripcion}.
 * Aplica el saldo a cada cuenta. Devuelve el asiento creado o null si no se pudo.
 */
async function createEntry({ config, fecha, descripcion, referencia_tipo, referencia_id, rawLines, t }) {
    const codes = rawLines.map((l) => l.codigo);
    const accountMap = await resolveAccounts(codes, t);

    // Si falta alguna cuenta del mapeo, no se genera el asiento (configuración incompleta).
    const lines = [];
    for (const l of rawLines) {
        const account = accountMap.get(l.codigo);
        if (!account) return null;
        const debe = round(l.debe);
        const haber = round(l.haber);
        if (debe === 0 && haber === 0) continue;
        lines.push({ account, debe, haber, descripcion: l.descripcion || null });
    }
    if (lines.length < 2) return null;

    const total_debe = round(lines.reduce((s, l) => s + l.debe, 0));
    const total_haber = round(lines.reduce((s, l) => s + l.haber, 0));
    if (Math.abs(total_debe - total_haber) > 0.01) return null;

    // Número correlativo
    const count = await JournalEntry.count({ transaction: t });

    const entry = await JournalEntry.create({
        fecha,
        numero: count + 1,
        descripcion,
        tipo: 'automatico',
        referencia_tipo: referencia_tipo || null,
        referencia_id: referencia_id || null,
        total_debe,
        total_haber,
        aprobado: true,
    }, { transaction: t });

    await JournalEntryLine.bulkCreate(
        lines.map((l) => ({
            journal_entry_id: entry.id,
            account_id: l.account.id,
            descripcion: l.descripcion,
            debe: l.debe,
            haber: l.haber,
        })),
        { transaction: t }
    );

    // Actualizar saldos de las cuentas involucradas
    for (const l of lines) {
        const delta = l.debe - l.haber;
        await l.account.update({ saldo: round(Number(l.account.saldo) + delta) }, { transaction: t });
    }

    return entry;
}

/**
 * Genera el asiento de una venta confirmada.
 * Cobranza al contado -> Caja; a cuenta corriente -> Deudores por ventas.
 *
 * @param {object} params
 * @param {object} params.sale - instancia/JSON de Sale (subtotal, discount_amount, tax_amount, total, payment_method, completed_at)
 * @param {boolean} params.onAccount - true si la venta es a cuenta corriente (no cobrada al contado)
 * @param {import('sequelize').Transaction} params.transaction
 * @returns {Promise<object|null>}
 */
export async function generateSaleEntry({ sale, onAccount = false, transaction }) {
    const config = await BusinessConfig.findOne({ transaction });
    if (!config || config.accounting_auto_entries !== true) return null;

    const netSales = round(Number(sale.subtotal) - Number(sale.discount_amount || 0));
    const vat = round(sale.tax_amount);
    const total = round(sale.total);
    if (total <= 0) return null;

    const debitAccount = onAccount ? config.acc_receivable_account : config.acc_cash_account;

    const rawLines = [
        { codigo: debitAccount, debe: total, haber: 0, descripcion: 'Venta' },
        { codigo: config.acc_sales_account, debe: 0, haber: netSales, descripcion: 'Ingreso por ventas' },
        { codigo: config.acc_vat_debit_account, debe: 0, haber: vat, descripcion: 'IVA débito fiscal' },
    ];

    const fecha = (sale.completed_at ? new Date(sale.completed_at) : new Date()).toISOString().slice(0, 10);

    return createEntry({
        config,
        fecha,
        descripcion: `Venta ${sale.sale_number || sale.id}`,
        referencia_tipo: 'sale',
        referencia_id: sale.id,
        rawLines,
        t: transaction,
    });
}

/**
 * Genera el asiento de una compra recibida (alta de mercadería + deuda con proveedor).
 *
 * @param {object} params
 * @param {object} params.purchaseOrder - subtotal, tax_amount, total, id, order_number
 * @param {import('sequelize').Transaction} params.transaction
 * @returns {Promise<object|null>}
 */
export async function generatePurchaseEntry({ purchaseOrder, transaction }) {
    const config = await BusinessConfig.findOne({ transaction });
    if (!config || config.accounting_auto_entries !== true) return null;

    const net = round(purchaseOrder.subtotal);
    const vat = round(purchaseOrder.tax_amount);
    const total = round(purchaseOrder.total);
    if (total <= 0) return null;

    // Débito: mercaderías (o compras) + IVA crédito. Crédito: proveedores.
    const debitGoods = config.acc_inventory_account || config.acc_purchases_account;

    const rawLines = [
        { codigo: debitGoods, debe: net, haber: 0, descripcion: 'Mercadería recibida' },
        { codigo: config.acc_vat_credit_account, debe: vat, haber: 0, descripcion: 'IVA crédito fiscal' },
        { codigo: config.acc_payable_account, debe: 0, haber: total, descripcion: 'Deuda con proveedor' },
    ];

    const fecha = new Date().toISOString().slice(0, 10);

    return createEntry({
        config,
        fecha,
        descripcion: `Compra ${purchaseOrder.order_number || purchaseOrder.id}`,
        referencia_tipo: 'purchase_order',
        referencia_id: purchaseOrder.id,
        rawLines,
        t: transaction,
    });
}

export default { generateSaleEntry, generatePurchaseEntry };
