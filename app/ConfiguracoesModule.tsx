// app/ConfiguracoesModule.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  Save,
  Settings as SettingsIcon,
  User,
  Bell,
  Shield,
  Database,
  Moon,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Loader2,
  Sun,
} from 'lucide-react';
import {
  loadSettings,
  saveSettings,
  resetSettings,
  applyDarkMode,
  DEFAULT_SETTINGS,
  type Settings,
} from './lib/settings';

export default function ConfiguracoesModule() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [error, setError] = useState('');

  // ✅ Carrega as configurações ao abrir
  useEffect(() => {
    loadSettings()
      .then((loaded) => {
        setSettings(loaded);
        applyDarkMode(loaded.darkMode);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ✅ Atualiza uma configuração (aplica em tempo real)
  const updateSetting = <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    // ✅ Aplica o tema escuro em tempo real
    if (key === 'darkMode') {
      applyDarkMode(value as boolean);
    }

    // ✅ Salva automaticamente no localStorage (sem esperar o botão)
    localStorage.setItem('sgi_docs_settings', JSON.stringify(newSettings));
  };

  // ✅ Salva tudo (localStorage + Supabase)
  const handleSave = async () => {
    setSaving(true);
    setError('');

    try {
      await saveSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError('Erro ao salvar configurações');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // ✅ Resetar configurações
  const handleReset = async () => {
    const defaults = await resetSettings();
    setSettings(defaults);
    setShowResetConfirm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  // ✅ Loading
  if (loading) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '4rem 0',
          color: '#64748b',
        }}
      >
        <Loader2
          size={32}
          style={{
            color: '#3b82f6',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem',
          }}
        />
        <p style={{ fontSize: '0.875rem' }}>Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'white',
          marginBottom: '0.5rem',
          letterSpacing: '-0.02em',
        }}
      >
        Configurações
      </h1>
      <p
        style={{
          fontSize: '0.875rem',
          color: '#94a3b8',
          marginBottom: '2rem',
        }}
      >
        Gerencie as preferências do sistema
      </p>

      {/* ✅ Aparência */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>
          <SettingsIcon size={18} color="#3b82f6" />
          Aparência
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={labelStyle}>
            <span style={labelTextStyle}>
              {settings.darkMode ? (
                <Moon
                  size={14}
                  style={{ display: 'inline', marginRight: '8px', color: '#60a5fa' }}
                />
              ) : (
                <Sun
                  size={14}
                  style={{ display: 'inline', marginRight: '8px', color: '#f59e0b' }}
                />
              )}
              Tema escuro
            </span>
            <ToggleSwitch
              checked={settings.darkMode}
              onChange={(v) => updateSetting('darkMode', v)}
            />
          </label>
          <p
            style={{
              fontSize: '0.7rem',
              color: '#64748b',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            💡 O tema é aplicado imediatamente em todo o sistema.
          </p>
        </div>
      </div>

      {/* ✅ Notificações */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>
          <Bell size={18} color="#3b82f6" />
          Notificações
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={labelStyle}>
            <span style={labelTextStyle}>
              Receber alertas de novos documentos
            </span>
            <ToggleSwitch
              checked={settings.notifications}
              onChange={(v) => updateSetting('notifications', v)}
            />
          </label>
          <label style={labelStyle}>
            <span style={labelTextStyle}>
              Notificar quando OCR terminar
            </span>
            <ToggleSwitch
              checked={settings.autoOCR}
              onChange={(v) => updateSetting('autoOCR', v)}
            />
          </label>
        </div>
      </div>

      {/* ✅ Armazenamento */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>
          <Database size={18} color="#3b82f6" />
          Armazenamento
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#94a3b8',
              }}
            >
              Limite máximo de upload (MB)
            </label>
            <input
              data-theme="dark"
              type="number"
              value={settings.storageLimit}
              onChange={(e) =>
                updateSetting('storageLimit', parseInt(e.target.value) || 1)
              }
              min={1}
              max={500}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                marginTop: '0.5rem',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '0.75rem',
                fontSize: '0.8rem',
                background: 'rgba(30, 58, 95, 0.2)',
                color: 'white',
                outline: 'none',
              }}
            />
            <p
              style={{
                fontSize: '0.7rem',
                color: '#64748b',
                margin: '0.5rem 0 0',
                lineHeight: 1.5,
              }}
            >
              💡 Arquivos maiores que {settings.storageLimit}MB serão bloqueados
              no upload.
            </p>
          </div>
          <label style={labelStyle}>
            <span style={labelTextStyle}>Salvar histórico de versões</span>
            <ToggleSwitch
              checked={settings.saveHistory}
              onChange={(v) => updateSetting('saveHistory', v)}
            />
          </label>
        </div>
      </div>

      {/* ✅ Idioma */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>
          <User size={18} color="#3b82f6" />
          Idioma
        </h2>
        <select
          data-theme="dark"
          value={settings.language}
          onChange={(e) =>
            updateSetting('language', e.target.value as 'pt-BR' | 'en-US')
          }
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: '0.75rem',
            fontSize: '0.8rem',
            background: '#0f1e3a',
            color: 'white',
            outline: 'none',
          }}
        >
          <option value="pt-BR">Português (Brasil)</option>
          <option value="en-US">English (US)</option>
        </select>
      </div>

      {/* ✅ Segurança */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>
          <Shield size={18} color="#3b82f6" />
          Segurança
        </h2>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#94a3b8',
            fontSize: '0.8rem',
          }}
        >
          <CheckCircle2 size={16} color="#10b981" />
          <span>Seus dados estão protegidos com criptografia</span>
        </div>
      </div>

      {/* ✅ Zona de perigo */}
      <div
        style={{
          background: 'rgba(239, 68, 68, 0.08)',
          borderRadius: '1rem',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: '#fca5a5',
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
            fontSize: '0.8rem',
            color: '#fca5a5',
            marginBottom: '1rem',
            lineHeight: 1.5,
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
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              color: 'white',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.75rem',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            <Trash2 size={14} />
            Restaurar configurações padrão
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleReset}
              style={{
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                color: 'white',
                padding: '0.625rem 1.25rem',
                borderRadius: '0.75rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              Sim, restaurar
            </button>
            <button
              onClick={() => setShowResetConfirm(false)}
              style={{
                background: 'rgba(15, 30, 58, 0.6)',
                color: '#94a3b8',
                padding: '0.625rem 1.25rem',
                borderRadius: '0.75rem',
                fontWeight: 600,
                border: '1px solid rgba(59, 130, 246, 0.2)',
                cursor: 'pointer',
                fontSize: '0.8rem',
              }}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* ✅ Erro */}
      {error && (
        <div
          style={{
            padding: '0.75rem 1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            borderRadius: '0.5rem',
            fontSize: '0.8rem',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {/* ✅ Botão salvar */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: saved
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          color: 'white',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.75rem',
          fontWeight: 600,
          border: 'none',
          cursor: saving ? 'wait' : 'pointer',
          fontSize: '0.875rem',
          boxShadow: '0 4px 16px rgba(37, 99, 235, 0.4)',
          transition: 'all 0.3s',
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? (
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
        ) : saved ? (
          <CheckCircle2 size={16} />
        ) : (
          <Save size={16} />
        )}
        {saving
          ? 'Salvando...'
          : saved
          ? 'Salvo com sucesso!'
          : 'Salvar Configurações'}
      </button>
    </div>
  );
}

// ✅ Estilos reutilizáveis
const cardStyle: React.CSSProperties = {
  background: 'rgba(15, 30, 58, 0.5)',
  borderRadius: '1rem',
  border: '1px solid rgba(59, 130, 246, 0.15)',
  padding: '1.5rem',
  marginBottom: '1.25rem',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 700,
  color: 'white',
  marginBottom: '1rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.5rem',
};

const labelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'pointer',
};

const labelTextStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: '#cbd5e1',
  fontWeight: 500,
};

// ✅ Toggle Switch Component
function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        width: '2.5rem',
        height: '1.4rem',
        borderRadius: '9999px',
        background: checked ? '#3b82f6' : '#334155',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '0.15rem',
          left: checked ? '1.2rem' : '0.15rem',
          width: '1.1rem',
          height: '1.1rem',
          borderRadius: '50%',
          background: 'white',
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        }}
      />
    </button>
  );
}
