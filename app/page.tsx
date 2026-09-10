// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Upload,
  Clock,
  FolderOpen,
  Clock3,
  HardDrive,
  MoreVertical,
  Database,
  CheckCircle2,
  Zap,
  Shield,
  Loader2,
  ArrowRight,
  Search,
  Bell,
  Settings as SettingsIcon,
  ChevronRight,
  TrendingUp,
  Award,
  FileCheck,
  FileSpreadsheet,
  File,
  ScanText,
  Lock,
  ArrowUp,
} from 'lucide-react';
import Link from 'next/link';
import Sidebar from './Sidebar';
import BuscarDocumentosModule from './BuscarDocumentosModule';
import ConfiguracoesModule from './ConfiguracoesModule';
import DocumentosModule from './DocumentosModule';
import { pageStyles, metricCardStyles, moduleStyles } from './styles';
import { getAllDocuments, deleteDocument } from './lib/documents';
import { supabase } from './lib/supabase';
import type { DocumentData } from './lib/supabase';

// ✅ MetricCard (dark)
function MetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  iconBg,
  iconColor,
  trend,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtitle: string;
  iconBg: string;
  iconColor: string;
  trend?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        ...metricCardStyles.card,
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        borderColor: hovered
          ? 'rgba(59, 130, 246, 0.4)'
          : 'rgba(59, 130, 246, 0.15)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={metricCardStyles.iconContainer(iconBg)}>
        <Icon size={22} color={iconColor} />
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

// ✅ DocumentCard (dark)
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
        background: hovered
          ? 'rgba(30, 58, 95, 0.4)'
          : 'rgba(30, 58, 95, 0.2)',
        borderColor: hovered
          ? 'rgba(59, 130, 246, 0.3)'
          : 'rgba(59, 130, 246, 0.1)',
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
          color: '#60a5fa',
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
          color: hovered ? '#ef4444' : '#64748b',
        }}
      >
        <MoreVertical size={14} />
      </button>
    </div>
  );
}

// ✅ Donut Chart (categorias)
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
              color: 'white',
              margin: 0,
            }}
          >
            {total}
          </p>
          <p style={{ fontSize: '0.65rem', color: '#94a3b8', margin: 0 }}>
            Documentos
          </p>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
            <span style={{ color: '#cbd5e1', flex: 1 }}>{item.label}</span>
            <span style={{ color: 'white', fontWeight: 600 }}>
              {item.value}{' '}
              <span style={{ color: '#64748b', fontWeight: 400 }}>
                ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
              </span>
            </span>
          </div>
        ))}
      </div>
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
  const [userName, setUserName] = useState('Administrador');

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

        const name = user.email?.split('@')[0] || 'Usuário';
        setUserName(name.charAt(0).toUpperCase() + name.slice(1));
      } catch (err) {
        console.error('Erro ao verificar autenticação:', err);
        router.push('/login');
      } finally {
        setAuthChecking(false);
      }
    };

    checkAuth();
  }, [router]);

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

  // ✅ Cálculos
  const totalDocuments = documents.length;
  const totalCategories = new Set(documents.map((d) => d.category)).size;
  const todayDocs = documents.filter(
    (d) => new Date(d.uploaded_at).toDateString() === new Date().toDateString()
  ).length;
  const totalSize = documents.reduce(
    (acc, doc) => acc + (doc.content?.length || 0),
    0
  );

  // ✅ Categorias para o donut
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

  // ✅ Atividade recente (5 últimos)
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
          background: '#050f1f',
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
              color: '#3b82f6',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem',
            }}
          />
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
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
              iconColor="white"
              trend="100%"
            />
            <MetricCard
              icon={FolderOpen}
              label="Categorias"
              value={String(totalCategories)}
              subtitle="Categorias cadastradas"
              iconBg="linear-gradient(135deg, #10b981 0%, #059669 100%)"
              iconColor="white"
            />
            <MetricCard
              icon={Clock3}
              label="Documentos Hoje"
              value={String(todayDocs)}
              subtitle="Novos documentos enviados"
              iconBg="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              iconColor="white"
              trend="100%"
            />
            <MetricCard
              icon={HardDrive}
              label="Armazenamento"
              value={`${(totalSize / 1024).toFixed(1)} KB`}
              subtitle="Espaço utilizado"
              iconBg="linear-gradient(135deg, #a855f7 0%, #9333ea 100%)"
              iconColor="white"
              trend="100%"
            />
          </div>

          {/* Grid Principal - 3 colunas */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr 1fr',
              gap: '1.25rem',
            }}
          >
            {/* Coluna 1 - Enviar + Documentos Recentes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Card de Envio */}
              <div style={moduleStyles.card}>
                <div style={moduleStyles.cardHeader}>
                  <h2 style={moduleStyles.cardTitle}>
                    <Upload size={18} color="#3b82f6" />
                    Enviar Novo Documento
                  </h2>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      color: '#94a3b8',
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
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.6)';
                      e.currentTarget.style.background = 'rgba(30, 58, 95, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                      e.currentTarget.style.background = 'rgba(30, 58, 95, 0.2)';
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
                    <CheckCircle2 size={14} color="#3b82f6" />
                    OCR Inteligente
                  </div>
                  <div style={moduleStyles.featureItem}>
                    <Zap size={14} color="#3b82f6" />
                    Busca Avançada
                  </div>
                  <div style={moduleStyles.featureItem}>
                    <Shield size={14} color="#3b82f6" />
                    Seguro & Privado
                  </div>
                </div>
              </div>

              {/* Documentos Recentes */}
              <div style={moduleStyles.card}>
                <div style={moduleStyles.cardHeader}>
                  <h2 style={moduleStyles.cardTitle}>
                    <Clock3 size={18} color="#3b82f6" />
                    Documentos Recentes
                  </h2>
                  <button
                    onClick={() => setActiveModule('documentos')}
                    style={{
                      fontSize: '0.7rem',
                      color: '#3b82f6',
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
                        color: '#64748b',
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
                        color: '#64748b',
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

            {/* Coluna 2 - Busca + Donut */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <BuscarDocumentosModule />

              {/* Donut de Categorias */}
              <div style={moduleStyles.card}>
                <div style={moduleStyles.cardHeader}>
                  <h2 style={moduleStyles.cardTitle}>
                    <FolderOpen size={18} color="#3b82f6" />
                    Documentos por Categoria
                  </h2>
                </div>
                <CategoryDonut data={categoryData} total={totalDocuments} />
              </div>
            </div>

            {/* Coluna 3 - Atividade + Banner */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Atividade Recente */}
              <div style={moduleStyles.card}>
                <div style={moduleStyles.cardHeader}>
                  <h2 style={moduleStyles.cardTitle}>
                    <Clock size={18} color="#3b82f6" />
                    Atividade Recente
                  </h2>
                  <button
                    onClick={() => setActiveModule('documentos')}
                    style={{
                      fontSize: '0.7rem',
                      color: '#3b82f6',
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {recentActivity.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.5rem 0',
                        borderBottom: '1px solid rgba(59, 130, 246, 0.08)',
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
                            color: 'white',
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
                            color: '#94a3b8',
                            margin: '0.125rem 0 0',
                          }}
                        >
                          Enviado em{' '}
                          {new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}{' '}
                          às{' '}
                          {new Date(doc.uploaded_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: '0.6rem',
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: '#60a5fa',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '9999px',
                          fontWeight: 600,
                        }}
                      >
                        {doc.category}
                      </span>
                      <ChevronRight size={14} color="#64748b" />
                    </div>
                  ))}
                  {recentActivity.length === 0 && (
                    <p
                      style={{
                        textAlign: 'center',
                        color: '#64748b',
                        padding: '2rem 0',
                        fontSize: '0.75rem',
                      }}
                    >
                      Nenhuma atividade recente.
                    </p>
                  )}
                </div>
              </div>

              {/* Banner SGI Docs */}
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

                {/* Decoração */}
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

              {/* Badges */}
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
                      background: 'rgba(15, 30, 58, 0.5)',
                      border: '1px solid rgba(59, 130, 246, 0.15)',
                      borderRadius: '0.5rem',
                      fontSize: '0.65rem',
                      color: '#94a3b8',
                      fontWeight: 500,
                      justifyContent: 'center',
                    }}
                  >
                    <item.icon size={12} color="#3b82f6" />
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
              Bem-vindo de volta, {userName}! 👋
            </h1>
            <p style={pageStyles.headerSubtitle}>
              Aqui está um resumo da sua gestão de documentos.
            </p>
          </div>
          <div style={pageStyles.headerActions}>
            <div style={pageStyles.searchBar}>
              <Search size={14} color="#64748b" />
              <input
                type="text"
                placeholder="Buscar documentos, códigos, títulos..."
                style={pageStyles.searchInput}
              />
              <span
                style={{
                  fontSize: '0.65rem',
                  color: '#64748b',
                  padding: '0.125rem 0.375rem',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '0.25rem',
                }}
              >
                Ctrl + K
              </span>
            </div>
            <button style={pageStyles.headerIconButton}>
              <Bell size={16} />
            </button>
            <button style={pageStyles.headerIconButton}>
              <SettingsIcon size={16} />
            </button>
            <div style={pageStyles.headerAvatar}>A</div>
            <div style={{ textAlign: 'left' }}>
              <p
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'white',
                  margin: 0,
                }}
              >
                {userName}
              </p>
              <p style={{ fontSize: '0.65rem', color: '#94a3b8', margin: 0 }}>
                admin@sgi.docs
              </p>
            </div>
          </div>
        </header>

        <main style={pageStyles.main}>{renderModule()}</main>
      </div>
    </div>
  );
}
