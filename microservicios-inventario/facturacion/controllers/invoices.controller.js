import { Op } from 'sequelize';
import sequelize from '../db/sequelize.js';
import Invoice from '../models/Invoice.js';
import InvoiceItem from '../models/InvoiceItem.js';
import InvoiceTax from '../models/InvoiceTax.js';
import FiscalConfig from '../models/FiscalConfig.js';
import FiscalSequence from '../models/FiscalSequence.js';
import Sale from '../models/Sale.js';
import SaleItem from '../models/SaleItem.js';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import { errorMessage, successMessage } from '../utils/messages.js';
import {
    requestCae,
    buildAfipQrUrl,
    fetchLastAuthorized,
    AFIP_CBTE_TIPO,
} from '../integrations/arca.js';
import { streamInvoicePdf } from '../integrations/invoice-pdf.js';

const NC_MAP = { A: 'NCA', B: 'NCB', C: 'NCC' };

function resolveDocTypeFromIvaCondition(issuerCondition, receiverCondition) {
    // Monotributo/Exento emiten C a todo el mundo.
    if (!issuerCondition || ['monotributo', 'exento'].includes(issuerCondition)) return 'C';
    // Responsable inscripto: A si el receptor es RI, B para el resto.
    if (receiverCondition === 'responsable_inscripto') return 'A';
    return 'B';
}

function padNumber(ptoVta, number) {
    return `${String(ptoVta).padStart(4, '0')}-${String(number).padStart(8, '0')}`;
}

async function getNextNumber({ ptoVta, docType, transaction }) {
    // Preferir FECompUltimoAutorizado si hay credenciales reales.
    const remote = await fetchLastAuthorized({ pto_vta: ptoVta, doc_type: docType });
    const [seq] = await FiscalSequence.findOrCreate({
        where: { pto_vta: ptoVta, doc_type: docType },
        defaults: { pto_vta: ptoVta, doc_type: docType, last_number: remote.last_number || 0 },
        transaction,
    });

    const base = Math.max(Number(seq.last_number) || 0, Number(remote.last_number) || 0);
    const next = base + 1;
    await seq.update({ last_number: next, last_synced_at: new Date() }, { transaction });
    return next;
}

function groupTaxes(items) {
    const map = new Map();
    for (const it of items) {
        const rate = Number(it.tax_rate) || 0;
        const base = Number(it.net_amount) || 0;
        const tax = Number(it.tax_amount) || 0;
        const cur = map.get(rate) || { rate, base: 0, amount: 0 };
        cur.base += base;
        cur.amount += tax;
        map.set(rate, cur);
    }
    return Array.from(map.values());
}

/**
 * GET /invoices — listado paginado con filtros.
 */
export async function list(req, res) {
    try {
        const { page = 1, limit = 20, status, doc_type, customer_id, sale_id, date_from, date_to, search } = req.query;
        const where = {};

        if (status) where.status = status;
        if (doc_type) where.doc_type = doc_type;
        if (customer_id) where.customer_id = Number(customer_id);
        if (sale_id) where.sale_id = Number(sale_id);
        if (date_from && date_to) {
            where.issued_at = { [Op.between]: [new Date(date_from), new Date(date_to + 'T23:59:59')] };
        } else if (date_from) {
            where.issued_at = { [Op.gte]: new Date(date_from) };
        } else if (date_to) {
            where.issued_at = { [Op.lte]: new Date(date_to + 'T23:59:59') };
        }
        if (search) {
            where[Op.or] = [
                { full_number: { [Op.like]: `%${search}%` } },
                { receiver_name: { [Op.like]: `%${search}%` } },
                { receiver_doc_number: { [Op.like]: `%${search}%` } },
                { cae: { [Op.like]: `%${search}%` } },
            ];
        }

        const offset = (Number(page) - 1) * Number(limit);
        const { rows, count } = await Invoice.findAndCountAll({
            where,
            include: [
                { model: Customer, as: 'customer', attributes: ['id', 'name', 'tax_id'], required: false },
                { model: Sale, as: 'sale', attributes: ['id', 'sale_number'], required: false },
            ],
            order: [['createdAt', 'DESC']],
            limit: Number(limit),
            offset,
        });

        return res.status(200).json(successMessage({
            message: 'Listado de facturas',
            extra: {
                data: rows,
                pagination: {
                    totalItems: count,
                    totalPages: Math.ceil(count / Number(limit)),
                    currentPage: Number(page),
                    perPage: Number(limit),
                },
            },
        }));
    } catch (err) {
        console.error('Error list invoices:', err);
        return res.status(500).json(errorMessage({ message: 'Error al listar facturas' }));
    }
}

/**
 * GET /invoices/:id — detalle.
 */
export async function getById(req, res) {
    try {
        const invoice = await Invoice.findOne({
            where: { id: req.params.id },
            include: [
                { model: InvoiceItem, as: 'items' },
                { model: InvoiceTax, as: 'taxes' },
                { model: Customer, as: 'customer', required: false },
                { model: Sale, as: 'sale', required: false },
                { model: Invoice, as: 'parentInvoice', required: false },
            ],
        });
        if (!invoice) {
            return res.status(404).json(errorMessage({ message: 'Factura no encontrada' }));
        }
        return res.status(200).json(successMessage({
            message: 'Factura obtenida',
            extra: { data: invoice },
        }));
    } catch (err) {
        console.error('Error get invoice:', err);
        return res.status(500).json(errorMessage({ message: 'Error al obtener factura' }));
    }
}

/**
 * Helper interno: materializa una factura en la DB con sus items, taxes y CAE.
 */
async function persistInvoice({
    userId, docType, fiscalConfig, saleId = null, parentInvoiceId = null,
    customer, receiver, items, notes, service_date_from, service_date_to, due_date,
    transaction,
}) {
    const ptoVta = fiscalConfig.pto_vta;
    const number = await getNextNumber({ ptoVta, docType, transaction });

    let netTotal = 0;
    let taxTotal = 0;
    let grandTotal = 0;

    const normalizedItems = items.map((raw) => {
        const qty = Number(raw.quantity ?? 1);
        const unitPrice = Number(raw.unit_price ?? 0);
        const discountPct = Number(raw.discount_percentage ?? 0);
        const taxRate = Number(raw.tax_rate ?? 21);
        const netAmount = Number((qty * unitPrice * (1 - discountPct / 100)).toFixed(2));
        const taxAmount = Number((netAmount * taxRate / 100).toFixed(2));
        const total = Number((netAmount + taxAmount).toFixed(2));

        netTotal += netAmount;
        taxTotal += taxAmount;
        grandTotal += total;

        return {
            product_id: raw.product_id || null,
            variant_id: raw.variant_id || null,
            sale_item_id: raw.sale_item_id || null,
            description: raw.description || 'Producto/Servicio',
            quantity: qty,
            unit: raw.unit || null,
            unit_price: unitPrice,
            discount_percentage: discountPct,
            net_amount: netAmount,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            total,
        };
    });

    netTotal = Number(netTotal.toFixed(2));
    taxTotal = Number(taxTotal.toFixed(2));
    grandTotal = Number(grandTotal.toFixed(2));

    // 1) Crear factura en estado draft para fijar el id.
    const invoice = await Invoice.create({
        sale_id: saleId,
        parent_invoice_id: parentInvoiceId,
        doc_type: docType,
        afip_cbte_tipo: AFIP_CBTE_TIPO[docType] || null,
        pto_vta: ptoVta,
        number,
        full_number: padNumber(ptoVta, number),

        issuer_cuit: fiscalConfig.cuit,
        issuer_name: fiscalConfig.business_name,
        issuer_iva_condition: fiscalConfig.iva_condition,

        customer_id: customer?.id || null,
        receiver_doc_type: receiver.doc_type || 'CF',
        receiver_doc_number: receiver.doc_number || null,
        receiver_name: receiver.name || 'Consumidor final',
        receiver_iva_condition: receiver.iva_condition || null,
        receiver_address: receiver.address || null,

        currency: 'PES',
        exchange_rate: 1,
        net_amount: netTotal,
        tax_amount: taxTotal,
        total: grandTotal,

        status: 'draft',
        mode: 'simulated',
        issued_at: new Date(),
        service_date_from,
        service_date_to,
        due_date,
        notes,
        created_by: userId,
    }, { transaction });

    // 2) Items + taxes agrupados.
    for (const it of normalizedItems) {
        await InvoiceItem.create({ ...it, invoice_id: invoice.id }, { transaction });
    }

    const taxGroups = groupTaxes(normalizedItems);
    for (const tg of taxGroups) {
        await InvoiceTax.create({
            invoice_id: invoice.id,
            kind: 'iva',
            description: `IVA ${tg.rate}%`,
            base_amount: Number(tg.base.toFixed(2)),
            rate: tg.rate,
            amount: Number(tg.amount.toFixed(2)),
        }, { transaction });
    }

    // 3) Pedir CAE (real o stub)
    const caeResult = await requestCae({
        doc_type: docType,
        pto_vta: ptoVta,
        number,
        total: grandTotal,
        net_amount: netTotal,
        tax_amount: taxTotal,
        receiver_doc_type: invoice.receiver_doc_type,
        receiver_doc_number: invoice.receiver_doc_number,
        issued_at: invoice.issued_at,
    });

    const qrUrl = caeResult.cae ? buildAfipQrUrl({
        cuit: fiscalConfig.cuit,
        pto_vta: ptoVta,
        doc_type: docType,
        number,
        total: grandTotal,
        issued_at: invoice.issued_at,
        cae: caeResult.cae,
        receiver_doc_type: invoice.receiver_doc_type,
        receiver_doc_number: invoice.receiver_doc_number,
    }) : null;

    await invoice.update({
        status: caeResult.status,
        mode: caeResult.mode,
        cae: caeResult.cae,
        cae_expiration: caeResult.cae_expiration,
        qr_url: qrUrl,
        afip_response: caeResult.afip_response ? JSON.stringify(caeResult.afip_response) : null,
        rejection_reason: caeResult.rejection_reason || null,
    }, { transaction });

    return invoice;
}

/**
 * POST /invoices — emite una factura. Dos variantes:
 *   a) desde venta: body { sale_id, doc_type? }
 *   b) manual:      body { items: [...], customer_id?, receiver?, doc_type? }
 */
export async function create(req, res) {
    const t = await sequelize.transaction();
    try {
        const userId = req.user?.id || null;
        const { sale_id, customer_id, receiver: bodyReceiver, items: bodyItems, doc_type, notes, service_date_from, service_date_to, due_date } = req.body;

        const fiscalConfig = await FiscalConfig.findOne({ transaction: t });
        if (!fiscalConfig) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'Primero debes completar la configuración fiscal.' }));
        }

        let customer = null;
        let receiver;
        let items;

        if (sale_id) {
            const sale = await Sale.findOne({
                where: { id: sale_id },
                include: [
                    { model: SaleItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'unit', 'tax_rate'] }] },
                    { model: Customer, as: 'customer', required: false },
                ],
                transaction: t,
            });
            if (!sale) {
                await t.rollback();
                return res.status(404).json(errorMessage({ message: 'Venta no encontrada' }));
            }

            customer = sale.customer || null;
            receiver = {
                doc_type: customer?.tax_id ? 'CUIT' : 'CF',
                doc_number: customer?.tax_id || null,
                name: customer?.name || 'Consumidor final',
                iva_condition: customer?.iva_condition || null,
                address: customer?.address || null,
            };

            items = (sale.items || []).map((si) => {
                const net = Number(si.subtotal || 0);
                const taxRate = Number(si.product?.tax_rate ?? 21);
                return {
                    sale_item_id: si.id,
                    product_id: si.product_id,
                    variant_id: si.variant_id,
                    description: si.product?.name || `Producto #${si.product_id}`,
                    quantity: Number(si.quantity),
                    unit: si.product?.unit || 'UN',
                    unit_price: Number(si.unit_price),
                    discount_percentage: Number(si.discount_percentage || 0),
                    tax_rate: taxRate,
                    // Dejar que persistInvoice recalcule neto/impuesto desde precio unitario;
                    // si el POS ya guardó subtotal como neto, usamos eso como sanity check.
                    _net_hint: net,
                };
            });
        } else {
            if (customer_id) {
                customer = await Customer.findOne({ where: { id: customer_id }, transaction: t });
            }
            receiver = bodyReceiver || {
                doc_type: customer?.tax_id ? 'CUIT' : 'CF',
                doc_number: customer?.tax_id || null,
                name: customer?.name || 'Consumidor final',
                iva_condition: customer?.iva_condition || null,
                address: customer?.address || null,
            };
            items = bodyItems || [];
        }

        if (!items || items.length === 0) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'La factura debe tener al menos un item' }));
        }

        const docType = doc_type || resolveDocTypeFromIvaCondition(fiscalConfig.iva_condition, receiver.iva_condition);

        const invoice = await persistInvoice({
            userId, docType, fiscalConfig, saleId: sale_id || null,
            customer, receiver, items, notes, service_date_from, service_date_to, due_date,
            transaction: t,
        });

        await t.commit();

        return res.status(201).json(successMessage({
            message: invoice.status === 'approved' ? 'Factura emitida' : 'Factura generada con rechazo',
            extra: { data: invoice },
        }));
    } catch (err) {
        await t.rollback();
        console.error('Error creating invoice:', err);
        return res.status(500).json(errorMessage({ message: err.message || 'Error al emitir la factura' }));
    }
}

/**
 * POST /invoices/:id/credit-note — emite una NC asociada a una factura.
 * Por defecto revierte todos los items; se puede pasar body.items para parcial.
 */
export async function createCreditNote(req, res) {
    const t = await sequelize.transaction();
    try {
        const userId = req.user?.id || null;

        const original = await Invoice.findOne({
            where: { id: req.params.id },
            include: [{ model: InvoiceItem, as: 'items' }],
            transaction: t,
        });
        if (!original) {
            await t.rollback();
            return res.status(404).json(errorMessage({ message: 'Factura original no encontrada' }));
        }
        if (!['A', 'B', 'C'].includes(original.doc_type)) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'Solo se pueden emitir NC sobre facturas A/B/C' }));
        }

        const fiscalConfig = await FiscalConfig.findOne({ transaction: t });
        if (!fiscalConfig) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'Falta configuración fiscal' }));
        }

        const items = (req.body.items?.length ? req.body.items : original.items.map((it) => ({
            description: it.description,
            quantity: it.quantity,
            unit_price: it.unit_price,
            discount_percentage: it.discount_percentage,
            tax_rate: it.tax_rate,
            product_id: it.product_id,
            variant_id: it.variant_id,
            sale_item_id: it.sale_item_id,
            unit: it.unit,
        })));

        const receiver = {
            doc_type: original.receiver_doc_type,
            doc_number: original.receiver_doc_number,
            name: original.receiver_name,
            iva_condition: original.receiver_iva_condition,
            address: original.receiver_address,
        };

        const nc = await persistInvoice({
            userId,
            docType: NC_MAP[original.doc_type],
            fiscalConfig,
            saleId: original.sale_id,
            parentInvoiceId: original.id,
            customer: null,
            receiver,
            items,
            notes: req.body.notes || `NC por comprobante ${original.full_number}`,
            transaction: t,
        });

        await t.commit();

        return res.status(201).json(successMessage({
            message: 'Nota de crédito emitida',
            extra: { data: nc },
        }));
    } catch (err) {
        await t.rollback();
        console.error('Error creating credit note:', err);
        return res.status(500).json(errorMessage({ message: err.message || 'Error al emitir NC' }));
    }
}

/**
 * POST /invoices/:id/void — anula una factura emitiendo una NC automática
 * y marcando la factura original como void.
 */
export async function voidInvoice(req, res) {
    const t = await sequelize.transaction();
    try {
        const invoice = await Invoice.findOne({
            where: { id: req.params.id },
            include: [{ model: InvoiceItem, as: 'items' }],
            transaction: t,
        });
        if (!invoice) {
            await t.rollback();
            return res.status(404).json(errorMessage({ message: 'Factura no encontrada' }));
        }
        if (invoice.status === 'void') {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'La factura ya está anulada' }));
        }

        const fiscalConfig = await FiscalConfig.findOne({ transaction: t });
        if (!fiscalConfig) {
            await t.rollback();
            return res.status(400).json(errorMessage({ message: 'Falta configuración fiscal' }));
        }

        if (['A', 'B', 'C'].includes(invoice.doc_type)) {
            await persistInvoice({
                userId: req.user?.id || null,
                docType: NC_MAP[invoice.doc_type],
                fiscalConfig,
                saleId: invoice.sale_id,
                parentInvoiceId: invoice.id,
                customer: null,
                receiver: {
                    doc_type: invoice.receiver_doc_type,
                    doc_number: invoice.receiver_doc_number,
                    name: invoice.receiver_name,
                    iva_condition: invoice.receiver_iva_condition,
                    address: invoice.receiver_address,
                },
                items: invoice.items.map((it) => ({
                    description: it.description,
                    quantity: it.quantity,
                    unit_price: it.unit_price,
                    discount_percentage: it.discount_percentage,
                    tax_rate: it.tax_rate,
                    product_id: it.product_id,
                    variant_id: it.variant_id,
                    sale_item_id: it.sale_item_id,
                    unit: it.unit,
                })),
                notes: `Anulación automática de ${invoice.full_number}`,
                transaction: t,
            });
        }

        await invoice.update({ status: 'void' }, { transaction: t });
        await t.commit();
        return res.status(200).json(successMessage({ message: 'Factura anulada', extra: { data: invoice } }));
    } catch (err) {
        await t.rollback();
        console.error('Error voiding invoice:', err);
        return res.status(500).json(errorMessage({ message: err.message || 'Error al anular la factura' }));
    }
}

/**
 * GET /invoices/:id/cae-status — devuelve el estado actual del CAE.
 */
export async function caeStatus(req, res) {
    try {
        const invoice = await Invoice.findOne({
            where: { id: req.params.id },
            attributes: ['id', 'status', 'mode', 'cae', 'cae_expiration', 'full_number', 'rejection_reason'],
        });
        if (!invoice) return res.status(404).json(errorMessage({ message: 'Factura no encontrada' }));

        return res.status(200).json(successMessage({
            message: 'Estado CAE',
            extra: { data: invoice },
        }));
    } catch (err) {
        console.error('Error cae-status:', err);
        return res.status(500).json(errorMessage({ message: 'Error al consultar el estado' }));
    }
}

/**
 * GET /invoices/:id/pdf — descarga el PDF de la factura.
 */
export async function pdf(req, res) {
    try {
        const invoice = await Invoice.findOne({
            where: { id: req.params.id },
            include: [{ model: InvoiceItem, as: 'items' }, { model: InvoiceTax, as: 'taxes' }],
        });
        if (!invoice) {
            return res.status(404).json(errorMessage({ message: 'Factura no encontrada' }));
        }
        await streamInvoicePdf(res, invoice.toJSON());
    } catch (err) {
        console.error('Error pdf invoice:', err);
        if (!res.headersSent) {
            res.status(500).json(errorMessage({ message: 'Error al generar el PDF' }));
        }
    }
}

/**
 * GET /invoices/last-authorized?pto_vta=1&doc_type=B — consulta WSFEv1.
 */
export async function lastAuthorized(req, res) {
    try {
        const pto_vta = Number(req.query.pto_vta || 1);
        const doc_type = String(req.query.doc_type || 'B');
        const result = await fetchLastAuthorized({ pto_vta, doc_type });
        return res.status(200).json(successMessage({
            message: 'Último comprobante autorizado',
            extra: { data: result },
        }));
    } catch (err) {
        console.error('Error last-authorized:', err);
        return res.status(500).json(errorMessage({ message: 'Error al consultar último comprobante' }));
    }
}

/**
 * POST /invoices/:id/retry — reintenta solicitar CAE en una factura rechazada.
 */
export async function retryCae(req, res) {
    const t = await sequelize.transaction();
    try {
        const invoice = await Invoice.findOne({
            where: { id: req.params.id, status: 'rejected' },
            transaction: t,
        });
        if (!invoice) {
            await t.rollback();
            return res.status(404).json(errorMessage({ message: 'Factura rechazada no encontrada' }));
        }

        const caeResult = await requestCae({
            doc_type: invoice.doc_type,
            pto_vta: invoice.pto_vta,
            number: invoice.number,
            total: Number(invoice.total),
            net_amount: Number(invoice.net_amount),
            tax_amount: Number(invoice.tax_amount),
            receiver_doc_type: invoice.receiver_doc_type,
            receiver_doc_number: invoice.receiver_doc_number,
            issued_at: invoice.issued_at,
        });

        const qrUrl = caeResult.cae ? buildAfipQrUrl({
            cuit: invoice.issuer_cuit,
            pto_vta: invoice.pto_vta,
            doc_type: invoice.doc_type,
            number: invoice.number,
            total: invoice.total,
            issued_at: invoice.issued_at,
            cae: caeResult.cae,
            receiver_doc_type: invoice.receiver_doc_type,
            receiver_doc_number: invoice.receiver_doc_number,
        }) : null;

        await invoice.update({
            status: caeResult.status,
            mode: caeResult.mode,
            cae: caeResult.cae,
            cae_expiration: caeResult.cae_expiration,
            qr_url: qrUrl,
            afip_response: caeResult.afip_response ? JSON.stringify(caeResult.afip_response) : null,
            rejection_reason: caeResult.rejection_reason || null,
        }, { transaction: t });

        await t.commit();
        return res.status(200).json(successMessage({
            message: caeResult.status === 'approved' ? 'CAE obtenido' : 'Sigue rechazada',
            extra: { data: invoice },
        }));
    } catch (err) {
        await t.rollback();
        console.error('Error retry cae:', err);
        return res.status(500).json(errorMessage({ message: 'Error al reintentar CAE' }));
    }
}
