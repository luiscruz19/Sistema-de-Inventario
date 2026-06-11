export interface TicketLine {
    name: string
    quantity: number
    unitPrice: number
}

export interface TicketData {
    number: string
    date: string
    docType?: string
    customer?: string
    branch?: string
    items: TicketLine[]
    subtotal: number
    iva: number
    total: number
    payments?: { method: string; amount: number }[]
    business?: string
}

const METHOD: Record<string, string> = {
    cash: 'Efectivo', card: 'Tarjeta', transfer: 'Transferencia',
    mercadopago: 'MercadoPago', credit: 'Crédito', mixed: 'Mixto',
}
const money = (n: number) =>
    '$' + Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const esc = (s: string) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))

/** Abre una ventana con el comprobante (formato ticket ~80mm) y dispara la impresión. */
export function printTicket(t: TicketData) {
    const rows = t.items.map(i => `
        <tr>
            <td>${esc(i.name)}<br><span class="muted">${i.quantity} × ${money(i.unitPrice)}</span></td>
            <td class="r">${money(i.quantity * i.unitPrice)}</td>
        </tr>`).join('')
    const pays = (t.payments || []).map(p =>
        `<div class="row"><span>${METHOD[p.method] || p.method}</span><span>${money(p.amount)}</span></div>`).join('')

    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(t.number)}</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: 'Inter', ui-monospace, monospace; color: #14171c; }
  .ticket { width: 300px; margin: 0 auto; padding: 18px 16px; font-size: 12px; line-height: 1.45; }
  h1 { font-size: 15px; text-align: center; margin: 0 0 2px; letter-spacing: -0.01em; }
  .muted { color: #6b727e; }
  .center { text-align: center; }
  hr { border: 0; border-top: 1px dashed #c7ccd4; margin: 10px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 3px 0; vertical-align: top; }
  td.r { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .row { display: flex; justify-content: space-between; padding: 2px 0; font-variant-numeric: tabular-nums; }
  .total { font-size: 15px; font-weight: 700; margin-top: 4px; }
  @media print { @page { margin: 6mm; } }
</style></head>
<body onload="window.focus();window.print();">
  <div class="ticket">
    <h1>${esc(t.business || 'Sistema de Inventario')}</h1>
    <p class="center muted" style="margin:0 0 8px">${esc(t.docType || 'Comprobante')} · ${esc(t.number)}</p>
    <p class="muted" style="margin:0">${esc(t.date)}</p>
    ${t.branch ? `<p class="muted" style="margin:0">${esc(t.branch)}</p>` : ''}
    ${t.customer ? `<p class="muted" style="margin:2px 0 0">Cliente: ${esc(t.customer)}</p>` : ''}
    <hr>
    <table>${rows}</table>
    <hr>
    <div class="row"><span class="muted">Subtotal</span><span>${money(t.subtotal)}</span></div>
    <div class="row"><span class="muted">IVA 21%</span><span>${money(t.iva)}</span></div>
    <div class="row total"><span>TOTAL</span><span>${money(t.total)}</span></div>
    ${pays ? `<hr>${pays}` : ''}
    <hr>
    <p class="center muted">¡Gracias por su compra!</p>
  </div>
</body></html>`

    const w = window.open('', '_blank', 'width=400,height=660')
    if (!w) { alert('Habilitá las ventanas emergentes para poder imprimir el comprobante.'); return }
    w.document.write(html)
    w.document.close()
}
