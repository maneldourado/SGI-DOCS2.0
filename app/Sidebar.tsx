// app/Sidebar.tsx
'use client';

import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Upload,
  FileText,
  Settings,
  Search,
  FolderOpen,
  LogOut,
  ChevronDown,
  Circle,
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
    { id: 'buscar', icon: Search, label: 'Buscar Documentos' },
    { id: 'categorias', icon: FolderOpen, label: 'Categorias' },
    { id: 'configuracoes', icon: Settings, label: 'Configurações' },
  ];

  const handleClick = (id: string) => {
    onModuleChange(id);

    if (id === 'dashboard') router.push('/');
    else if (id === 'upload') router.push('/upload');
    else if (id === 'documentos') onModuleChange('documentos');
    else if (id === 'configuracoes') onModuleChange('configuracoes');
  };

  const handleLogout = async () => {
    const { signOut } = await import('./lib/documents');
    await signOut();
    router.push('/login');
  };

  return (
    <aside style={sidebarStyles.aside}>
      {/* Logo */}
      <div style={sidebarStyles.logoContainer}>
        <div style={sidebarStyles.logoInner}>
          <div style={sidebarStyles.logoIcon}>
            <FileText color="white" size={22} />
          </div>
          <div>
            <h1 style={sidebarStyles.logoTitle}>
              SGI <span style={{ color: '#3b82f6' }}>Docs</span>
            </h1>
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
                  e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.08)';
                  e.currentTarget.style.color = 'white';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#94a3b8';
                }
              }}
            >
              <item.icon size={18} color={isActive ? 'white' : '#94a3b8'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Admin */}
      <div style={sidebarStyles.adminContainer}>
        <div style={sidebarStyles.adminInner}>
          <div style={sidebarStyles.adminAvatar}>A</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={sidebarStyles.adminName}>Administrador</p>
            <p style={sidebarStyles.adminEmail}>admin@sgi.docs</p>
          </div>
          <ChevronDown size={14} color="#94a3b8" />
        </div>
      </div>

      {/* Status */}
      <div style={sidebarStyles.statusContainer}>
        <Circle size={8} fill="#10b981" color="#10b981" />
        <span style={sidebarStyles.statusText}>Sistema Online</span>
        <span style={sidebarStyles.statusVersion}>v2.1.0</span>
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        style={sidebarStyles.logoutButton}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
          e.currentTarget.style.color = '#ef4444';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#94a3b8';
        }}
      >
        <LogOut size={16} />
        <span>Sair</span>
      </button>

      {/* Footer */}
      <div style={sidebarStyles.footerContainer}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg width="32" height="16" viewBox="0 0 40 20">
            <path
              d="M5 15 Q10 5, 15 15 T25 15 T35 15"
              stroke="#94a3b8"
              strokeWidth="1.5"
              fill="none"
            />
          </svg>
          <div>
            <p style={sidebarStyles.footerText}>Continental</p>
            <p style={sidebarStyles.footerSubtext}>HSEQ BRASIL</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
