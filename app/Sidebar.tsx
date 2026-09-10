// Sidebar.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Upload,
  FileText,
  Settings,
  LogOut,
  Sun,
  Moon,
  ChevronDown,
} from 'lucide-react';
import { sidebarStyles } from './styles';

interface SidebarProps {
  activeModule: string;
  onModuleChange: (module: string) => void;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

export default function Sidebar({
  activeModule,
  onModuleChange,
  darkMode,
  setDarkMode,
}: SidebarProps) {
  const router = useRouter();

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'upload', icon: Upload, label: 'Enviar Documentos' },
    { id: 'documentos', icon: FileText, label: 'Meus Documentos' },
    { id: 'configuracoes', icon: Settings, label: 'Configurações' },
  ];

  const handleClick = (id: string) => {
    onModuleChange(id);

    if (id === 'dashboard') {
      router.push('/');
    } else if (id === 'upload') {
      router.push('/upload');
    } else if (id === 'documentos') {
      router.push('/');
    } else if (id === 'configuracoes') {
      router.push('/');
    }
  };

  return (
    <aside style={sidebarStyles.aside}>
      {/* Logo */}
      <div style={sidebarStyles.logoContainer}>
        <div style={sidebarStyles.logoInner}>
          <div style={sidebarStyles.logoIcon}>
            <FileText color="white" size={20} />
          </div>
          <div>
            <h1 style={sidebarStyles.logoTitle}>SGI Docs</h1>
            <p style={sidebarStyles.logoSubtitle}>
              Gestão Inteligente de
              <br />
              Documentos
            </p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <nav style={sidebarStyles.nav}>
        {menuItems.map((item) => {
          const isActive = activeModule === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleClick(item.id)}
              style={sidebarStyles.menuItem(isActive)}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor =
                    'rgba(255,255,255,0.1)';
                  e.currentTarget.style.color = 'white';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#cbd5e1';
                }
              }}
            >
              <item.icon size={18} color={isActive ? 'white' : '#cbd5e1'} />
              <span style={{ color: isActive ? 'white' : '#cbd5e1' }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Admin */}
      <div style={sidebarStyles.adminContainer}>
        <div style={sidebarStyles.adminInner}>
          <div style={sidebarStyles.adminAvatar}>A</div>
          <div>
            <p style={sidebarStyles.adminName}>Administrador</p>
            <p style={sidebarStyles.adminEmail}>admin@sgi.docs</p>
          </div>
          <ChevronDown
            size={16}
            color="#94a3b8"
            style={{ marginLeft: 'auto' }}
          />
        </div>
      </div>
      
<button
  onClick={async () => {
    const { signOut } = await import('./lib/documents');
    await signOut();
    window.location.href = '/login';
  }}
  style={{
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.625rem 1rem',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#ef4444',
    transition: 'all 0.2s',
  }}
>
  <LogOut size={18} />
  Sair
</button>
      {/* Tema */}
      <div style={sidebarStyles.themeContainer}>
        <button
          onClick={() => setDarkMode(!darkMode)}
          style={sidebarStyles.themeButton}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          <span>{darkMode ? 'Tema escuro' : 'Tema claro'}</span>
        </button>
        <button
          onClick={() => setDarkMode(!darkMode)}
          style={sidebarStyles.themeToggle}
        >
          <span style={sidebarStyles.themeToggleKnob(darkMode)} />
        </button>
      </div>
    </aside>
  );
}
