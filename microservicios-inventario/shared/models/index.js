import Admin from './Admin.js';
import BusinessConfig from './BusinessConfig.js';
import Branch from './Branch.js';
import Category from './Category.js';
import Product from './Product.js';
import ProductVariant from './ProductVariant.js';
import Stock from './Stock.js';
import StockMovement from './StockMovement.js';
import StockTransfer from './StockTransfer.js';
import StockTransferItem from './StockTransferItem.js';
import Supplier from './Supplier.js';
import PurchaseOrder from './PurchaseOrder.js';
import PurchaseOrderItem from './PurchaseOrderItem.js';
import Customer from './Customer.js';
import Sale from './Sale.js';
import SaleItem from './SaleItem.js';
import SalePayment from './SalePayment.js';
import PriceList from './PriceList.js';
import PriceListItem from './PriceListItem.js';
import CashRegister from './CashRegister.js';
import CreditNote from './CreditNote.js';
import CreditNoteItem from './CreditNoteItem.js';
import CustomerTransaction from './CustomerTransaction.js';
import FiscalConfig from './FiscalConfig.js';
import Invoice from './Invoice.js';
import InvoiceItem from './InvoiceItem.js';
import InvoiceTax from './InvoiceTax.js';
import FiscalSequence from './FiscalSequence.js';
import ProductBatch from './ProductBatch.js';
import ProductSerial from './ProductSerial.js';
import ReturnRequest from './ReturnRequest.js';
import ReturnRequestItem from './ReturnRequestItem.js';
import BankAccount from './BankAccount.js';
import BankMovement from './BankMovement.js';
import Cheque from './Cheque.js';
import ChartOfAccount from './ChartOfAccount.js';
import JournalEntry from './JournalEntry.js';
import JournalEntryLine from './JournalEntryLine.js';
import VatBookEntry from './VatBookEntry.js';
import TaxSetting from './TaxSetting.js';
import TaxWithholding from './TaxWithholding.js';
import MarketplaceConnection from './MarketplaceConnection.js';
import MarketplaceProduct from './MarketplaceProduct.js';
import MarketplaceOrder from './MarketplaceOrder.js';

let associationsConfigured = false;

function setupAssociations() {
    if (associationsConfigured) {
        return;
    }

    associationsConfigured = true;

    // Category self-referencing (subcategorías)
    Category.hasMany(Category, {
        foreignKey: 'parent_id',
        as: 'subcategories'
    });

    Category.belongsTo(Category, {
        foreignKey: 'parent_id',
        as: 'parent'
    });

    // Category -> Products
    Category.hasMany(Product, {
        foreignKey: 'category_id',
        as: 'products'
    });

    Product.belongsTo(Category, {
        foreignKey: 'category_id',
        as: 'category'
    });

    // Product -> ProductVariants
    Product.hasMany(ProductVariant, {
        foreignKey: 'product_id',
        as: 'variants'
    });

    ProductVariant.belongsTo(Product, {
        foreignKey: 'product_id',
        as: 'product'
    });

    // Product -> Stock
    Product.hasMany(Stock, {
        foreignKey: 'product_id',
        as: 'stockEntries'
    });

    Stock.belongsTo(Product, {
        foreignKey: 'product_id',
        as: 'product'
    });

    // ProductVariant -> Stock
    ProductVariant.hasMany(Stock, {
        foreignKey: 'variant_id',
        as: 'stockEntries'
    });

    Stock.belongsTo(ProductVariant, {
        foreignKey: 'variant_id',
        as: 'variant'
    });

    // Branch -> Stock
    Branch.hasMany(Stock, {
        foreignKey: 'branch_id',
        as: 'stockEntries'
    });

    Stock.belongsTo(Branch, {
        foreignKey: 'branch_id',
        as: 'branch'
    });

    // Product -> StockMovements
    Product.hasMany(StockMovement, {
        foreignKey: 'product_id',
        as: 'stockMovements'
    });

    StockMovement.belongsTo(Product, {
        foreignKey: 'product_id',
        as: 'product'
    });

    StockMovement.belongsTo(ProductVariant, {
        foreignKey: 'variant_id',
        as: 'variant'
    });

    StockMovement.belongsTo(Branch, {
        foreignKey: 'branch_id',
        as: 'branch'
    });

    // StockTransfer -> Branches (from/to)
    Branch.hasMany(StockTransfer, {
        foreignKey: 'from_branch_id',
        as: 'outgoingTransfers'
    });

    Branch.hasMany(StockTransfer, {
        foreignKey: 'to_branch_id',
        as: 'incomingTransfers'
    });

    StockTransfer.belongsTo(Branch, {
        foreignKey: 'from_branch_id',
        as: 'fromBranch'
    });

    StockTransfer.belongsTo(Branch, {
        foreignKey: 'to_branch_id',
        as: 'toBranch'
    });

    // StockTransfer -> StockTransferItems
    StockTransfer.hasMany(StockTransferItem, {
        foreignKey: 'transfer_id',
        as: 'items'
    });

    StockTransferItem.belongsTo(StockTransfer, {
        foreignKey: 'transfer_id',
        as: 'transfer'
    });

    StockTransferItem.belongsTo(Product, {
        foreignKey: 'product_id',
        as: 'product'
    });

    StockTransferItem.belongsTo(ProductVariant, {
        foreignKey: 'variant_id',
        as: 'variant'
    });

    // Supplier -> PurchaseOrders
    Supplier.hasMany(PurchaseOrder, {
        foreignKey: 'supplier_id',
        as: 'purchaseOrders'
    });

    PurchaseOrder.belongsTo(Supplier, {
        foreignKey: 'supplier_id',
        as: 'supplier'
    });

    PurchaseOrder.belongsTo(Branch, {
        foreignKey: 'branch_id',
        as: 'branch'
    });

    // PurchaseOrder -> PurchaseOrderItems
    PurchaseOrder.hasMany(PurchaseOrderItem, {
        foreignKey: 'purchase_order_id',
        as: 'items'
    });

    PurchaseOrderItem.belongsTo(PurchaseOrder, {
        foreignKey: 'purchase_order_id',
        as: 'purchaseOrder'
    });

    PurchaseOrderItem.belongsTo(Product, {
        foreignKey: 'product_id',
        as: 'product'
    });

    PurchaseOrderItem.belongsTo(ProductVariant, {
        foreignKey: 'variant_id',
        as: 'variant'
    });

    // Customer -> Sales
    Customer.hasMany(Sale, {
        foreignKey: 'customer_id',
        as: 'sales'
    });

    Sale.belongsTo(Customer, {
        foreignKey: 'customer_id',
        as: 'customer'
    });

    Sale.belongsTo(Branch, {
        foreignKey: 'branch_id',
        as: 'branch'
    });

    // Sale -> SaleItems
    Sale.hasMany(SaleItem, {
        foreignKey: 'sale_id',
        as: 'items'
    });

    SaleItem.belongsTo(Sale, {
        foreignKey: 'sale_id',
        as: 'sale'
    });

    // Product -> SaleItems
    Product.hasMany(SaleItem, {
        foreignKey: 'product_id',
        as: 'saleItems'
    });

    SaleItem.belongsTo(Product, {
        foreignKey: 'product_id',
        as: 'product'
    });

    SaleItem.belongsTo(ProductVariant, {
        foreignKey: 'variant_id',
        as: 'variant'
    });

    // Sale -> SalePayments
    Sale.hasMany(SalePayment, {
        foreignKey: 'sale_id',
        as: 'payments'
    });

    SalePayment.belongsTo(Sale, {
        foreignKey: 'sale_id',
        as: 'sale'
    });

    // Branch -> Sales
    Branch.hasMany(Sale, {
        foreignKey: 'branch_id',
        as: 'sales'
    });

    // Branch -> CashRegisters
    Branch.hasMany(CashRegister, {
        foreignKey: 'branch_id',
        as: 'cashRegisters'
    });

    CashRegister.belongsTo(Branch, {
        foreignKey: 'branch_id',
        as: 'branch'
    });

    // PriceList -> PriceListItems
    PriceList.hasMany(PriceListItem, {
        foreignKey: 'price_list_id',
        as: 'items'
    });

    PriceListItem.belongsTo(PriceList, {
        foreignKey: 'price_list_id',
        as: 'priceList'
    });

    PriceListItem.belongsTo(Product, {
        foreignKey: 'product_id',
        as: 'product'
    });

    PriceListItem.belongsTo(ProductVariant, {
        foreignKey: 'variant_id',
        as: 'variant'
    });

    // Product -> PurchaseOrderItems
    Product.hasMany(PurchaseOrderItem, {
        foreignKey: 'product_id',
        as: 'purchaseOrderItems'
    });

    // Sale -> CreditNotes
    Sale.hasMany(CreditNote, {
        foreignKey: 'sale_id',
        as: 'creditNotes'
    });

    CreditNote.belongsTo(Sale, {
        foreignKey: 'sale_id',
        as: 'sale'
    });

    // CreditNote -> CreditNoteItems
    CreditNote.hasMany(CreditNoteItem, {
        foreignKey: 'credit_note_id',
        as: 'items'
    });

    CreditNoteItem.belongsTo(CreditNote, {
        foreignKey: 'credit_note_id',
        as: 'creditNote'
    });

    // CreditNoteItem -> Product (nullable)
    Product.hasMany(CreditNoteItem, {
        foreignKey: 'product_id',
        as: 'creditNoteItems'
    });

    CreditNoteItem.belongsTo(Product, {
        foreignKey: 'product_id',
        as: 'product'
    });

    // CreditNoteItem -> ProductVariant (nullable)
    ProductVariant.hasMany(CreditNoteItem, {
        foreignKey: 'variant_id',
        as: 'creditNoteItems'
    });

    CreditNoteItem.belongsTo(ProductVariant, {
        foreignKey: 'variant_id',
        as: 'variant'
    });

    // Customer -> CustomerTransactions
    Customer.hasMany(CustomerTransaction, {
        foreignKey: 'customer_id',
        as: 'transactions'
    });

    CustomerTransaction.belongsTo(Customer, {
        foreignKey: 'customer_id',
        as: 'customer'
    });

    // Facturación
    Sale.hasMany(Invoice, { foreignKey: 'sale_id', as: 'invoices' });
    Invoice.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });

    Customer.hasMany(Invoice, { foreignKey: 'customer_id', as: 'invoices' });
    Invoice.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

    Invoice.hasMany(InvoiceItem, { foreignKey: 'invoice_id', as: 'items' });
    InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

    Invoice.hasMany(InvoiceTax, { foreignKey: 'invoice_id', as: 'taxes' });
    InvoiceTax.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

    // NC/ND  factura original
    Invoice.hasMany(Invoice, { foreignKey: 'parent_invoice_id', as: 'relatedInvoices' });
    Invoice.belongsTo(Invoice, { foreignKey: 'parent_invoice_id', as: 'parentInvoice' });

    InvoiceItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
    InvoiceItem.belongsTo(ProductVariant, { foreignKey: 'variant_id', as: 'variant' });
    InvoiceItem.belongsTo(SaleItem, { foreignKey: 'sale_item_id', as: 'saleItem' });

    // Trazabilidad: lotes y series

    // Product -> ProductBatches
    Product.hasMany(ProductBatch, { foreignKey: 'product_id', as: 'batches' });
    ProductBatch.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

    // ProductVariant -> ProductBatches
    ProductVariant.hasMany(ProductBatch, { foreignKey: 'variant_id', as: 'batches' });
    ProductBatch.belongsTo(ProductVariant, { foreignKey: 'variant_id', as: 'variant' });

    // Supplier -> ProductBatches
    Supplier.hasMany(ProductBatch, { foreignKey: 'proveedor_id', as: 'batches' });
    ProductBatch.belongsTo(Supplier, { foreignKey: 'proveedor_id', as: 'proveedor' });

    // Product -> ProductSerials
    Product.hasMany(ProductSerial, { foreignKey: 'product_id', as: 'serials' });
    ProductSerial.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

    // ProductVariant -> ProductSerials
    ProductVariant.hasMany(ProductSerial, { foreignKey: 'variant_id', as: 'serials' });
    ProductSerial.belongsTo(ProductVariant, { foreignKey: 'variant_id', as: 'variant' });

    // ProductBatch -> ProductSerials
    ProductBatch.hasMany(ProductSerial, { foreignKey: 'batch_id', as: 'serials' });
    ProductSerial.belongsTo(ProductBatch, { foreignKey: 'batch_id', as: 'batch' });

    // SaleItem -> ProductSerials
    SaleItem.hasMany(ProductSerial, { foreignKey: 'sale_item_id', as: 'serials' });
    ProductSerial.belongsTo(SaleItem, { foreignKey: 'sale_item_id', as: 'saleItem' });

    // Customer -> ProductSerials (cliente que posee el serial)
    Customer.hasMany(ProductSerial, { foreignKey: 'customer_id', as: 'serials' });
    ProductSerial.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

    // RMA: devoluciones

    // Sale -> ReturnRequests
    Sale.hasMany(ReturnRequest, { foreignKey: 'sale_id', as: 'returnRequests' });
    ReturnRequest.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });

    // Customer -> ReturnRequests
    Customer.hasMany(ReturnRequest, { foreignKey: 'customer_id', as: 'returnRequests' });
    ReturnRequest.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

    // CreditNote -> ReturnRequest
    CreditNote.belongsTo(ReturnRequest, { foreignKey: 'rma_id', as: 'returnRequest' });
    ReturnRequest.hasMany(CreditNote, { foreignKey: 'rma_id', as: 'creditNotes' });

    // ReturnRequest -> ReturnRequestItems
    ReturnRequest.hasMany(ReturnRequestItem, { foreignKey: 'return_request_id', as: 'items' });
    ReturnRequestItem.belongsTo(ReturnRequest, { foreignKey: 'return_request_id', as: 'returnRequest' });

    // ReturnRequestItem -> Product / ProductVariant
    Product.hasMany(ReturnRequestItem, { foreignKey: 'product_id', as: 'returnItems' });
    ReturnRequestItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

    ProductVariant.hasMany(ReturnRequestItem, { foreignKey: 'variant_id', as: 'returnItems' });
    ReturnRequestItem.belongsTo(ProductVariant, { foreignKey: 'variant_id', as: 'variant' });

    // Tesorería

    // BankAccount -> BankMovements
    BankAccount.hasMany(BankMovement, { foreignKey: 'bank_account_id', as: 'movements' });
    BankMovement.belongsTo(BankAccount, { foreignKey: 'bank_account_id', as: 'bankAccount' });

    // Sale -> BankMovements
    Sale.hasMany(BankMovement, { foreignKey: 'sale_id', as: 'bankMovements' });
    BankMovement.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });

    // PurchaseOrder -> BankMovements
    PurchaseOrder.hasMany(BankMovement, { foreignKey: 'purchase_order_id', as: 'bankMovements' });
    BankMovement.belongsTo(PurchaseOrder, { foreignKey: 'purchase_order_id', as: 'purchaseOrder' });

    // BankAccount -> Cheques
    BankAccount.hasMany(Cheque, { foreignKey: 'bank_account_id', as: 'cheques' });
    Cheque.belongsTo(BankAccount, { foreignKey: 'bank_account_id', as: 'bankAccount' });

    // Customer -> Cheques (cheques recibidos de un cliente)
    Customer.hasMany(Cheque, { foreignKey: 'customer_id', as: 'cheques' });
    Cheque.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

    // Supplier -> Cheques (cheques emitidos a un proveedor)
    Supplier.hasMany(Cheque, { foreignKey: 'supplier_id', as: 'cheques' });
    Cheque.belongsTo(Supplier, { foreignKey: 'supplier_id', as: 'supplier' });

    // Contabilidad

    // ChartOfAccount self-referencing (cuentas padre/hijo)
    ChartOfAccount.hasMany(ChartOfAccount, { foreignKey: 'parent_id', as: 'children' });
    ChartOfAccount.belongsTo(ChartOfAccount, { foreignKey: 'parent_id', as: 'parent' });

    // JournalEntry -> JournalEntryLines
    JournalEntry.hasMany(JournalEntryLine, { foreignKey: 'journal_entry_id', as: 'lines' });
    JournalEntryLine.belongsTo(JournalEntry, { foreignKey: 'journal_entry_id', as: 'journalEntry' });

    // ChartOfAccount -> JournalEntryLines
    ChartOfAccount.hasMany(JournalEntryLine, { foreignKey: 'account_id', as: 'journalLines' });
    JournalEntryLine.belongsTo(ChartOfAccount, { foreignKey: 'account_id', as: 'account' });

    // Invoice -> VatBookEntries
    Invoice.hasMany(VatBookEntry, { foreignKey: 'invoice_id', as: 'vatBookEntries' });
    VatBookEntry.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });

    // Impuestos

    // TaxSetting -> TaxWithholdings
    TaxSetting.hasMany(TaxWithholding, { foreignKey: 'tax_setting_id', as: 'withholdings' });
    TaxWithholding.belongsTo(TaxSetting, { foreignKey: 'tax_setting_id', as: 'taxSetting' });

    // Sale -> TaxWithholdings
    Sale.hasMany(TaxWithholding, { foreignKey: 'sale_id', as: 'withholdings' });
    TaxWithholding.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });

    // PurchaseOrder -> TaxWithholdings
    PurchaseOrder.hasMany(TaxWithholding, { foreignKey: 'purchase_order_id', as: 'withholdings' });
    TaxWithholding.belongsTo(PurchaseOrder, { foreignKey: 'purchase_order_id', as: 'purchaseOrder' });

    // Marketplaces

    // MarketplaceConnection -> MarketplaceProducts
    MarketplaceConnection.hasMany(MarketplaceProduct, { foreignKey: 'connection_id', as: 'products' });
    MarketplaceProduct.belongsTo(MarketplaceConnection, { foreignKey: 'connection_id', as: 'connection' });

    // Product -> MarketplaceProducts
    Product.hasMany(MarketplaceProduct, { foreignKey: 'product_id', as: 'marketplaceListings' });
    MarketplaceProduct.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

    // ProductVariant -> MarketplaceProducts
    ProductVariant.hasMany(MarketplaceProduct, { foreignKey: 'variant_id', as: 'marketplaceListings' });
    MarketplaceProduct.belongsTo(ProductVariant, { foreignKey: 'variant_id', as: 'variant' });

    // MarketplaceConnection -> MarketplaceOrders
    MarketplaceConnection.hasMany(MarketplaceOrder, { foreignKey: 'connection_id', as: 'orders' });
    MarketplaceOrder.belongsTo(MarketplaceConnection, { foreignKey: 'connection_id', as: 'connection' });

    // Sale -> MarketplaceOrders (cuando el pedido se convierte en venta)
    Sale.hasOne(MarketplaceOrder, { foreignKey: 'sale_id', as: 'marketplaceOrder' });
    MarketplaceOrder.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });
}

export {
    setupAssociations,
    Admin,
    BusinessConfig,
    Branch,
    Category,
    Product,
    ProductVariant,
    Stock,
    StockMovement,
    StockTransfer,
    StockTransferItem,
    Supplier,
    PurchaseOrder,
    PurchaseOrderItem,
    Customer,
    Sale,
    SaleItem,
    SalePayment,
    PriceList,
    PriceListItem,
    CashRegister,
    CreditNote,
    CreditNoteItem,
    CustomerTransaction,
    FiscalConfig,
    Invoice,
    InvoiceItem,
    InvoiceTax,
    FiscalSequence,
    ProductBatch,
    ProductSerial,
    ReturnRequest,
    ReturnRequestItem,
    BankAccount,
    BankMovement,
    Cheque,
    ChartOfAccount,
    JournalEntry,
    JournalEntryLine,
    VatBookEntry,
    TaxSetting,
    TaxWithholding,
    MarketplaceConnection,
    MarketplaceProduct,
    MarketplaceOrder,
};

export default {
    Admin,
    BusinessConfig,
    Branch,
    Category,
    Product,
    ProductVariant,
    Stock,
    StockMovement,
    StockTransfer,
    StockTransferItem,
    Supplier,
    PurchaseOrder,
    PurchaseOrderItem,
    Customer,
    Sale,
    SaleItem,
    SalePayment,
    PriceList,
    PriceListItem,
    CashRegister,
    CreditNote,
    CreditNoteItem,
    CustomerTransaction,
    FiscalConfig,
    Invoice,
    InvoiceItem,
    InvoiceTax,
    FiscalSequence,
    ProductBatch,
    ProductSerial,
    ReturnRequest,
    ReturnRequestItem,
    BankAccount,
    BankMovement,
    Cheque,
    ChartOfAccount,
    JournalEntry,
    JournalEntryLine,
    VatBookEntry,
    TaxSetting,
    TaxWithholding,
    MarketplaceConnection,
    MarketplaceProduct,
    MarketplaceOrder,
};
