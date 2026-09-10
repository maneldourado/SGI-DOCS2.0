// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// ⚠️ ATENÇÃO: Substitua pelos seus dados do Supabase
const supabaseUrl = 'https://gudigtnsuqkpcvypibai.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1ZGlndG5zdXFrcGN2eXBpYmFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNTE4NzcsImV4cCI6MjEwNDYyNzg3N30._suPmZi6DdCdXXeUsfeEiCGt74pKujX_YwWNdA9KU_w';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ✅ Tipo do documento (baseado no schema da tabela)
export interface DocumentData {
  id: string;
  code: string;
  title: string;
  file_name: string;
  file_url: string | null;
  content: string | null;
  category: string;
  orientation: 'portrait' | 'landscape';
  uploaded_at: string;
  user_id: string;
}
