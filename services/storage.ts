
import { supabase } from '../supabaseClient';
import { Supplier, Invoice } from '../types';

// --- Read Functions (Getters) ---
// Nota: Con RLS attivo su Supabase, queste query restituiranno
// automaticamente solo i dati appartenenti all'utente loggato.

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
  // Recupera l'utente corrente per associarlo al dato
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    console.error("User not authenticated");
    return null;
  }

  const payload = {
    ...supplier,
    user_id: user.id // Associa il record all'utente corrente
  };
  
  const { data, error } = await supabase
    .from('suppliers')
    .upsert(payload)
    .select()
    .single();

  if (error) {
    console.error('Error saving supplier:', error);
    return null;
  }
  return data as Supplier;
};

export const deleteSupplier = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('suppliers')
    .delete()
    .eq('id', id);

  if (error) console.error('Error deleting supplier:', error);
};

export const deleteAllSuppliers = async (): Promise<void> => {
  // Cancella solo i dati dell'utente corrente (grazie a RLS lato server)
  await supabase.from('invoices').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
  await supabase.from('suppliers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
};

export const saveInvoice = async (invoice: any): Promise<Invoice | null> => {
  // Recupera l'utente corrente
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.error("User not authenticated");
    return null;
  }

  const payload = {
    ...invoice,
    user_id: user.id, // Associa il record all'utente
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

// --- Backup & Restore ---

export const exportDatabase = async () => {
  // Scaricherà solo i dati dell'utente corrente grazie a RLS
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Utente non loggato");

    const data = JSON.parse(jsonData);
    
    if (!Array.isArray(data.suppliers) || !Array.isArray(data.invoices)) {
      throw new Error('Invalid data format');
    }

    // 1. Pulisci il database esistente (solo dati utente corrente)
    await deleteAllSuppliers();

    // 2. Prepara i dati aggiungendo user_id
    const suppliersToImport = data.suppliers.map((s: any) => ({
      ...s,
      user_id: user.id
    }));

    const invoicesToImport = data.invoices.map((i: any) => ({
      ...i,
      user_id: user.id
    }));

    // 3. Inserisci Fornitori
    if (suppliersToImport.length > 0) {
      const { error: supError } = await supabase
        .from('suppliers')
        .insert(suppliersToImport);
      if (supError) throw supError;
    }

    // 4. Inserisci Fatture
    if (invoicesToImport.length > 0) {
      const { error: invError } = await supabase
        .from('invoices')
        .insert(invoicesToImport);
      if (invError) throw invError;
    }

    return true;
  } catch (error) {
    console.error('Import failed:', error);
    return false;
  }
};

export const seedDatabase = () => {
  // Non necessario
};
