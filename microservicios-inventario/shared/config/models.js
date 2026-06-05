export const sharedModels = ['Admin'];

export const modelOwnership = {
    productos: ['BusinessConfig', 'Branch', 'Category', 'Product', 'ProductVariant', 'PriceList', 'PriceListItem'],
    stock: ['Stock', 'StockMovement', 'StockTransfer', 'StockTransferItem'],
    ventas: ['Sale', 'SaleItem', 'SalePayment', 'CashRegister', 'CreditNote', 'CreditNoteItem'],
    compras: ['Admin', 'Supplier', 'PurchaseOrder', 'PurchaseOrderItem', 'Customer', 'CustomerTransaction'],
    facturacion: ['FiscalConfig', 'Invoice', 'InvoiceItem', 'InvoiceTax', 'FiscalSequence'],
    contabilidad: ['ChartOfAccount', 'JournalEntry', 'JournalEntryLine', 'VatBookEntry', 'TaxSetting', 'TaxWithholding'],
    tesoreria: ['BankAccount', 'BankMovement', 'Cheque'],
    marketplace: ['MarketplaceConnection', 'MarketplaceProduct', 'MarketplaceOrder'],
    'dashboard-bi': [],
};
