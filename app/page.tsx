// app/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Upload,
  Clock,
  FolderOpen,
  Clock3,
  HardDrive,
  MoreVertical,
  CheckCircle2,
  Zap,
  Shield,
  Loader2,
  ArrowRight,
  Bell,
  Settings as SettingsIcon,
  ChevronRight,
  TrendingUp,
  ScanText,
  Lock,
  X,
} from 'lucide-react';
import Link from 'next/link';
import Sidebar from './Sidebar';
import BuscarDocumentosModule from './BuscarDocumentosModule';
import ConfiguracoesModule from './ConfiguracoesModule';
import DocumentosModule from './DocumentosModule';
import { pageStyles, metricCardStyles, moduleStyles } from './styles';
import { getAllDocuments, deleteDocument } from './lib/documents';
import { supabase } from './lib/supabase';
import { loadSettings } from './lib/settings';
import type { DocumentData } from './lib/supabase';

// ✅ MetricCard
function MetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  iconBg,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtitle: string;
  iconBg: string;
  trend?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        ...metricCardStyles.card,
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        borderColor: hovered ? 'var(--border-hover)' : 'var(--border-primary)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={metricCardStyles.iconContainer(iconBg)}>
        <Icon size={22} color="white" />
      </div>
      <div style={metricCardStyles.textContainer}>
        <p style={metricCardStyles.label}>{label}</p>
        <p style={metricCardStyles.value}>{value}</p>
        <p style={metricCardStyles.subtitle}>{subtitle}</p>
      </div>
      {trend && (
        <div style={metricCardStyles.trend}>
          <TrendingUp size={12} />
          {trend}
        </div>
      )}
    </div>
  );
}

// ✅ DocumentCard
function DocumentCard({
  doc,
  onDelete,
}: {
  doc: DocumentData;
  onDelete: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        ...moduleStyles.docItem,
        background: hovered ? 'var(--bg-card-hover)' : 'var(--bg-card)',
        borderColor: hovered ? 'var(--border-hover)' : 'var(--border-primary)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={moduleStyles.docIcon}>
        <FileText size={18} color="white" />
      </div>
      <div style={moduleStyles.docInfo}>
        <p style={moduleStyles.docCode}>{doc.code}</p>
        <p style={moduleStyles.docTitle}>{doc.title}</p>
        <p style={moduleStyles.docDate}>
          <Clock size={10} style={{ display: 'inline', marginRight: '4px' }} />
          {new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}
        </p>
      </div>
      <span
        style={{
          fontSize: '0.65rem',
          background: 'rgba(59, 130, 246, 0.2)',
          color: 'var(--accent-light)',
          padding: '0.25rem 0.5rem',
          borderRadius: '9999px',
          fontWeight: 600,
        }}
      >
        {doc.category}
      </span>
      <button
        onClick={() => onDelete(doc.id)}
        style={{
          ...moduleStyles.docMenu,
          color: hovered ? '#ef4444' : 'var(--text-dim)',
        }}
      >
        <MoreVertical size={14} />
      </button>
    </div>
  );
}

// ✅ Donut Chart
function CategoryDonut({
  data,
  total,
}: {
  data: { label: string; value: number; color: string }[];
  total: number;
}) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
      <div style={{ position: 'relative', width: '160px', height: '160px' }}>
        <svg width="160" height="160" viewBox="0 0 160 160">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="rgba(59, 130, 246, 0.1)"
            strokeWidth="20"
          />
          {data.map((item, i) => {
            const percentage = total > 0 ? item.value / total : 0;
            const dashLength = percentage * circumference;
            const dashOffset = -currentOffset;
            currentOffset += dashLength;

            if (item.value === 0) return null;

            return (
              <circle
                key={i}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth="20"
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 80 80)"
                strokeLinecap="butt"
              />
            );
          })}
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            {total}
          </p>
          <p
            style={{
              fontSize: '0.65rem',
              color: 'var(--text-muted)',
              margin: 0,
            }}
          >
            Documentos
          </p>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
        }}
      >
        {data.map((item, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.75rem',
            }}
          >
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: item.color,
                flexShrink: 0,
              }}
            />
            <span style={{ color: 'var(--text-secondary)', flex: 1 }}>
              {item.label}
            </span>
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              {item.value}{' '}
              <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>
                ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ✅ NotificationsDropdown
function NotificationsDropdown({
  documents,
  onClose,
  onViewAll,
}: {
  documents: DocumentData[];
  onClose: () => void;
  onViewAll: () => void;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Pega os 8 últimos documentos
  const recentDocs = documents.slice(0, 8);

  return (
    <div
      ref={dropdownRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 0.5rem)',
        right: 0,
        width: '360px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-primary)',
        borderRadius: '1rem',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
        zIndex: 100,
        overflow: 'hidden',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      {/* Cabeçalho */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          borderBottom: '1px solid var(--border-primary)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bell size={16} color="var(--accent)" />
          <h3
            style={{
              fontSize: '0.9rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Notificações
          </h3>
          {recentDocs.length > 0 && (
            <span
              style={{
                fontSize: '0.65rem',
                background: 'var(--accent)',
                color: 'white',
                padding: '0.125rem 0.5rem',
                borderRadius: '9999px',
                fontWeight: 600,
              }}
            >
              {recentDocs.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            padding: '0.25rem',
            display: 'flex',
          }}
        >
          <X size={16} />
        </button>
      </div>

      {/* Lista */}
      <div
        style={{
          maxHeight: '400px',
          overflowY: 'auto',
        }}
      >
        {recentDocs.length === 0 ? (
          <div
            style={{
              padding: '3rem 1.5rem',
              textAlign: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <Bell
              size={32}
              style={{ marginBottom: '0.75rem', opacity: 0.5 }}
            />
            <p style={{ fontSize: '0.8rem', margin: 0 }}>
              Nenhuma notificação por aqui.
            </p>
            <p
              style={{
                fontSize: '0.7rem',
                color: 'var(--text-dim)',
                marginTop: '0.25rem',
              }}
            >
              Novos documentos aparecerão aqui.
            </p>
          </div>
        ) : (
          recentDocs.map((doc) => (
            <div
              key={doc.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.875rem 1.25rem',
                borderBottom: '1px solid var(--border-primary)',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-card-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <div
                style={{
                  width: '2rem',
                  height: '2rem',
                  background:
                    'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <FileText size={14} color="white" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    margin: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Novo documento: {doc.code}
                </p>
                <p
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    margin: '0.125rem 0 0',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {doc.title}
                </p>
                <p
                  style={{
                    fontSize: '0.65rem',
                    color: 'var(--text-dim)',
                    margin: '0.25rem 0 0',
                  }}
                >
                  {new Date(doc.uploaded_at).toLocaleDateString('pt-BR')} às{' '}
                  {new Date(doc.uploaded_at).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Rodapé */}
      {recentDocs.length > 0 && (
        <button
          onClick={() => {
            onViewAll();
            onClose();
          }}
          style={{
            width: '100%',
            padding: '0.875rem',
            background: 'var(--bg-card)',
            border: 'none',
            borderTop: '1px solid var(--border-primary)',
            color: 'var(--accent)',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.25rem',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-card-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-card)';
          }}
        >
          Ver todos os documentos
          <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(true);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userInitial, setUserInitial] = useState('U');

  // ✅ Estado do dropdown de notificações
  const [showNotifications, setShowNotifications] = useState(false);

  // ✅ Verifica autenticação
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/login');
          return;
        }

        const email = user.email || '';
        const namePart = email.split('@')[0];
        const formattedName = namePart
          .replace(/[._-]/g, ' ')
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        setUserName(formattedName);
        setUserEmail(email);
        setUserInitial(formattedName.charAt(0).toUpperCase());
      } catch (err) {
        console.error('Erro ao verificar autenticação:', err);
        router.push('/login');
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  // ✅ Carrega configurações
  useEffect(() => {
    loadSettings().then((s) => setDarkMode(s.darkMode));
  }, []);

  // ✅ Buscar documentos
  useEffect(() => {
    if (authChecking) return;

    getAllDocuments()
      .then((docs) => setDocuments(docs))
      .catch((err) => console.error('Erro ao buscar documentos:', err))
      .finally(() => setLoading(false));
  }, [authChecking]);

  // ✅ Excluir documento
  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  const totalDocuments = documents.length;
  const totalCategories = new Set(documents.map((d) => d.category)).size;
  const todayDocs = documents.filter(
    (d) => new Date(d.uploaded_at).toDateString() === new Date().toDateString()
  ).length;
  const totalSize = documents.reduce(
    (acc, doc) => acc + (doc.content?.length || 0),
    0
  );

  const categoryColors = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#64748b'];
  const categoryMap = new Map<string, number>();
  documents.forEach((d) => {
    categoryMap.set(d.category, (categoryMap.get(d.category) || 0) + 1);
  });
  const categoryData = Array.from(categoryMap.entries())
    .map(([label, value], i) => ({
      label,
      value,
      color: categoryColors[i % categoryColors.length],
    }))
    .slice(0, 5);

  const recentActivity = documents.slice(0, 5);

  // ✅ Loading
  if (authChecking) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-primary)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '4rem',
              height: '4rem',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              borderRadius: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
            }}
          >
            <FileText color="white" size={32} />
          </div>
          <Loader2
            size={24}
            style={{
              color: 'var(--accent)',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem',
            }}
          />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Verificando autenticação...
          </p>
        </div>
      </div>
    );
  }

  const renderModule = () => {
    if (activeModule === 'dashboard') {
      return (
        <>
          {/* Métricas */}
          <div style={metricCardStyles.container}>
            <MetricCard
              icon={FileText}
              label="Total de Documentos"
              value={String(totalDocuments)}
              subtitle="Documentos no sistema"
              iconBg="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
              trend="100%"
            />
            <MetricCard
              icon={FolderOpen}
              label="Categorias"
              value={String(totalCategories)}
              subtitle="Categorias cadastradas"
              iconBg="linear-gradient(135deg, #10b981 0%, #059669 100%)"
            />
            <MetricCard
              icon={Clock3}
              label="Documentos Hoje"
              value={String(todayDocs)}
              subtitle="Novos documentos enviados"
              iconBg="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              trend="100%"
            />
            <MetricCard
              icon={HardDrive}
              label="Armazenamento"
              value={`${(totalSize / 1024).toFixed(1)} KB`}
              subtitle="Espaço utilizado"
              iconBg="linear-gradient(135deg, #a855f7 0%, #9333ea 100%)"
              trend="100%"
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr 1fr',
              gap: '1.25rem',
            }}
          >
            {/* Coluna 1 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              <div style={moduleStyles.card}>
                <div style={moduleStyles.cardHeader}>
                  <h2 style={moduleStyles.cardTitle}>
                    <Upload size={18} color="var(--accent)" />
                    Enviar Novo Documento
                  </h2>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      color: 'var(--text-muted)',
                      background: 'rgba(59, 130, 246, 0.1)',
                      padding: '0.25rem 0.625rem',
                      borderRadius: '9999px',
                      fontWeight: 500,
                    }}
                  >
                    PDF, máximo 50MB
                  </span>
                </div>
                <Link
                  href="/upload"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div
                    style={moduleStyles.uploadContainer}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor =
                        'rgba(59, 130, 246, 0.6)';
                      e.currentTarget.style.background =
                        'rgba(30, 58, 95, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor =
                        'rgba(59, 130, 246, 0.3)';
                      e.currentTarget.style.background =
                        'rgba(30, 58, 95, 0.2)';
                    }}
                  >
                    <div style={moduleStyles.uploadIcon}>
                      <Upload size={24} color="white" />
                    </div>
                    <p style={moduleStyles.uploadText}>Arraste seu PDF aqui</p>
                    <p style={moduleStyles.uploadSubtext}>
                      ou clique para selecionar
                    </p>
                    <span style={moduleStyles.uploadButton}>
                      <Upload size={14} />
                      Selecionar PDF
                    </span>
                  </div>
                </Link>
                <div style={moduleStyles.uploadFeatures}>
                  <div style={moduleStyles.featureItem}>
                    <CheckCircle2 size={14} color="var(--accent)" />
                    OCR Inteligente
                  </div>
                  <div style={moduleStyles.featureItem}>
                    <Zap size={14} color="var(--accent)" />
                    Busca Avançada
                  </div>
                  <div style={moduleStyles.featureItem}>
                    <Shield size={14} color="var(--accent)" />
                    Seguro & Privado
                  </div>
                </div>
              </div>

              <div style={moduleStyles.card}>
                <div style={moduleStyles.cardHeader}>
                  <h2 style={moduleStyles.cardTitle}>
                    <Clock3 size={18} color="var(--accent)" />
                    Documentos Recentes
                  </h2>
                  <button
                    onClick={() => setActiveModule('documentos')}
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--accent)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    Ver todos <ArrowRight size={12} />
                  </button>
                </div>
                <div style={moduleStyles.docList}>
                  {loading && (
                    <p
                      style={{
                        textAlign: 'center',
                        color: 'var(--text-dim)',
                        padding: '2rem 0',
                        fontSize: '0.8rem',
                      }}
                    >
                      Carregando...
                    </p>
                  )}
                  {!loading &&
                    documents.slice(0, 4).map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        doc={doc}
                        onDelete={handleDelete}
                      />
                    ))}
                  {!loading && documents.length === 0 && (
                    <p
                      style={{
                        textAlign: 'center',
                        color: 'var(--text-dim)',
                        padding: '2rem 0',
                        fontSize: '0.8rem',
                      }}
                    >
                      Nenhum documento enviado ainda.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Coluna 2 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              <BuscarDocumentosModule />

              <div style={moduleStyles.card}>
                <div style={moduleStyles.cardHeader}>
                  <h2 style={moduleStyles.cardTitle}>
                    <FolderOpen size={18} color="var(--accent)" />
                    Documentos por Categoria
                  </h2>
                </div>
                <CategoryDonut data={categoryData} total={totalDocuments} />
              </div>
            </div>

            {/* Coluna 3 */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              <div style={moduleStyles.card}>
                <div style={moduleStyles.cardHeader}>
                  <h2 style={moduleStyles.cardTitle}>
                    <Clock size={18} color="var(--accent)" />
                    Atividade Recente
                  </h2>
                  <button
                    onClick={() => setActiveModule('documentos')}
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--accent)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    Ver todas <ArrowRight size={12} />
                  </button>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  {recentActivity.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.5rem 0',
                        borderBottom: '1px solid var(--border-primary)',
                      }}
                    >
                      <div
                        style={{
                          width: '2rem',
                          height: '2rem',
                          background:
                            'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          borderRadius: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <FileText size={14} color="white" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {doc.code}
                        </p>
                        <p
                          style={{
                            fontSize: '0.65rem',
                            color: 'var(--text-muted)',
                            margin: '0.125rem 0 0',
                          }}
                        >
                          Enviado em{' '}
                          {new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}{' '}
                          às{' '}
                          {new Date(doc.uploaded_at).toLocaleTimeString(
                            'pt-BR',
                            {
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </p>
                      </div>
                      <ChevronRight size={14} color="var(--text-dim)" />
                    </div>
                  ))}
                  {recentActivity.length === 0 && (
                    <p
                      style={{
                        textAlign: 'center',
                        color: 'var(--text-dim)',
                        padding: '2rem 0',
                        fontSize: '0.75rem',
                      }}
                    >
                      Nenhuma atividade recente.
                    </p>
                  )}
                </div>
              </div>

              <div
                style={{
                  ...moduleStyles.card,
                  background:
                    'linear-gradient(135deg, rgba(30, 58, 95, 0.6) 0%, rgba(15, 30, 58, 0.8) 100%)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <div
                      style={{
                        width: '1.75rem',
                        height: '1.75rem',
                        background:
                          'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        borderRadius: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FileText size={14} color="white" />
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: 'white',
                          margin: 0,
                        }}
                      >
                        SGI Docs
                      </p>
                      <p
                        style={{
                          fontSize: '0.6rem',
                          color: '#94a3b8',
                          margin: 0,
                        }}
                      >
                        Gestão Inteligente de Documentos
                      </p>
                    </div>
                  </div>
                  <h3
                    style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: 'white',
                      margin: '0 0 0.25rem',
                    }}
                  >
                    Mais organização,
                    <br />
                    mais produtividade.
                  </h3>
                  <p
                    style={{
                      fontSize: '0.7rem',
                      color: '#94a3b8',
                      margin: '0 0 1rem',
                      lineHeight: 1.4,
                    }}
                  >
                    Centralize, proteja e acesse seus documentos de forma rápida
                    e segura.
                  </p>
                  <button
                    onClick={() => setActiveModule('documentos')}
                    style={{
                      background:
                        'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white',
                      padding: '0.5rem 1rem',
                      borderRadius: '0.5rem',
                      border: 'none',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                    }}
                  >
                    Saiba mais <ArrowRight size={12} />
                  </button>
                </div>

                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bottom: 0,
                    width: '40%',
                    background:
                      'radial-gradient(circle at right center, rgba(59, 130, 246, 0.2) 0%, transparent 70%)',
                    zIndex: 1,
                  }}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.5rem',
                }}
              >
                {[
                  { icon: Shield, label: 'Segurança' },
                  { icon: ScanText, label: 'OCR Inteligente' },
                  { icon: Lock, label: 'LGPD' },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.5rem',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '0.5rem',
                      fontSize: '0.65rem',
                      color: 'var(--text-muted)',
                      fontWeight: 500,
                      justifyContent: 'center',
                    }}
                  >
                    <item.icon size={12} color="var(--accent)" />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      );
    } else if (activeModule === 'documentos') {
      return <DocumentosModule />;
    } else if (activeModule === 'configuracoes') {
      return <ConfiguracoesModule />;
    }
    return null;
  };

  return (
    <div style={pageStyles.container}>
      <Sidebar
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      <div style={pageStyles.mainContent}>
        <header style={pageStyles.header}>
          <div>
            <h1 style={pageStyles.headerTitle}>
              Bem-vindo de volta{userName ? `, ${userName}` : ''}! 👋
            </h1>
            <p style={pageStyles.headerSubtitle}>
              Aqui está um resumo da sua gestão de documentos.
            </p>
          </div>
          <div style={pageStyles.headerActions}>
            {/* ✅ Sino com dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                style={pageStyles.headerIconButton}
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell size={16} />
                {documents.length > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      background: '#ef4444',
                      color: 'white',
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      width: '1rem',
                      height: '1rem',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 0 2px var(--bg-primary)',
                    }}
                  >
                    {documents.length > 9 ? '9+' : documents.length}
                  </span>
                )}
              </button>
              {showNotifications && (
                <NotificationsDropdown
                  documents={documents}
                  onClose={() => setShowNotifications(false)}
                  onViewAll={() => setActiveModule('documentos')}
                />
              )}
            </div>

            {/* ✅ Engrenagem → redireciona para Configurações */}
            <button
              style={pageStyles.headerIconButton}
              onClick={() => setActiveModule('configuracoes')}
            >
              <SettingsIcon size={16} />
            </button>

            <div style={pageStyles.headerAvatar}>{userInitial}</div>
            <div style={{ textAlign: 'left' }}>
              <p
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  margin: 0,
                }}
              >
                {userName || 'Carregando...'}
              </p>
              <p
                style={{
                  fontSize: '0.65rem',
                  color: 'var(--text-muted)',
                  margin: 0,
                }}
              >
                {userEmail || '...'}
              </p>
            </div>
          </div>
        </header>

        <main style={pageStyles.main}>{renderModule()}</main>
      </div>
    </div>
  );
}
