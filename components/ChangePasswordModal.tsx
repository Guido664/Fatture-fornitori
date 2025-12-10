import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Modal } from './ui/Modal';
import { Lock, Loader2 } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Le password non coincidono.' });
      return;
    }

    if (password.length < 6) {
      setMessage({ type: 'error', text: 'La password deve avere almeno 6 caratteri.' });
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: password });
    setLoading(false);

    if (error) {
      setMessage({ type: 'error', text: error.message });
    } else {
      setMessage({ type: 'success', text: 'Password aggiornata con successo!' });
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        onClose();
        setMessage(null);
      }, 1500);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cambia Password" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {message && (
          <div className={`p-3 rounded-lg text-sm font-medium ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          }`}>
            {message.text}
          </div>
        )}

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Nuova Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="password"
              required
              className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Min. 6 caratteri"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-1.5">Conferma Password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="password"
              required
              className="w-full pl-9 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Ripeti password"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
          >
            Annulla
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 font-medium flex items-center gap-2"
          >
            {loading && <Loader2 className="animate-spin w-4 h-4" />}
            Aggiorna Password
          </button>
        </div>
      </form>
    </Modal>
  );
};