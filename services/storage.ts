import { Supplier, Invoice, InvoiceRow } from '../types';

const STORAGE_KEYS = {
  SUPPLIERS: 'sim_suppliers',
  INVOICES: 'sim_invoices',
};

// --- Helpers ---

const generateId = () => crypto.randomUUID();

// --- Read Functions (Getters) ---
// Must be defined BEFORE being used in deleteSupplier

export const getSuppliers = (): Supplier[] => {
  const data = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
  return data ? JSON.parse(data) : [];
};

export const getInvoices = (): Invoice[] => {
  const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
  return data ? JSON.parse(data) : [];
};

// --- Calculations ---

export const calculateInvoiceBalance = (invoice: Invoice): number => {
  return invoice.rows.reduce((acc, row) => acc + (row.credit - row.debit), 0);
};

export const getInvoiceInitialAmount = (invoice: Invoice): number => {
  if (invoice.rows.length === 0) return 0;
  return invoice.rows[0].credit;
};

// --- Write Functions (Actions) ---

export const saveSupplier = (supplier: Omit<Supplier, 'id'> | Supplier): Supplier => {
  const suppliers = getSuppliers();
  let newSupplier: Supplier;

  if ('id' in supplier) {
    // Update
    newSupplier = supplier as Supplier;
    const index = suppliers.findIndex(s => s.id === supplier.id);
    if (index !== -1) {
      suppliers[index] = newSupplier;
    }
  } else {
    // Create
    newSupplier = { ...supplier, id: generateId() };
    suppliers.push(newSupplier);
  }

  localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
  return newSupplier;
};

export const deleteSupplier = (id: string): void => {
  // Delete the supplier
  const suppliers = getSuppliers().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
  
  // Cascade delete invoices associated with this supplier
  const invoices = getInvoices().filter(i => i.supplier_id !== id);
  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
};

export const saveInvoice = (invoice: Omit<Invoice, 'id' | 'creation_date'> & { id?: string, creation_date?: string }): Invoice => {
  const invoices = getInvoices();
  let newInvoice: Invoice;

  if (invoice.id) {
    // Update
    newInvoice = invoice as Invoice;
    const index = invoices.findIndex(i => i.id === invoice.id);
    if (index !== -1) {
      invoices[index] = newInvoice;
    }
  } else {
    // Create
    newInvoice = {
      ...invoice,
      id: generateId(),
      creation_date: new Date().toISOString(),
    } as Invoice;
    invoices.push(newInvoice);
  }

  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  return newInvoice;
};

export const deleteInvoice = (id: string): void => {
  const invoices = getInvoices().filter(i => i.id !== id);
  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
};

// --- Backup & Restore ---

export const exportDatabase = () => {
  return {
    suppliers: getSuppliers(),
    invoices: getInvoices(),
    timestamp: new Date().toISOString(),
    version: '1.0'
  };
};

export const importDatabase = (jsonData: string): boolean => {
  try {
    const data = JSON.parse(jsonData);
    
    // Basic validation
    if (!Array.isArray(data.suppliers) || !Array.isArray(data.invoices)) {
      throw new Error('Invalid data format');
    }

    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(data.suppliers));
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(data.invoices));
    return true;
  } catch (error) {
    console.error('Import failed:', error);
    return false;
  }
};

// --- Seeding ---

export const seedDatabase = () => {
  // Intentionally empty to prevent auto-generation of example data.
  // The app will start empty.
};