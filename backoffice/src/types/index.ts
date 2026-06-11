export interface BusinessConfig {
    id: number;
    name: string;
    tax_id: string | null;
    address: string | null;
    phone: string | null;
    currency: string;
    tax_rate_default: number;
    receipt_prefix: string;
    receipt_next_number: number;
}

export interface Branch {
    id: number;
    name: string;
    address: string | null;
    phone: string | null;
    is_main: boolean;
    active: boolean;
}

export interface Category {
    id: number;
    name: string;
    parent_id: number | null;
    sort_order: number;
    active: boolean;
    subcategories?: Category[];
    parent?: Category;
}

export type ProductUnit = 'UN' | 'KG' | 'LT' | 'MT';

export interface Product {
    id: number;
    name: string;
    sku: string | null;
    barcode: string | null;
    description: string | null;
    category_id: number | null;
    unit: ProductUnit;
    cost_price: number;
    sale_price: number;
    tax_rate: number;
    min_stock_alert: number;
    image_url: string | null;
    active: boolean;
    track_stock: boolean;
    category?: Category;
    variants?: ProductVariant[];
    stockEntries?: Stock[];
}

export interface ProductVariant {
    id: number;
    product_id: number;
    name: string;
    sku: string | null;
    barcode: string | null;
    cost_price: number | null;
    sale_price: number | null;
    active: boolean;
    product?: Product;
}

export interface Stock {
    id: number;
    product_id: number;
    variant_id: number | null;
    branch_id: number;
    quantity: number;
    reserved_quantity: number;
    product?: Product;
    variant?: ProductVariant;
    branch?: Branch;
}

export type StockMovementType = 'purchase' | 'sale' | 'adjustment' | 'transfer_in' | 'transfer_out' | 'return';

export interface StockMovement {
    id: number;
    product_id: number;
    variant_id: number | null;
    branch_id: number;
    type: StockMovementType;
    quantity: number;
    previous_stock: number;
    new_stock: number;
    unit_cost: number | null;
    reference_type: string | null;
    reference_id: number | null;
    notes: string | null;
    created_by: number | null;
    product?: Product;
    variant?: ProductVariant;
    branch?: Branch;
    createdAt: string;
}

export type TransferStatus = 'pending' | 'in_transit' | 'received' | 'cancelled';

export interface StockTransfer {
    id: number;
    from_branch_id: number;
    to_branch_id: number;
    status: TransferStatus;
    notes: string | null;
    created_by: number | null;
    received_by: number | null;
    received_at: string | null;
    fromBranch?: Branch;
    toBranch?: Branch;
    items?: StockTransferItem[];
    createdAt: string;
}

export interface StockTransferItem {
    id: number;
    transfer_id: number;
    product_id: number;
    variant_id: number | null;
    quantity_sent: number;
    quantity_received: number;
    product?: Product;
    variant?: ProductVariant;
}

export interface Supplier {
    id: number;
    name: string;
    tax_id: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    contact_person: string | null;
    payment_terms: string | null;
    notes: string | null;
    active: boolean;
}

export type PurchaseOrderStatus = 'draft' | 'sent' | 'partial' | 'received' | 'cancelled';

export interface PurchaseOrder {
    id: number;
    supplier_id: number;
    branch_id: number;
    order_number: string | null;
    status: PurchaseOrderStatus;
    subtotal: number;
    tax_amount: number;
    total: number;
    notes: string | null;
    expected_date: string | null;
    received_at: string | null;
    created_by: number | null;
    supplier?: Supplier;
    branch?: Branch;
    items?: PurchaseOrderItem[];
    createdAt: string;
}

export interface PurchaseOrderItem {
    id: number;
    purchase_order_id: number;
    product_id: number;
    variant_id: number | null;
    quantity_ordered: number;
    quantity_received: number;
    unit_cost: number;
    subtotal: number;
    product?: Product;
    variant?: ProductVariant;
}

export type CustomerType = 'regular' | 'wholesale';

export interface Customer {
    id: number;
    name: string;
    tax_id: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    type: CustomerType;
    discount_percentage: number;
    credit_limit: number;
    balance: number;
    notes: string | null;
    active: boolean;
}

export type PaymentMethod = 'cash' | 'card' | 'transfer' | 'mercadopago' | 'credit' | 'mixed';
export type SaleStatus = 'completed' | 'cancelled' | 'refunded';

export interface Sale {
    id: number;
    branch_id: number;
    customer_id: number | null;
    sale_number: string | null;
    payment_method: PaymentMethod;
    status: SaleStatus;
    subtotal: number;
    discount_amount: number;
    discount_percentage: number;
    tax_amount: number;
    total: number;
    paid_amount: number;
    change_amount: number;
    notes: string | null;
    created_by: number | null;
    completed_at: string | null;
    customer?: Customer;
    branch?: Branch;
    items?: SaleItem[];
    payments?: SalePayment[];
    createdAt: string;
}

export interface SaleItem {
    id: number;
    sale_id: number;
    product_id: number;
    variant_id: number | null;
    quantity: number;
    unit_price: number;
    discount_percentage: number;
    subtotal: number;
    cost_at_sale: number | null;
    product?: Product;
    variant?: ProductVariant;
}

export type SalePaymentMethod = 'cash' | 'card' | 'transfer' | 'mercadopago';

export interface SalePayment {
    id: number;
    sale_id: number;
    method: SalePaymentMethod;
    amount: number;
    reference: string | null;
}

export type PriceListType = 'retail' | 'wholesale' | 'special';

export interface PriceList {
    id: number;
    name: string;
    type: PriceListType;
    active: boolean;
    itemCount?: number;
    items?: PriceListItem[];
}

export interface PriceListItem {
    id: number;
    price_list_id: number;
    product_id: number;
    variant_id: number | null;
    price: number;
    product?: Product;
    variant?: ProductVariant;
}

export type CashRegisterStatus = 'open' | 'closed';

export interface CashRegister {
    id: number;
    branch_id: number;
    opened_by: number | null;
    closed_by: number | null;
    opening_amount: number;
    closing_amount: number | null;
    expected_amount: number | null;
    difference: number | null;
    status: CashRegisterStatus;
    opened_at: string;
    closed_at: string | null;
    branch?: Branch;
}

export interface Pagination {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    perPage: number;
}

export interface ApiResponse<T = unknown> {
    status: 0 | 1;
    message?: string;
    data?: T;
    pagination?: Pagination;
}

// Facturación electrónica (AFIP/ARCA)

export type InvoiceDocType =
    | 'A' | 'B' | 'C'
    | 'NCA' | 'NCB' | 'NCC'
    | 'NDA' | 'NDB' | 'NDC';

export type InvoiceStatus = 'draft' | 'approved' | 'rejected' | 'void';
export type InvoiceMode = 'real' | 'simulated';

export interface InvoiceItem {
    id: number;
    invoice_id: number;
    product_id: number | null;
    variant_id: number | null;
    sale_item_id: number | null;
    description: string;
    quantity: number;
    unit: string | null;
    unit_price: number;
    discount_percentage: number;
    net_amount: number;
    tax_rate: number;
    tax_amount: number;
    total: number;
}

export interface InvoiceTax {
    id: number;
    invoice_id: number;
    kind: 'iva' | 'perception' | 'internal_tax' | 'other';
    description: string | null;
    base_amount: number;
    rate: number;
    amount: number;
}

export interface Invoice {
    id: number;
    sale_id: number | null;
    parent_invoice_id: number | null;
    doc_type: InvoiceDocType;
    pto_vta: number;
    number: number;
    full_number: string | null;

    issuer_cuit: string | null;
    issuer_name: string | null;
    issuer_iva_condition: string | null;

    customer_id: number | null;
    receiver_doc_type: 'CUIT' | 'CUIL' | 'DNI' | 'CF' | 'OTRO';
    receiver_doc_number: string | null;
    receiver_name: string | null;
    receiver_iva_condition: string | null;
    receiver_address: string | null;

    currency: string;
    exchange_rate: number;
    net_amount: number;
    non_taxed_amount: number;
    exempt_amount: number;
    tax_amount: number;
    other_taxes_amount: number;
    total: number;

    cae: string | null;
    cae_expiration: string | null;
    qr_url: string | null;
    pdf_url: string | null;

    status: InvoiceStatus;
    mode: InvoiceMode;
    rejection_reason: string | null;

    issued_at: string | null;
    service_date_from: string | null;
    service_date_to: string | null;
    due_date: string | null;

    notes: string | null;
    createdAt?: string;
    updatedAt?: string;

    items?: InvoiceItem[];
    taxes?: InvoiceTax[];
    customer?: Customer;
    sale?: Sale;
    parentInvoice?: Invoice | null;
}

export interface FiscalConfigData {
    id: number;
    cuit: string | null;
    business_name: string | null;
    pto_vta: number;
    iva_condition: 'responsable_inscripto' | 'monotributo' | 'exento' | 'consumidor_final' | 'no_categorizado';
    gross_income: string | null;
    activity_start: string | null;
    fiscal_address: string | null;
    environment: 'testing' | 'production';
    next_numbers: string | null;
}

export interface FiscalConfigState {
    config: FiscalConfigData | null;
    arca: {
        enabled: boolean;
        has_certificate: boolean;
        environment: 'testing' | 'production';
        cuit: string | null;
        pto_vta: number | null;
        last_tested_at: string | null;
        last_test_status: 'ok' | 'error' | 'pending' | null;
        last_test_error: string | null;
    };
}

export interface IntegrationSummary {
    id: number;
    provider: string;
    scope: string | null;
    enabled: boolean;
    config: Record<string, unknown>;
    has_credentials: boolean;
    last_tested_at: string | null;
    last_test_status: 'ok' | 'error' | 'pending' | null;
    last_test_error: string | null;
    createdAt: string;
    updatedAt: string;
}

// Dashboard BI / KPIs

export interface SalesVsPrevMonth {
    current_month: { total: number; count: number };
    previous_month: { total: number; count: number };
    difference: number;
    delta_percentage: number | null;
}

export interface ReceivablesAging {
    total: number;
    buckets: { '0-30': number; '31-60': number; '61-90': number; '90+': number };
    customers: Array<{
        customer_id: number;
        customer_name: string;
        tax_id: string | null;
        balance: number;
        age_days: number;
        bucket: '0-30' | '31-60' | '61-90' | '90+';
    }>;
}

export interface AvailableCash {
    open_registers: number;
    opening_amount: number;
    cash_sales_since_open: number;
    estimated_cash: number;
}

export interface StockAlertsKpi {
    count: number;
    products: Array<{
        id: number;
        name: string;
        sku: string | null;
        min_stock_alert: number;
        total_stock: number;
    }>;
}
