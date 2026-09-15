// lib/settings.ts
import { supabase } from './supabase';

export interface Settings {
  darkMode: boolean;
  notifications: boolean;
  autoOCR: boolean;
  saveHistory: boolean;
  language: 'pt-BR' | 'en-US';
  storageLimit: number;
}

export const DEFAULT_SETTINGS: Settings = {
  darkMode: true,
  notifications: true,
  autoOCR: true,
  saveHistory: true,
  language: 'pt-BR',
  storageLimit: 50,
};

const STORAGE_KEY = 'sgi_docs_settings';

// ✅ Carrega as configurações
export async function loadSettings(): Promise<Settings> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      const settings = { ...DEFAULT_SETTINGS, ...parsed };
      applyTheme(settings.darkMode);
      return settings;
    }
  } catch (err) {
    console.warn('Erro ao ler localStorage:', err);
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        const settings: Settings = {
          darkMode: data.dark_mode ?? DEFAULT_SETTINGS.darkMode,
          notifications: data.notifications ?? DEFAULT_SETTINGS.notifications,
          autoOCR: data.auto_ocr ?? DEFAULT_SETTINGS.autoOCR,
          saveHistory: data.save_history ?? DEFAULT_SETTINGS.saveHistory,
          language: (data.language as 'pt-BR' | 'en-US') ?? DEFAULT_SETTINGS.language,
          storageLimit: data.storage_limit ?? DEFAULT_SETTINGS.storageLimit,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        applyTheme(settings.darkMode);
        return settings;
      }
    }
  } catch (err) {
    console.warn('Erro ao ler do Supabase:', err);
  }

  applyTheme(DEFAULT_SETTINGS.darkMode);
  return DEFAULT_SETTINGS;
}

// ✅ Salva as configurações
export async function saveSettings(settings: Settings): Promise<void> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  applyTheme(settings.darkMode);

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase.from('settings').upsert(
        {
          user_id: user.id,
          dark_mode: settings.darkMode,
          notifications: settings.notifications,
          auto_ocr: settings.autoOCR,
          save_history: settings.saveHistory,
          language: settings.language,
          storage_limit: settings.storageLimit,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    }
  } catch (err) {
    console.warn('Erro ao salvar no Supabase:', err);
  }
}

// ✅ Aplica o tema no <html>
export function applyTheme(isDark: boolean) {
  if (typeof document === 'undefined') return;

  const html = document.documentElement;
  if (isDark) {
    html.setAttribute('data-theme', 'dark');
  } else {
    html.setAttribute('data-theme', 'light');
  }
}

// ✅ Resetar
export async function resetSettings(): Promise<Settings> {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
  applyTheme(DEFAULT_SETTINGS.darkMode);

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from('settings')
        .update({
          dark_mode: DEFAULT_SETTINGS.darkMode,
          notifications: DEFAULT_SETTINGS.notifications,
          auto_ocr: DEFAULT_SETTINGS.autoOCR,
          save_history: DEFAULT_SETTINGS.saveHistory,
          language: DEFAULT_SETTINGS.language,
          storage_limit: DEFAULT_SETTINGS.storageLimit,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
    }
  } catch (err) {
    console.warn('Erro ao resetar no Supabase:', err);
  }

  return DEFAULT_SETTINGS;
}
