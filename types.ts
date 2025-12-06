export interface Supplier {
  id: string;
  name: string;
  iban: string;
  email: string;
  phone: string;
  notes: string;
  is_merchandise: boolean;
}

export interface InvoiceRow {
  id: string;
  date: string;
  description: string;
  protocol: string;
  credit: number; // Avere (Importo fattura)
  debit: number;  // Dare (Pagamento/Acconto)
}

export interface Invoice {
  id: string;
  supplier_id: string;
  creation_date: string;
  rows: InvoiceRow[];
}

// Helper types for UI
export interface InvoiceWithSupplier extends Invoice {
  supplier: Supplier;
  balance: number;
  initialAmount: number;
}
