import { supabase } from '../supabaseClient';
import { Supplier, Invoice } from '../types';

// --- Read Functions (Getters) ---

export const getSuppliers = async (): Promise<Supplier[]> => {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .order('name', { ascending: true });
  
  if (error) {
    console.error('Error fetching suppliers:', error);
    return [];
  }
  return data as Supplier[];
};

export const getInvoices = async (): Promise<Invoice[]> => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*');
    // Ordinamento lato client o qui se necessario, ma i filtri UI lo gestiscono già
  
  if (error) {
    console.error('Error fetching invoices:', error);
    return [];
  }
  return data as Invoice[];
};

// --- Calculations (Synchronous logic remains the same) ---

export const calculateInvoiceBalance = (invoice: Invoice): number => {
  if (!invoice.rows || !Array.isArray(invoice.rows)) return 0;
  return invoice.rows.reduce((acc, row) => acc + (Number(row.credit) - Number(row.debit)), 0);
};

export const getInvoiceInitialAmount = (invoice: Invoice): number => {
  if (!invoice.rows || invoice.rows.length === 0) return 0;
  return Number(invoice.rows[0].credit);
};

// --- Write Functions (Actions) ---

export const saveSupplier = async (supplier: Omit<Supplier, 'id'> | Supplier): Promise<Supplier | null> => {
  // Se ha un ID, è un update, altrimenti insert.
  // Supabase 'upsert' gestisce entrambi se ID è presente, ma per sicurezza separiamo o usiamo upsert lasciando generare ID se manca.
  
  const { data, error } = await supabase
    .from('suppliers')
    .upsert(supplier)
    .select()
    .single();

  if (error) {
    console.error('Error saving supplier:', error);
    return null;
  }
  return data as Supplier;
};

export const deleteSupplier = async (id: string): Promise<void> => {
  // Nota: Poiché abbiamo impostato "on delete cascade" nel database SQL,
  // eliminando il fornitore si cancellano automaticamente le fatture.
  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id);

  if (error) console.error('Error deleting supplier:', error);
};

export const deleteAllSuppliers = async (): Promise<void> => {
  // Per cancellare tutto in modo sicuro senza vincoli
  // Cancelliamo prima le fatture (anche se cascade lo farebbe, è più pulito)
  await supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Hack per "delete all" se non c'è where clause
  await supabase.from('suppliers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
};

export const saveInvoice = async (invoice: any): Promise<Invoice | null> => {
  // Assicuriamoci che 'rows' sia gestito correttamente
  const payload = {
    ...invoice,
    // Se è un nuovo inserimento e manca creation_date, lo mettiamo (o lasciamo fare al DB)
    creation_date: invoice.creation_date || new Date().toISOString()
  };

  // Rimuovi undefined ID per permettere a Postgres di generarne uno nuovo
  if (!payload.id) delete payload.id;

  const { data, error } = await supabase
    .from('invoices')
    .upsert(payload)
    .select()
    .single();

  if (error) {
    console.error('Error saving invoice:', error);
    return null;
  }
  return data as Invoice;
};

export const deleteInvoice = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', id);

  if (error) console.error('Error deleting invoice:', error);
};

// --- Backup & Restore (Modified for Async) ---

export const exportDatabase = async () => {
  const suppliers = await getSuppliers();
  const invoices = await getInvoices();
  
  return {
    suppliers,
    invoices,
    timestamp: new Date().toISOString(),
    version: '2.0 (Supabase)'
  };
};

export const importDatabase = async (jsonData: string): Promise<boolean> => {
  try {
    const data = JSON.parse(jsonData);
    
    if (!Array.isArray(data.suppliers) || !Array.isArray(data.invoices)) {
      throw new Error('Invalid data format');
    }

    // 1. Pulisci il database esistente
    await deleteAllSuppliers();

    // 2. Inserisci Fornitori
    // Rimuoviamo gli ID dal JSON per lasciare che il nuovo DB ne generi di nuovi, 
    // OPPURE manteniamo gli ID del backup per preservare le relazioni. 
    // MANTENERE GLI ID è cruciale per le relazioni foreign key.
    
    if (data.suppliers.length > 0) {
      const { error: supError } = await supabase
        .from('suppliers')
        .insert(data.suppliers);
      if (supError) throw supError;
    }

    // 3. Inserisci Fatture
    if (data.invoices.length > 0) {
      const { error: invError } = await supabase
        .from('invoices')
        .insert(data.invoices);
      if (invError) throw invError;
    }

    return true;
  } catch (error) {
    console.error('Import failed:', error);
    return false;
  }
};

export const seedDatabase = () => {
  // Non necessario con database remoto persistente
};