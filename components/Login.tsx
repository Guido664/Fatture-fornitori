import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Lock, Mail, Loader2, UserPlus, LogIn, KeyRound, ArrowLeft } from 'lucide-react';

export const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isReset) {
        // RESET PASSWORD
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage('Ti abbiamo inviato un\'email con il link per reimpostare la password.');
      } else if (isSignUp) {
        // REGISTRAZIONE
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage('Registrazione completata! Se la conferma email è attiva, controlla la tua posta. Altrimenti, effettua il login.');
        setIsSignUp(false);
      } else {
        // LOGIN
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' 
        ? 'Credenziali non valide.' 
        : err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = (mode: 'login' | 'signup' | 'reset') => {
    setError(null);
    setMessage(null);
    if (mode === 'reset') {
      setIsReset(true);
      setIsSignUp(false);
    } else if (mode === 'signup') {
      setIsReset(false);
      setIsSignUp(true);
    } else {
      setIsReset(false);
      setIsSignUp(false);
    }
  };

  // Header content based on state
  const getHeaderContent = () => {
    if (isReset) return { icon: KeyRound, title: 'Recupero Password', sub: 'Inserisci la tua email per ricevere le istruzioni' };
    if (isSignUp) return { icon: UserPlus, title: 'Crea Account', sub: 'Inserisci i tuoi dati per registrarti' };
    return { icon: Lock, title: 'Area Riservata', sub: 'Accedi per gestire le fatture' };
  };

  const { icon: Icon, title, sub } = getHeaderContent();

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary-100 p-3 rounded-full mb-4">
            <Icon className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
          <p className="text-slate-500 mt-2 text-center">{sub}</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100 font-medium">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm mb-6 border border-emerald-100 font-medium">
            {message}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-slate-900"
                placeholder="nome@esempio.com"
              />
            </div>
          </div>

          {!isReset && (
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-bold text-slate-700">Password</label>
                {!isSignUp && (
                  <button 
                    type="button"
                    onClick={() => toggleMode('reset')}
                    className="text-xs font-medium text-primary-600 hover:text-primary-800"
                  >
                    Password dimenticata?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-slate-900"
                  placeholder="••••••••"
                />
              </div>
              {isSignUp && <p className="text-xs text-slate-500 mt-1">Minimo 6 caratteri</p>}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white font-bold py-3 rounded-lg hover:bg-primary-700 transition-colors shadow-sm flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : (
              isReset ? 'Invia link di reset' : (isSignUp ? 'Registrati' : 'Accedi')
            )}
          </button>
        </form>
        
        <div className="mt-6 pt-6 border-t border-slate-100 text-center space-y-3">
          {isReset ? (
            <button 
              onClick={() => toggleMode('login')}
              className="text-sm font-medium text-slate-600 hover:text-slate-800 flex items-center justify-center gap-2 w-full"
            >
              <ArrowLeft size={16} /> Torna al Login
            </button>
          ) : (
            <button 
              onClick={() => toggleMode(isSignUp ? 'login' : 'signup')}
              className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline flex items-center justify-center gap-2 w-full"
            >
              {isSignUp ? (
                <>
                  <LogIn size={16} /> Hai già un account? Accedi
                </>
              ) : (
                <>
                  <UserPlus size={16} /> Non hai un account? Registrati
                </>
              )}
            </button>
          )}
        </div>
        
        <div className="mt-6 text-center text-xs text-slate-400">
          Supplier Invoice Manager &copy; {new Date().getFullYear()}
        </div>
      </div>
    </div>
  );
};