import React, { useState } from 'react';
import { Supplier } from '../types';
import { Modal } from './ui/Modal';
import { saveSupplier } from '../services/storage';

interface SupplierFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export const SupplierFormModal: React.FC<SupplierFormModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<Supplier>>({
    name: '',
    iban: '',
    email: '',
    phone: '',
    notes: '',
    is_merchandise: false
  });
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name) {
      setIsSaving(true);
      await saveSupplier(formData as Omit<Supplier, 'id'>);
      setFormData({ name: '', iban: '', email: '', phone: '', notes: '', is_merchandise: false });
      onSave(); // Trigger data refresh in App
      onClose();
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Nuovo Fornitore">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Ragione Sociale *</label>
          <input
            required
            type="text"
            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary-500 outline-none"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary-500 outline-none"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Telefono</label>
            <input
              type="tel"
              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary-500 outline-none"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">IBAN</label>
          <input
            type="text"
            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary-500 outline-none font-mono"
            value={formData.iban}
            onChange={e => setFormData({ ...formData, iban: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Note</label>
          <textarea
            className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-primary-500 outline-none"
            rows={3}
            value={formData.notes}
            onChange={e => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_merch"
            className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
            checked={formData.is_merchandise}
            onChange={e => setFormData({ ...formData, is_merchandise: e.target.checked })}
          />
          <label htmlFor="is_merch" className="text-sm font-medium text-slate-700">Merce conto acquisti</label>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Salvataggio...' : 'Salva Fornitore'}
          </button>
        </div>
      </form>
    </Modal>
  );
};