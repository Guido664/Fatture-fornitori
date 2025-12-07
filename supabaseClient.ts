import { createClient } from '@supabase/supabase-js';

// ATTENZIONE: Inserisci qui le tue credenziali di Supabase
// Trovi queste info nelle impostazioni del progetto su supabase.com -> API
const SUPABASE_URL = 'INSERISCI_IL_TUO_SUPABASE_URL_QUI';
const SUPABASE_ANON_KEY = 'INSERISCI_LA_TUA_SUPABASE_ANON_KEY_QUI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);