// ConfiguracoesModule.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Save,
  Settings,
  User,
  Bell,
  Shield,
  Database,
  Moon,
  CheckCircle2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

// ✅ Tipos das configurações
interface Settings {
  darkMode: boolean;
  notifications: boolean;
  autoOCR: boolean;
  saveHistory: boolean;
  language: 'pt-BR' | 'en-US';
  storageLimit: number;
}

// ✅ Configurações padrão
const DEFAULT_SETTINGS: Settings = {
  darkMode: false,
  notifications: true,
  autoOCR: true,
  saveHistory: true,
  language: 'pt-BR',
  storageLimit: 50,
};

// ✅ Chave do localStorage
const STORAGE_KEY = 'sgi_docs_settings';

export default function ConfiguracoesModule() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // ✅ Carrega as configurações salvas ao abrir
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
    }
  }, []);

  // ✅ Atualiza uma configuração específica
  const updateSetting = <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // ✅ Salva as configurações no localStorage
  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
    }
  };

  // ✅ Resetar configurações
  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem(STORAGE_KEY);
    setShowResetConfirm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#0f172a',
          marginBottom: '0.5rem',
        }}
      >
        Configurações
      </h1>
      <p
        style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '2rem' }}
      >
        Gerencie as preferências do sistema
      </p>

      {/* Aparência */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: 'bold',
            color: '#0f172a',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Settings size={18} color="#3b82f6" />
          Aparência
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '0.875rem', color: '#334155' }}>
              <Moon
                size={14}
                style={{
                  display: 'inline',
                  marginRight: '8px',
                  color: '#64748b',
                }}
              />
              Tema escuro
            </span>
            <input
              type="checkbox"
              checked={settings.darkMode}
              onChange={(e) => updateSetting('darkMode', e.target.checked)}
              style={{ width: '1rem', height: '1rem' }}
            />
          </label>
        </div>
      </div>

      {/* Notificações */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: 'bold',
            color: '#0f172a',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Bell size={18} color="#3b82f6" />
          Notificações
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '0.875rem', color: '#334155' }}>
              Receber alertas de novos documentos
            </span>
            <input
              type="checkbox"
              checked={settings.notifications}
              onChange={(e) => updateSetting('notifications', e.target.checked)}
              style={{ width: '1rem', height: '1rem' }}
            />
          </label>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '0.875rem', color: '#334155' }}>
              Notificar quando OCR terminar
            </span>
            <input
              type="checkbox"
              checked={settings.autoOCR}
              onChange={(e) => updateSetting('autoOCR', e.target.checked)}
              style={{ width: '1rem', height: '1rem' }}
            />
          </label>
        </div>
      </div>

      {/* Armazenamento */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: 'bold',
            color: '#0f172a',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Database size={18} color="#3b82f6" />
          Armazenamento
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.875rem', color: '#334155' }}>
              Limite máximo de upload (MB)
            </label>
            <input
              type="number"
              value={settings.storageLimit}
              onChange={(e) =>
                updateSetting('storageLimit', parseInt(e.target.value) || 1)
              }
              min={1}
              max={500}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                marginTop: '0.5rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
              }}
            />
          </div>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '0.875rem', color: '#334155' }}>
              Salvar histórico de versões
            </span>
            <input
              type="checkbox"
              checked={settings.saveHistory}
              onChange={(e) => updateSetting('saveHistory', e.target.checked)}
              style={{ width: '1rem', height: '1rem' }}
            />
          </label>
        </div>
      </div>

      {/* Idioma */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: 'bold',
            color: '#0f172a',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <User size={18} color="#3b82f6" />
          Idioma
        </h2>
        <select
          value={settings.language}
          onChange={(e) =>
            updateSetting('language', e.target.value as 'pt-BR' | 'en-US')
          }
          style={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            border: '1px solid #e2e8f0',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
          }}
        >
          <option value="pt-BR">Português (Brasil)</option>
          <option value="en-US">English (US)</option>
        </select>
      </div>

      {/* Segurança */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: 'bold',
            color: '#0f172a',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <Shield size={18} color="#3b82f6" />
          Segurança
        </h2>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#64748b',
            fontSize: '0.875rem',
          }}
        >
          <CheckCircle2 size={16} color="#10b981" />
          <span>Seus dados estão protegidos com criptografia</span>
        </div>
      </div>

      {/* Zona de perigo */}
      <div
        style={{
          backgroundColor: '#fef2f2',
          borderRadius: '1rem',
          border: '1px solid #fecaca',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: 'bold',
            color: '#991b1b',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <AlertTriangle size={18} />
          Zona de Perigo
        </h2>
        <p
          style={{
            fontSize: '0.875rem',
            color: '#7f1d1d',
            marginBottom: '1rem',
          }}
        >
          Restaurar as configurações padrão. Isso não afeta seus documentos.
        </p>
        {!showResetConfirm ? (
          <button
            onClick={() => setShowResetConfirm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#dc2626',
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            <Trash2 size={16} />
            Restaurar configurações padrão
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleReset}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Sim, restaurar
            </button>
            <button
              onClick={() => setShowResetConfirm(false)}
              style={{
                backgroundColor: 'white',
                color: '#374151',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontWeight: 600,
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Botão salvar */}
      <button
        onClick={handleSave}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: saved ? '#10b981' : '#2563eb',
          color: 'white',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.5rem',
          fontWeight: 600,
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.875rem',
          boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)',
          transition: 'background-color 0.3s',
        }}
      >
        {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
        {saved ? 'Salvo com sucesso!' : 'Salvar Configurações'}
      </button>
    </div>
  );
}
