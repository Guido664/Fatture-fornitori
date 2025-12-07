import { createClient } from '@supabase/supabase-js';

// Credenziali fornite dall'utente
const SUPABASE_URL = 'https://nfdahpzoiiikohqcntbe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5mZGFocHpvaWlpa29ocWNudGJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwODY0NjEsImV4cCI6MjA4MDY2MjQ2MX0.nQMHdrDrKl_n0Xrcd7FbdTZmgEnP44QV2ftujHCcma0';

// Creazione del client con gestione errori base se le chiavi non fossero valide
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);