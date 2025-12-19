
import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Users, FileText, History, Trash2, AlertTriangle, Save, Download, Upload, Loader2, LogOut, Key, Printer } from 'lucide-react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { Supplier, Invoice, InvoiceWithSupplier } from './types';
import { getSuppliers, getInvoices, calculateInvoiceBalance, getInvoiceInitialAmount, deleteSupplier, saveSupplier, exportDatabase, importDatabase, deleteAllSuppliers, deleteInvoice } from './services/storage';

// Components
import { SupplierFormModal } from './components/SupplierFormModal';
import { InvoiceModal } from './components/InvoiceModal';
import { Modal } from './components/ui/Modal';
import { Login } from './components/Login';
import { ChangePasswordModal } from './components/ChangePasswordModal';

// --- Constants for Styles ---
const LABEL_STYLE = "block text-sm font-bold text-slate-900 mb-1.5";
const INPUT_STYLE = "w-full p-2.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-all text-slate-900";
const INPUT_SM_STYLE = "p-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary-500 outline-none text-sm";

// Icons for Tabs
const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all print:hidden ${
      active 
        ? 'border-primary-600 text-primary-700 bg-primary-50/50 font-medium' 
        : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
    }`}
  >
    <Icon size={20} />
    {label}
  </button>
);

const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);

const formatDate = (dateStr: string) => 
  new Date(dateStr).toLocaleDateString('it-IT');

interface InvoiceCardProps {
  inv: InvoiceWithSupplier;
  onClick: (inv: InvoiceWithSupplier) => void;
}

const InvoiceCard: React.FC<InvoiceCardProps> = ({ inv, onClick }) => (
  <div 
    onClick={() => onClick(inv)}
    className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
  >
    <div>
      <div className="text-xs text-slate-500 mb-1">{formatDate(inv.rows[0]?.date)} • {inv.supplier.name}</div>
      <div className="font-medium text-slate-800">{inv.rows[0]?.description}</div>
    </div>
    <div className={`font-bold ${inv.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
      {formatCurrency(inv.balance)}
    </div>
  </div>
);

const App = () => {
  // Auth State
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [activeTab, setActiveTab] = useState(0);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Navigation State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  
  // Modals
  const [isSupplierModalOpen, setSupplierModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null); // NEW: State for invoice deletion confirmation
  const [isDeleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
  const [isChangePasswordOpen, setChangePasswordOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<{ isOpen: boolean, supplierId: string, invoice: Invoice | null }>({
    isOpen: false,
    supplierId: '',
    invoice: null
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check Auth Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setAuthLoading(false);
      
      // Se l'evento è un recupero password, apri il modale di cambio password
      if (event === 'PASSWORD_RECOVERY') {
        setChangePasswordOpen(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load Data
  const refreshData = async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const [s, i] = await Promise.all([getSuppliers(), getInvoices()]);
      setSuppliers(s);
      setInvoices(i);
    } catch (e) {
      console.error("Failed to load data", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      refreshData();
    }
  }, [session]);

  // Helper to enrich invoices
  const getEnrichedInvoices = (): InvoiceWithSupplier[] => {
    return invoices.map(inv => {
      const supplier = suppliers.find(s => s.id === inv.supplier_id);
      if (!supplier) return null;
      return {
        ...inv,
        supplier: supplier,
        balance: calculateInvoiceBalance(inv),
        initialAmount: getInvoiceInitialAmount(inv)
      };
    }).filter(i => i !== null) as InvoiceWithSupplier[];
  };

  const enrichedInvoices = getEnrichedInvoices();

  // Handle Invoice Deletion Trigger
  const handleRequestInvoiceDelete = (id: string) => {
    // Open the confirmation modal instead of window.confirm
    setInvoiceToDelete(id);
  };

  // Perform Invoice Deletion
  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    
    setIsLoading(true);
    try {
      await deleteInvoice(invoiceToDelete);
      // Close the editing modal as well since the invoice is gone
      setEditingInvoice(prev => ({ ...prev, isOpen: false, invoice: null }));
      setInvoiceToDelete(null);
      await refreshData();
    } catch (e) {
      console.error("Error deleting invoice", e);
      alert("Errore durante l'eliminazione della fattura");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Supplier Deletion
  const confirmDeleteSupplier = async () => {
    if (supplierToDelete) {
      setIsLoading(true);
      await deleteSupplier(supplierToDelete);
      setSupplierToDelete(null);
      await refreshData();
      if (selectedSupplierId === supplierToDelete) {
        setSelectedSupplierId(null);
        setActiveTab(0);
      }
      setIsLoading(false);
    }
  };

  const confirmDeleteAllSuppliers = async () => {
    setIsLoading(true);
    await deleteAllSuppliers();
    setDeleteAllModalOpen(false);
    await refreshData();
    setSelectedSupplierId(null);
    setActiveTab(0);
    setIsLoading(false);
  };

  // Handle Export/Import
  const handleExportData = async () => {
    setIsLoading(true);
    const data = await exportDatabase();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_dati_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setIsLoading(false);
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        setIsLoading(true);
        const success = await importDatabase(content);
        if (success) {
          await refreshData();
          alert('Dati importati con successo su Supabase!');
          setActiveTab(0);
        } else {
          alert('Errore durante l\'importazione. Controlla il file.');
        }
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLogout = async () => {
    setSuppliers([]);
    setInvoices([]);
    setSelectedSupplierId(null);
    setActiveTab(0);
    await supabase.auth.signOut();
  };

  const LoadingOverlay = () => (
    <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-[60] flex items-center justify-center print:hidden">
      <div className="bg-white p-4 rounded-lg shadow-xl flex items-center gap-3">
        <Loader2 className="animate-spin text-primary-600" />
        <span className="font-medium text-slate-700">Caricamento...</span>
      </div>
    </div>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="animate-spin text-primary-600 w-8 h-8" />
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  // TAB 1: Supplier List
  const SupplierListTab = () => {
    const [search, setSearch] = useState('');
    const filtered = suppliers
      .filter(s => s.name.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));

    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="relative w-96">
            <input
              type="text"
              placeholder="Cerca fornitore..."
              className="w-full pl-4 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
          <button 
            onClick={() => setSupplierModalOpen(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
          >
            + Nuovo Fornitore
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Elenco Fornitori ({filtered.length})
            </div>
            {suppliers.length > 0 && (
              <button
                onClick={() => setDeleteAllModalOpen(true)}
                className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors"
                title="Elimina tutti i fornitori"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
          <ul className="divide-y divide-slate-100">
            {filtered.map(s => (
              <li key={s.id} className="group hover:bg-slate-50 transition-colors flex items-center justify-between p-4">
                <div 
                  onClick={() => { setSelectedSupplierId(s.id); setActiveTab(1); }}
                  className="flex-1 cursor-pointer"
                >
                  <div className="font-medium text-slate-800 text-lg group-hover:text-primary-600 transition-colors">
                    {s.name}
                  </div>
                  <div className="text-sm text-slate-500">
                    {s.is_merchandise ? '📦 Merce conto acquisti' : '🏢 Servizi / Altro'}
                  </div>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSupplierToDelete(s.id);
                  }}
                  title="Elimina Fornitore"
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors z-10 flex-shrink-0"
                  type="button"
                >
                  <Trash2 size={20} />
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="p-8 text-center text-slate-500">Nessun fornitore trovato.</li>
            )}
          </ul>
        </div>
      </div>
    );
  };

  // TAB 2: Detail
  const SupplierDetailTab = () => {
    const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
    const [formData, setFormData] = useState<Supplier | null>(null);

    useEffect(() => {
      if (selectedSupplier) setFormData(selectedSupplier);
    }, [selectedSupplier]);

    if (!selectedSupplier || !formData) {
      return (
        <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400">
          <Users size={64} className="mb-4 opacity-50" />
          <p className="text-xl font-medium">Seleziona un fornitore dall'elenco</p>
          <button onClick={() => setActiveTab(0)} className="mt-4 text-primary-600 hover:underline">
            Vai all'elenco
          </button>
        </div>
      );
    }

    const supplierInvoices = enrichedInvoices
      .filter(i => i.supplier_id === selectedSupplierId && i.balance !== 0)
      .sort((a, b) => new Date(a.rows[0]?.date || '').getTime() - new Date(b.rows[0]?.date || '').getTime());

    const totalBalance = supplierInvoices.reduce((acc, curr) => acc + curr.balance, 0);

    const handleUpdateSupplier = async () => {
      if (formData) {
        setIsLoading(true);
        await saveSupplier(formData);
        await refreshData();
        alert('Dati fornitore aggiornati');
        setIsLoading(false);
      }
    };

    return (
      <div className="flex h-[calc(100vh-80px)] overflow-hidden">
        {/* Left Column: Data - 30% */}
        <div className="w-[30%] bg-white border-r border-slate-200 p-8 overflow-y-auto">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Dati Fornitore</h2>
          <div className="space-y-4">
            <div className="flex flex-col">
              <label className={LABEL_STYLE}>Ragione Sociale</label>
              <input type="text" className={INPUT_STYLE} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="flex flex-col">
              <label className={LABEL_STYLE}>IBAN</label>
              <input type="text" className={`${INPUT_STYLE} font-mono`} value={formData.iban} onChange={e => setFormData({...formData, iban: e.target.value})} />
            </div>
            <div className="flex flex-col">
              <label className={LABEL_STYLE}>Email</label>
              <input type="text" className={INPUT_STYLE} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <div className="flex flex-col">
              <label className={LABEL_STYLE}>Telefono</label>
              <input type="text" className={INPUT_STYLE} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="flex flex-col">
              <label className={LABEL_STYLE}>Note</label>
              <textarea className={INPUT_STYLE} rows={4} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <input type="checkbox" id="edit_merch" className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500" checked={formData.is_merchandise} onChange={e => setFormData({...formData, is_merchandise: e.target.checked})} />
              <label htmlFor="edit_merch" className={`${LABEL_STYLE} !mb-0 cursor-pointer`}>Merce conto acquisti</label>
            </div>
            
            <button 
              onClick={handleUpdateSupplier} 
              className="w-full mt-6 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg shadow-sm hover:shadow-md transition-all font-bold text-sm flex items-center justify-center gap-2 uppercase tracking-wide"
            >
              <Save size={18} /> SALVA MODIFICHE
            </button>
          </div>
        </div>

        {/* Right Column: Invoices - 70% */}
        <div className="w-[70%] bg-slate-50 p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">Movimenti: {selectedSupplier.name}</h2>
            
            <div className="flex items-center gap-4">
              <div className="bg-white px-5 py-2 rounded-xl shadow-sm border border-slate-200 text-right">
                <span className="text-xs text-slate-500 block">Saldo Totale Fornitore</span>
                <span className="text-xl font-bold text-slate-800">{formatCurrency(totalBalance)}</span>
              </div>

              <button 
                onClick={() => setEditingInvoice({ isOpen: true, supplierId: selectedSupplier.id, invoice: null })}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2"
              >
                <FileText size={18} /> Nuova Registrazione
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {supplierInvoices.map(inv => (
              <div 
                key={inv.id} 
                onClick={() => setEditingInvoice({ isOpen: true, supplierId: inv.supplier_id, invoice: inv })}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md cursor-pointer transition-all hover:border-primary-300 group"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    {formatDate(inv.rows[0]?.date)}
                  </span>
                  <span className="text-xs font-mono text-slate-400">#{inv.rows[0]?.protocol || 'N/A'}</span>
                </div>
                <div className="text-sm text-slate-700 mb-3 font-medium line-clamp-1">
                  {inv.rows[0]?.description || 'Nessuna descrizione'}
                </div>
                <div className={`text-lg font-bold text-right ${inv.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {formatCurrency(inv.balance)}
                </div>
              </div>
            ))}
            {supplierInvoices.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
                Nessuna fattura aperta.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // TAB 3: Global Dashboard (Scadenziario)
  const ActiveInvoicesTab = () => {
    const [search, setSearch] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [onlyMerch, setOnlyMerch] = useState(false);

    const years = Array.from(new Set(enrichedInvoices.map(i => new Date(i.rows[0]?.date).getFullYear()))).sort().reverse();

    const applyFilters = (invList: InvoiceWithSupplier[]) => {
      return invList.filter(i => {
        if (search && !i.supplier.name.toLowerCase().includes(search.toLowerCase())) return false;
        
        const d = new Date(i.rows[0]?.date);
        if (month && (d.getMonth() + 1).toString() !== month) return false;
        if (year && d.getFullYear().toString() !== year) return false;
        if (dateFrom && i.rows[0]?.date < dateFrom) return false;
        if (dateTo && i.rows[0]?.date > dateTo) return false;
        
        return true;
      });
    };

    const activeInvoices = enrichedInvoices.filter(i => i.balance !== 0);
    
    let merchandiseInvoices = activeInvoices.filter(i => i.supplier.is_merchandise);
    let toPayInvoices = activeInvoices.filter(i => !i.supplier.is_merchandise && i.balance > 0);

    // Apply global filters
    merchandiseInvoices = applyFilters(merchandiseInvoices).sort((a, b) => new Date(a.rows[0]?.date).getTime() - new Date(b.rows[0]?.date).getTime());
    toPayInvoices = applyFilters(toPayInvoices).sort((a, b) => new Date(a.rows[0]?.date).getTime() - new Date(b.rows[0]?.date).getTime());

    const sumMerch = merchandiseInvoices.reduce((a, b) => a + b.balance, 0);
    const sumPay = toPayInvoices.reduce((a, b) => a + b.balance, 0);

    const handleInvoiceClick = (inv: InvoiceWithSupplier) => {
      setEditingInvoice({ isOpen: true, supplierId: inv.supplier_id, invoice: inv });
    };

    const resetFilters = () => {
      setSearch('');
      setMonth('');
      setYear('');
      setDateFrom('');
      setDateTo('');
      setOnlyMerch(false);
    };

    const handlePrint = () => {
        // 1. Prepare Content
        const title = "Scadenziario Fornitori";
        const printDate = new Date().toLocaleDateString('it-IT');
        
        // Helper for table rows
        const renderTableRows = (list: InvoiceWithSupplier[]) => {
            if (list.length === 0) return '<tr><td colspan="4" style="text-align:center; padding: 10px; font-style: italic;">Nessuna scadenza</td></tr>';
            return list.map(inv => `
                <tr>
                    <td>${formatDate(inv.rows[0]?.date)}</td>
                    <td><strong>${inv.supplier.name}</strong></td>
                    <td>${inv.rows[0]?.description || '-'}</td>
                    <td style="text-align: right; white-space: nowrap;">${formatCurrency(inv.balance)}</td>
                </tr>
            `).join('');
        };

        const merchRows = renderTableRows(merchandiseInvoices);
        const payRows = renderTableRows(toPayInvoices);

        const html = `
        <!DOCTYPE html>
        <html lang="it">
        <head>
            <meta charset="UTF-8">
            <title>Stampa Scadenziario</title>
            <style>
                body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 40px; color: #333; }
                h1 { font-size: 24px; margin-bottom: 5px; color: #1e293b; }
                .meta { font-size: 14px; color: #64748b; margin-bottom: 30px; }
                .section { margin-bottom: 40px; }
                .section-title { font-size: 16px; font-weight: bold; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px; display: flex; justify-content: space-between; }
                table { width: 100%; border-collapse: collapse; font-size: 13px; }
                th { text-align: left; padding: 10px 5px; border-bottom: 1px solid #cbd5e1; color: #475569; font-weight: 600; }
                td { padding: 8px 5px; border-bottom: 1px solid #f1f5f9; }
                tr:last-child td { border-bottom: none; }
                .amount-col { text-align: right; }
                .total-row { font-weight: bold; font-size: 15px; margin-top: 10px; text-align: right; color: #0f172a; }
                .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: bold; }
                .badge-orange { background: #ffedd5; color: #c2410c; }
                .badge-red { background: #fee2e2; color: #b91c1c; }
                @media print {
                    @page { margin: 1cm; }
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            <div class="meta">Generato il ${printDate}</div>

            <div class="section">
                <div class="section-title">
                    <span>Merce Conto Acquisti</span>
                    <span class="badge badge-orange">${merchandiseInvoices.length} scadenze</span>
                </div>
                <table>
                    <thead>
                        <tr>
                            <th width="15%">Data</th>
                            <th width="30%">Fornitore</th>
                            <th width="35%">Descrizione</th>
                            <th width="20%" class="amount-col">Importo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${merchRows}
                    </tbody>
                </table>
                <div class="total-row">Totale: ${formatCurrency(sumMerch)}</div>
            </div>

            ${!onlyMerch ? `
            <div class="section">
                <div class="section-title">
                    <span>Spese Generali / Servizi</span>
                    <span class="badge badge-red">${toPayInvoices.length} scadenze</span>
                </div>
                 <table>
                    <thead>
                        <tr>
                            <th width="15%">Data</th>
                            <th width="30%">Fornitore</th>
                            <th width="35%">Descrizione</th>
                            <th width="20%" class="amount-col">Importo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payRows}
                    </tbody>
                </table>
                <div class="total-row">Totale: ${formatCurrency(sumPay)}</div>
            </div>
            ` : ''}

            <div style="margin-top: 50px; padding-top: 20px; border-top: 2px solid #333; text-align: right; font-size: 18px; font-weight: bold;">
                TOTALE COMPLESSIVO: ${formatCurrency(sumMerch + (onlyMerch ? 0 : sumPay))}
            </div>
        </body>
        </html>
        `;

        const printWindow = window.open('', '_blank', 'width=900,height=800');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            // Wait for potential rendering
            setTimeout(() => {
                printWindow.print();
                // Optional: close after print
                // printWindow.close(); 
            }, 500);
        } else {
            alert("Impossibile aprire la finestra di stampa. Controlla il blocco popup.");
        }
    };

    return (
      <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col">
        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <input 
              type="text" 
              placeholder="Cerca fornitore..." 
              className={INPUT_SM_STYLE + " w-full"}
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Mese</span>
            <select className={`${INPUT_SM_STYLE} w-32`} value={month} onChange={e => setMonth(e.target.value)}>
              <option value="">Tutti</option>
              {[...Array(12)].map((_, i) => <option key={i} value={i+1}>{new Date(0, i).toLocaleString('it-IT', { month: 'long' })}</option>)}
            </select>
          </div>

          <div className="flex flex-col">
             <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Anno</span>
             <select className={`${INPUT_SM_STYLE} w-24`} value={year} onChange={e => setYear(e.target.value)}>
               <option value="">Tutti</option>
               {years.map(y => <option key={y} value={y}>{y}</option>)}
             </select>
          </div>
          
           <div className="flex flex-col">
             <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Dal</span>
             <input type="date" className={INPUT_SM_STYLE} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>

          <div className="flex flex-col">
             <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Al</span>
             <input type="date" className={INPUT_SM_STYLE} value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>

          <div className="flex items-center gap-2 pb-2">
            <input type="checkbox" id="active_merch" checked={onlyMerch} onChange={e => setOnlyMerch(e.target.checked)} className="rounded text-primary-600" />
            <label htmlFor="active_merch" className="text-sm text-slate-700 font-medium">Solo Merce</label>
          </div>
          
          <div className="ml-auto flex gap-2">
             <button 
                onClick={resetFilters}
                className="px-3 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-1 transition-colors"
                title="Resetta Filtri"
              >
                <History size={16} /> Reset
              </button>
             <button 
                onClick={handlePrint}
                className="px-3 py-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg flex items-center gap-1 transition-colors font-medium"
                title="Stampa Scadenziario"
              >
                <Printer size={18} /> Stampa PDF
              </button>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex-1 overflow-y-auto space-y-8 pr-2">
          
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-slate-800">📦 MERCE CONTO ACQUISTI</h3>
                <span className="bg-orange-100 text-orange-700 text-xs px-2 py-0.5 rounded-full font-bold">{merchandiseInvoices.length}</span>
              </div>
              <div className="text-orange-600 font-bold text-lg">
                Totale: {formatCurrency(sumMerch)}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {merchandiseInvoices.map(inv => <InvoiceCard key={inv.id} inv={inv} onClick={handleInvoiceClick} />)}
              {merchandiseInvoices.length === 0 && <div className="text-slate-400 italic text-sm">Nessuna fattura presente.</div>}
            </div>
          </section>

          {!onlyMerch && (
            <>
              <div className="border-t border-slate-200 my-4"></div>

              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-slate-800">💰 DA SALDARE (Servizi)</h3>
                    <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-bold">{toPayInvoices.length}</span>
                  </div>
                  <div className="text-red-600 font-bold text-lg">
                    Totale: {formatCurrency(sumPay)}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {toPayInvoices.map(inv => <InvoiceCard key={inv.id} inv={inv} onClick={handleInvoiceClick} />)}
                  {toPayInvoices.length === 0 && <div className="text-slate-400 italic text-sm">Tutto saldato!</div>}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    );
  };
  
  // TAB 4: History
  const HistoryTab = () => {
    const [search, setSearch] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [onlyMerch, setOnlyMerch] = useState(false);

    const years = Array.from(new Set(enrichedInvoices.map(i => new Date(i.rows[0]?.date).getFullYear()))).sort().reverse();

    const historyInvoices = enrichedInvoices.filter(i => {
      if (i.balance !== 0) return false;
      if (search && !i.supplier.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (onlyMerch && !i.supplier.is_merchandise) return false;
      
      const d = new Date(i.rows[0]?.date);
      if (month && (d.getMonth() + 1).toString() !== month) return false;
      if (year && d.getFullYear().toString() !== year) return false;
      if (dateFrom && i.rows[0]?.date < dateFrom) return false;
      if (dateTo && i.rows[0]?.date > dateTo) return false;
      
      return true;
    }).sort((a, b) => new Date(b.rows[0]?.date).getTime() - new Date(a.rows[0]?.date).getTime());

    const totalSettled = historyInvoices.reduce((a, b) => a + b.initialAmount, 0);

    const handlePrintHistory = () => {
        const title = "Storico Fatture Saldate";
        const printDate = new Date().toLocaleDateString('it-IT');
        
        const rows = historyInvoices.length === 0 
            ? '<tr><td colspan="5" style="text-align:center; padding: 10px; font-style: italic;">Nessuna fattura trovata</td></tr>'
            : historyInvoices.map(inv => `
            <tr>
                <td>${formatDate(inv.rows[0]?.date)}</td>
                <td><strong>${inv.supplier.name}</strong></td>
                <td>${inv.rows[0]?.description || '-'}</td>
                <td>${inv.rows[0]?.protocol || '-'}</td>
                <td style="text-align: right; white-space: nowrap;">${formatCurrency(inv.initialAmount)}</td>
            </tr>
        `).join('');

        const html = `
        <!DOCTYPE html>
        <html lang="it">
        <head>
            <meta charset="UTF-8">
            <title>Stampa Storico</title>
            <style>
                body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 40px; color: #333; }
                h1 { font-size: 24px; margin-bottom: 5px; color: #1e293b; }
                .meta { font-size: 14px; color: #64748b; margin-bottom: 30px; }
                table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 30px; }
                th { text-align: left; padding: 10px 5px; border-bottom: 1px solid #cbd5e1; color: #475569; font-weight: 600; }
                td { padding: 8px 5px; border-bottom: 1px solid #f1f5f9; }
                tr:last-child td { border-bottom: none; }
                .amount-col { text-align: right; }
                .total-box { margin-top: 20px; text-align: right; font-size: 16px; font-weight: bold; }
                @media print {
                    @page { margin: 1cm; }
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            <div class="meta">Generato il ${printDate} - ${historyInvoices.length} righe</div>

            <table>
                <thead>
                    <tr>
                        <th width="12%">Data</th>
                        <th width="25%">Fornitore</th>
                        <th width="33%">Descrizione</th>
                        <th width="15%">Prot.</th>
                        <th width="15%" class="amount-col">Importo</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>

            <div class="total-box">
                TOTALE SALDATO: ${formatCurrency(totalSettled)}
            </div>
        </body>
        </html>
        `;

        const printWindow = window.open('', '_blank', 'width=900,height=800');
        if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }
    };

    return (
      <div className="p-6 max-w-7xl mx-auto h-[calc(100vh-100px)] flex flex-col">
        {/* ... Filters ... */}
         <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-4 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <input 
              type="text" 
              placeholder="Cerca fornitore..." 
              className={INPUT_SM_STYLE + " w-full"}
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Mese</span>
            <select className={`${INPUT_SM_STYLE} w-32`} value={month} onChange={e => setMonth(e.target.value)}>
              <option value="">Tutti</option>
              {[...Array(12)].map((_, i) => <option key={i} value={i+1}>{new Date(0, i).toLocaleString('it-IT', { month: 'long' })}</option>)}
            </select>
          </div>
           <div className="flex flex-col">
             <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Anno</span>
             <select className={`${INPUT_SM_STYLE} w-24`} value={year} onChange={e => setYear(e.target.value)}>
               <option value="">Tutti</option>
               {years.map(y => <option key={y} value={y}>{y}</option>)}
             </select>
          </div>
          <div className="flex flex-col">
             <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Dal</span>
             <input type="date" className={INPUT_SM_STYLE} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div className="flex flex-col">
             <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Al</span>
             <input type="date" className={INPUT_SM_STYLE} value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 pb-2">
            <input type="checkbox" id="hist_merch" checked={onlyMerch} onChange={e => setOnlyMerch(e.target.checked)} className="rounded text-primary-600" />
            <label htmlFor="hist_merch" className="text-sm text-slate-700 font-medium">Solo Merce</label>
          </div>
          
          <div className="ml-auto flex gap-2">
             <button 
                onClick={() => { setSearch(''); setMonth(''); setYear(''); setOnlyMerch(false); setDateFrom(''); setDateTo(''); }}
                className="px-3 py-2 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-1 transition-colors"
                title="Resetta Filtri"
              >
                <History size={16} /> Reset
              </button>
             <button 
                onClick={handlePrintHistory}
                className="px-3 py-2 text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg flex items-center gap-1 transition-colors font-medium"
                title="Stampa Storico"
              >
                <Printer size={18} /> Stampa PDF
              </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-white rounded-xl shadow-sm border border-slate-200">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
              <tr>
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3">Fornitore</th>
                <th className="px-6 py-3">Descrizione</th>
                <th className="px-6 py-3">Prot.</th>
                <th className="px-6 py-3 text-right">Importo Iniziale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyInvoices.map(inv => (
                <tr 
                  key={inv.id} 
                  onClick={() => setEditingInvoice({ isOpen: true, supplierId: inv.supplier_id, invoice: inv })}
                  className="hover:bg-slate-50 group cursor-pointer"
                >
                   <td className="px-6 py-4">{formatDate(inv.rows[0]?.date)}</td>
                   <td className="px-6 py-4 font-medium text-slate-800">{inv.supplier.name}</td>
                   <td className="px-6 py-4 text-slate-600">{inv.rows[0]?.description}</td>
                   <td className="px-6 py-4 font-mono text-slate-400 text-xs">{inv.rows[0]?.protocol}</td>
                   <td className="px-6 py-4 text-right font-medium text-slate-500">
                     {formatCurrency(inv.initialAmount)}
                   </td>
                </tr>
              ))}
              {historyInvoices.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">Nessuna fattura trovata con i filtri selezionati.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 text-right">
          <span className="text-sm text-slate-500">
            {historyInvoices.length} Fatture Saldate | Totale: <b className="text-slate-800">{formatCurrency(totalSettled)}</b>
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans relative">
      {isLoading && <LoadingOverlay />}
      
      {/* Header Tabs */}
      <div className="bg-white border-b border-slate-200 shadow-sm z-10 sticky top-0 print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6">
          <div className="flex">
            <TabButton active={activeTab === 0} onClick={() => setActiveTab(0)} icon={Users} label="Elenco Fornitori" />
            <TabButton active={activeTab === 1} onClick={() => setActiveTab(1)} icon={FileText} label="Dettaglio Fornitore" />
            <TabButton active={activeTab === 2} onClick={() => setActiveTab(2)} icon={LayoutDashboard} label="Scadenziario" />
            <TabButton active={activeTab === 3} onClick={() => setActiveTab(3)} icon={History} label="Storico" />
          </div>

          <div className="flex items-center gap-4">
             {/* ... User Menu ... */}
             <div className="hidden md:flex flex-col items-end mr-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Utente</span>
                <span className="text-sm font-medium text-slate-700">{session.user.email}</span>
             </div>
             <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>
             <div className="flex gap-2">
                <button onClick={() => setChangePasswordOpen(true)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors" title="Cambia Password"><Key size={20} /></button>
                <button onClick={handleExportData} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Esporta Backup"><Download size={20} /></button>
                <button onClick={handleImportClick} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors" title="Importa Backup"><Upload size={20} /></button>
                <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Esci"><LogOut size={20} /></button>
             </div>
             <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative print:overflow-visible print:h-auto">
        {activeTab === 0 && <SupplierListTab />}
        {activeTab === 1 && <SupplierDetailTab />}
        {activeTab === 2 && <ActiveInvoicesTab />}
        {activeTab === 3 && <HistoryTab />}
      </div>

      {/* Modals */}
      <SupplierFormModal 
        isOpen={isSupplierModalOpen} 
        onClose={() => setSupplierModalOpen(false)} 
        onSave={refreshData} 
      />

      <InvoiceModal
        isOpen={editingInvoice.isOpen}
        onClose={() => setEditingInvoice({ ...editingInvoice, isOpen: false })}
        supplierId={editingInvoice.supplierId}
        existingInvoice={editingInvoice.invoice}
        supplierName={suppliers.find(s => s.id === editingInvoice.supplierId)?.name || ''}
        onSave={refreshData}
        onDelete={handleRequestInvoiceDelete} // Pass the handler that opens the modal
      />

      {/* MODALE DI CONFERMA ELIMINAZIONE FATTURA */}
      <Modal
        isOpen={!!invoiceToDelete}
        onClose={() => setInvoiceToDelete(null)}
        title="Elimina Registrazione"
        maxWidth="max-w-md"
      >
        <div className="text-center p-6">
           <div className="bg-red-50 text-red-600 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6 shadow-sm">
             <Trash2 size={36} />
           </div>
           <h3 className="text-xl font-black text-slate-800 mb-2">Eliminare definitivamente?</h3>
           <p className="text-slate-500 mb-8 text-sm leading-relaxed">
             Stai per cancellare questa registrazione. L'operazione è irreversibile.
           </p>
           <div className="flex gap-4">
             <button 
               onClick={() => setInvoiceToDelete(null)}
               className="flex-1 py-3 border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all"
             >
               Annulla
             </button>
             <button 
               onClick={confirmDeleteInvoice}
               className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
             >
               Conferma Eliminazione
             </button>
           </div>
        </div>
      </Modal>

      {/* Existing Supplier Delete Modal */}
      <Modal
        isOpen={!!supplierToDelete}
        onClose={() => setSupplierToDelete(null)}
        title="Conferma eliminazione"
        maxWidth="max-w-md"
      >
        <div className="text-center p-4">
           <div className="bg-red-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
             <AlertTriangle className="text-red-600" size={24} />
           </div>
           <h3 className="text-lg font-bold text-slate-800 mb-2">Sei sicuro?</h3>
           <p className="text-slate-600 mb-6">
             Stai per eliminare questo fornitore e tutte le fatture associate. L'azione non è reversibile.
           </p>
           <div className="flex justify-center gap-3">
             <button 
               onClick={() => setSupplierToDelete(null)}
               className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
             >
               Annulla
             </button>
             <button 
               onClick={confirmDeleteSupplier}
               className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
             >
               Elimina
             </button>
           </div>
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteAllModalOpen}
        onClose={() => setDeleteAllModalOpen(false)}
        title="⚠ ZONE PERICOLOSA: ELIMINA TUTTO"
        maxWidth="max-w-md"
      >
        <div className="text-center p-4">
           <div className="bg-red-100 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
             <Trash2 className="text-red-600" size={24} />
           </div>
           <h3 className="text-lg font-bold text-slate-800 mb-2">Eliminare TUTTI i dati?</h3>
           <p className="text-slate-600 mb-6">
             Questa azione cancellerà <b>tutti i fornitori e tutte le fatture</b> dal database. Assicurati di avere un backup.
           </p>
           <div className="flex justify-center gap-3">
             <button 
               onClick={() => setDeleteAllModalOpen(false)}
               className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 font-medium"
             >
               Annulla
             </button>
             <button 
               onClick={confirmDeleteAllSuppliers}
               className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
             >
               CONFERMA ELIMINAZIONE TOTALE
             </button>
           </div>
        </div>
      </Modal>

      <ChangePasswordModal 
        isOpen={isChangePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
      />

    </div>
  );
};

export default App;
