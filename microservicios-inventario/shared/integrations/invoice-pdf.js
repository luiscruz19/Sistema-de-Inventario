/**
 * Generador de PDF de facturas.
 * Usa pdfkit si está disponible; si no, devuelve un HTML simple.
 *
 * Función principal: streamInvoicePdf(res, invoice) escribe el PDF directamente
 * al response HTTP.
 */

function tryLoadPdfKit() {
    // Dependencia opcional. Si no está, retornamos null.
    // eslint-disable-next-line import/no-unresolved
    return import('pdfkit').then((m) => m.default || m).catch(() => null);
}

function tryLoadQr() {
    // eslint-disable-next-line import/no-unresolved
    return import('qrcode').then((m) => m.default || m).catch(() => null);
}

function formatCurrency(value) {
    const n = Number(value || 0);
    return `$ ${n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value) {
    if (!value) return '-';
    const d = new Date(value);
    return d.toLocaleDateString('es-AR');
}

/**
 * Escribe el PDF en el stream de response. Si pdfkit no está instalado,
 * hace fallback a un HTML estático con los datos de la factura.
 */
export async function streamInvoicePdf(res, invoice) {
    const PDFDocument = await tryLoadPdfKit();

    if (!PDFDocument) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(buildFallbackHtml(invoice));
        return;
    }

    const QR = await tryLoadQr();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="factura-${invoice.full_number || invoice.id}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.pipe(res);

    // Encabezado: tipo y número
    doc.fontSize(22).text(`COMPROBANTE ${invoice.doc_type}`, { align: 'center' });
    doc.moveDown(0.2);
    doc.fontSize(12).text(invoice.full_number || `${String(invoice.pto_vta).padStart(4, '0')}-${String(invoice.number).padStart(8, '0')}`, { align: 'center' });
    doc.moveDown(0.5);

    if (invoice.mode === 'simulated') {
        doc.fillColor('#b45309').fontSize(9).text('** Comprobante en modo simulado — pendiente de alta ARCA **', { align: 'center' });
        doc.fillColor('#000');
    }
    doc.moveDown();

    // Emisor
    doc.fontSize(10).text(`Emisor: ${invoice.issuer_name || '-'}`);
    doc.text(`CUIT: ${invoice.issuer_cuit || '-'}`);
    doc.text(`Condición IVA: ${invoice.issuer_iva_condition || '-'}`);
    doc.moveDown();

    // Receptor
    doc.text(`Cliente: ${invoice.receiver_name || 'Consumidor final'}`);
    doc.text(`Documento: ${invoice.receiver_doc_type || ''} ${invoice.receiver_doc_number || ''}`);
    if (invoice.receiver_iva_condition) doc.text(`Condición IVA: ${invoice.receiver_iva_condition}`);
    if (invoice.receiver_address) doc.text(`Domicilio: ${invoice.receiver_address}`);
    doc.moveDown();

    doc.text(`Fecha de emisión: ${formatDate(invoice.issued_at)}`);
    if (invoice.due_date) doc.text(`Vencimiento de pago: ${formatDate(invoice.due_date)}`);
    doc.moveDown();

    // Items
    const items = invoice.items || invoice.InvoiceItems || [];
    doc.fontSize(11).text('Detalle', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(9);

    items.forEach((it) => {
        const line = `${Number(it.quantity).toFixed(2)} x ${it.description}  @ ${formatCurrency(it.unit_price)}    ${formatCurrency(it.total)}`;
        doc.text(line);
    });

    doc.moveDown();

    // Totales
    doc.fontSize(10);
    doc.text(`Neto gravado: ${formatCurrency(invoice.net_amount)}`);
    if (Number(invoice.non_taxed_amount) > 0) doc.text(`No gravado: ${formatCurrency(invoice.non_taxed_amount)}`);
    if (Number(invoice.exempt_amount) > 0) doc.text(`Exento: ${formatCurrency(invoice.exempt_amount)}`);
    doc.text(`IVA: ${formatCurrency(invoice.tax_amount)}`);
    if (Number(invoice.other_taxes_amount) > 0) doc.text(`Otros tributos: ${formatCurrency(invoice.other_taxes_amount)}`);
    doc.font('Helvetica-Bold').text(`TOTAL: ${formatCurrency(invoice.total)}`);
    doc.font('Helvetica');
    doc.moveDown();

    // CAE
    if (invoice.cae) {
        doc.text(`CAE: ${invoice.cae}`);
        doc.text(`Vencimiento CAE: ${formatDate(invoice.cae_expiration)}`);
    }

    // QR
    if (QR && invoice.qr_url) {
        try {
            const pngBuffer = await QR.toBuffer(invoice.qr_url, { type: 'png', width: 180 });
            doc.image(pngBuffer, doc.page.width - 220, doc.y - 10, { width: 140 });
        } catch (err) {
            doc.text(`QR: ${invoice.qr_url}`);
        }
    } else if (invoice.qr_url) {
        doc.fontSize(7).text(`QR: ${invoice.qr_url}`);
    }

    doc.end();
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function buildFallbackHtml(invoice) {
    const items = invoice.items || invoice.InvoiceItems || [];
    const rows = items.map((it) => `
        <tr>
            <td>${Number(it.quantity).toFixed(2)}</td>
            <td>${escapeHtml(it.description)}</td>
            <td>${formatCurrency(it.unit_price)}</td>
            <td>${formatCurrency(it.total)}</td>
        </tr>
    `).join('');

    return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Factura ${escapeHtml(invoice.full_number || invoice.id)}</title>
<style>
    body { font-family: sans-serif; padding: 24px; color: #111; }
    h1 { text-align: center; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { padding: 6px 8px; border-bottom: 1px solid #ddd; text-align: left; font-size: 12px; }
    .totals { margin-top: 16px; font-size: 14px; }
    .totals .total { font-weight: bold; font-size: 16px; }
    .banner { background: #fef3c7; color: #92400e; padding: 8px; text-align: center; font-size: 12px; }
</style>
</head>
<body>
    <h1>COMPROBANTE ${escapeHtml(invoice.doc_type)}</h1>
    <p style="text-align:center">${escapeHtml(invoice.full_number || `${invoice.pto_vta}-${invoice.number}`)}</p>
    ${invoice.mode === 'simulated' ? '<div class="banner">Comprobante en modo simulado — pendiente de alta ARCA</div>' : ''}

    <p><strong>Emisor:</strong> ${escapeHtml(invoice.issuer_name || '-')} — CUIT ${escapeHtml(invoice.issuer_cuit || '-')}</p>
    <p><strong>Cliente:</strong> ${escapeHtml(invoice.receiver_name || 'Consumidor final')} — ${escapeHtml(invoice.receiver_doc_type || '')} ${escapeHtml(invoice.receiver_doc_number || '')}</p>
    <p><strong>Fecha:</strong> ${formatDate(invoice.issued_at)}</p>

    <table>
        <thead><tr><th>Cant.</th><th>Descripción</th><th>P. Unit.</th><th>Total</th></tr></thead>
        <tbody>${rows}</tbody>
    </table>

    <div class="totals">
        <p>Neto: ${formatCurrency(invoice.net_amount)}</p>
        <p>IVA: ${formatCurrency(invoice.tax_amount)}</p>
        <p class="total">TOTAL: ${formatCurrency(invoice.total)}</p>
        ${invoice.cae ? `<p>CAE: ${escapeHtml(invoice.cae)} — Vto: ${formatDate(invoice.cae_expiration)}</p>` : ''}
        ${invoice.qr_url ? `<p style="font-size:10px;word-break:break-all;">QR: ${escapeHtml(invoice.qr_url)}</p>` : ''}
    </div>
</body>
</html>`;
}
