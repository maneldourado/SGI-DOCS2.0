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
  applyTheme,
  DEFAULT_SETTINGS,
  type Settings,
} from './lib/settings';

export default function ConfiguracoesModule() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  useEffect(() => {
    loadSettings()
      .then((loaded) => {
        setSettings(loaded);
        applyTheme(loaded.darkMode);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateSetting = <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    // ✅ Aplica o tema em tempo real
    if (key === 'darkMode') {
      applyTheme(value as boolean);
    }

    localStorage.setItem('sgi_docs_settings', JSON.stringify(newSettings));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const defaults = await resetSettings();
    setSettings(defaults);
    setShowResetConfirm(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <Loader2
          size={32}
          style={{
            color: 'var(--accent)',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem',
          }}
        />
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Carregando configurações...
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '0.5rem',
        }}
      >
        Configurações
      </h1>
      <p
        style={{
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
          marginBottom: '2rem',
        }}
      >
        Gerencie as preferências do sistema
      </p>

      {/* Aparência */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>
          <SettingsIcon size={18} color="var(--accent)" />
          Aparência
        </h2>
        <label style={labelStyle}>
          <span style={labelTextStyle}>
            {settings.darkMode ? (
              <Moon
                size={14}
                style={{
                  display: 'inline',
                  marginRight: '8px',
                  color: 'var(--accent-light)',
                }}
              />
            ) : (
              <Sun
                size={14}
                style={{
                  display: 'inline',
                  marginRight: '8px',
                  color: '#f59e0b',
                }}
              />
            )}
            {settings.darkMode ? 'Tema escuro' : 'Tema claro'}
          </span>
          <ToggleSwitch
            checked={settings.darkMode}
            onChange={(v) => updateSetting('darkMode', v)}
          />
        </label>
        <p
          style={{
            fontSize: '0.7rem',
            color: 'var(--text-dim)',
            margin: '0.75rem 0 0',
            lineHeight: 1.5,
          }}
        >
          💡 O tema é aplicado imediatamente em todo o sistema.
        </p>
      </div>

      {/* Notificações */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>
          <Bell size={18} color="var(--accent)" />
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
            <span style={labelTextStyle}>Notificar quando OCR terminar</span>
            <ToggleSwitch
              checked={settings.autoOCR}
              onChange={(v) => updateSetting('autoOCR', v)}
            />
          </label>
        </div>
      </div>

      {/* Armazenamento */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>
          <Database size={18} color="var(--accent)" />
          Armazenamento
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
              }}
            >
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
                padding: '0.75rem 1rem',
                marginTop: '0.5rem',
                border: '1px solid var(--border-input)',
                borderRadius: '0.75rem',
                fontSize: '0.8rem',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
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

      {/* Idioma */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>
          <User size={18} color="var(--accent)" />
          Idioma
        </h2>
        <select
          value={settings.language}
          onChange={(e) =>
            updateSetting('language', e.target.value as 'pt-BR' | 'en-US')
          }
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            border: '1px solid var(--border-input)',
            borderRadius: '0.75rem',
            fontSize: '0.8rem',
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            outline: 'none',
          }}
        >
          <option value="pt-BR">Português (Brasil)</option>
          <option value="en-US">English (US)</option>
        </select>
      </div>

      {/* Segurança */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>
          <Shield size={18} color="var(--accent)" />
          Segurança
        </h2>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
          }}
        >
          <CheckCircle2 size={16} color="#10b981" />
          <span>Seus dados estão protegidos com criptografia</span>
        </div>
      </div>

      {/* Zona de perigo */}
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
                background: 'var(--bg-input)',
                color: 'var(--text-muted)',
                padding: '0.625rem 1.25rem',
                borderRadius: '0.75rem',
                fontWeight: 600,
                border: '1px solid var(--border-input)',
                cursor: 'pointer',
                fontSize: '0.8rem',
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
          ? 'Salvo!'
          : 'Salvar Configurações'}
      </button>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  borderRadius: '1rem',
  border: '1px solid var(--border-primary)',
  padding: '1.5rem',
  marginBottom: '1.25rem',
};

const titleStyle: React.CSSProperties = {
  fontSize: '1rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
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
  color: 'var(--text-secondary)',
  fontWeight: 500,
};

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
        background: checked ? 'var(--accent)' : 'var(--border-primary)',
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
