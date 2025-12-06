import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { Invoice, InvoiceRow } from '../types';
import { Modal } from './ui/Modal';
import { saveInvoice, calculateInvoiceBalance } from '../services/storage';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierId: string;
  existingInvoice?: Invoice | null;
  onSave: () => void;
  supplierName: string;
}

const emptyRow = (): InvoiceRow => ({
  id: crypto.randomUUID(),
  date: new Date().toISOString().split('T')[0],
  description: '',
  protocol: '',
  credit: 0,
  debit: 0,
});

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ 
  isOpen, onClose, supplierId, existingInvoice, onSave, supplierName 
}) => {
  const [rows, setRows] = useState<InvoiceRow[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (existingInvoice) {
        setRows(JSON.parse(JSON.stringify(existingInvoice.rows)));
      } else {
        setRows([emptyRow()]);
      }
    }
  }, [isOpen, existingInvoice]);

  const handleRowChange = (id: string, field: keyof InvoiceRow, value: string | number) => {
    setRows(prev => prev.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  
  const removeRow = (id: string) => {
    if (rows.length > 1) {
      setRows(prev => prev.filter(r => r.id !== id));
    }
  };

  const calculateTotal = () => {
    return rows.reduce((acc, row) => acc + (Number(row.credit) - Number(row.debit)), 0);
  };

  const handleSave = () => {
    const cleanRows = rows.map(r => ({
      ...r,
      credit: Number(r.credit),
      debit: Number(r.debit)
    }));

    saveInvoice({
      id: existingInvoice?.id,
      supplier_id: supplierId,
      rows: cleanRows,
      creation_date: existingInvoice?.creation_date
    });

    onSave();
    onClose();
  };

  const balance = calculateTotal();

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={existingInvoice ? `Modifica Fattura - ${supplierName}` : `Nuova Registrazione - ${supplierName}`}
      maxWidth="max-w-4xl"
    >
      <div className="space-y-4">
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 grid grid-cols-12 gap-4 text-sm font-medium text-slate-600">
          <div className="col-span-2">Data</div>
          <div className="col-span-4">Descrizione</div>
          <div className="col-span-2">Protocollo</div>
          <div className="col-span-2 text-right">Avere (Importo)</div>
          <div className="col-span-2 text-right">Dare (Pagato)</div>
        </div>

        <div className="space-y-2">
          {rows.map((row, index) => (
            <div key={row.id} className="grid grid-cols-12 gap-3 items-center group">
              <div className="col-span-2">
                <input
                  type="date"
                  value={row.date}
                  onChange={e => handleRowChange(row.id, 'date', e.target.value)}
                  className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div className="col-span-4">
                <input
                  type="text"
                  placeholder="Descrizione operazione"
                  value={row.description}
                  onChange={e => handleRowChange(row.id, 'description', e.target.value)}
                  className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div className="col-span-2 relative">
                <input
                  type="text"
                  placeholder="Prot."
                  value={row.protocol}
                  onChange={e => handleRowChange(row.id, 'protocol', e.target.value)}
                  className="w-full p-2 text-sm border border-slate-300 rounded focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  step="0.01"
                  value={row.credit}
                  onChange={e => handleRowChange(row.id, 'credit', parseFloat(e.target.value) || 0)}
                  className="w-full p-2 text-sm border border-slate-300 rounded text-right focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={row.debit}
                  onChange={e => handleRowChange(row.id, 'debit', parseFloat(e.target.value) || 0)}
                  className="w-full p-2 text-sm border border-slate-300 rounded text-right focus:ring-2 focus:ring-primary-500 outline-none"
                />
                <button 
                  onClick={() => removeRow(row.id)}
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                  disabled={rows.length === 1}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
          <button 
            onClick={addRow}
            className="flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium px-3 py-2 rounded hover:bg-primary-50 transition-colors"
          >
            <Plus size={18} /> Aggiungi Riga
          </button>

          <div className="flex items-center gap-6">
            <div className={`text-lg font-bold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              Saldo Totale: {new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(balance)}
            </div>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-all"
            >
              <Save size={18} />
              {existingInvoice ? 'Aggiorna' : 'Salva Registrazione'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
