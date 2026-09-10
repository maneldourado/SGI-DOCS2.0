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

// ✅ MetricCard (refinado)
function MetricCard({
  icon: Icon,
  label,
  value,
  iconBg,
  iconColor,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  iconBg: string;
  iconColor: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        ...metricCardStyles.card,
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: hovered
          ? '0 12px 24px rgba(15, 23, 42, 0.08)'
          : '0 1px 3px rgba(0,0,0,0.05)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={metricCardStyles.iconContainer(iconBg)}>
        <Icon size={24} color={iconColor} />
      </div>
      <div style={metricCardStyles.textContainer}>
        <p style={metricCardStyles.label}>{label}</p>
        <p style={metricCardStyles.value}>{value}</p>
      </div>
    </div>
  );
}

// ✅ DocumentCard (refinado)
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
        backgroundColor: hovered ? '#f1f5f9' : '#f8fafc',
        borderColor: hovered ? '#cbd5e1' : '#f1f5f9',
        transform: hovered ? 'translateX(2px)' : 'translateX(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={moduleStyles.docIcon}>
        <FileText style={{ color: '#ef4444' }} size={20} />
      </div>
      <div style={moduleStyles.docInfo}>
        <p style={moduleStyles.docCode}>{doc.code}</p>
        <p style={moduleStyles.docTitle}>{doc.title}</p>
        <p style={moduleStyles.docDate}>
          <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
          {new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}
        </p>
      </div>
      <button
        onClick={() => onDelete(doc.id)}
        style={{
          ...moduleStyles.docMenu,
          color: hovered ? '#ef4444' : '#94a3b8',
        }}
      >
        <MoreVertical size={16} />
      </button>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [userName, setUserName] = useState('');

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

        // Pega o nome do usuário (parte antes do @)
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

  const totalDocuments = documents.length;
  const totalCategories = new Set(documents.map((d) => d.category)).size;
  const todayDocs = documents.filter(
    (d) => new Date(d.uploaded_at).toDateString() === new Date().toDateString()
  ).length;
  const totalSize = documents.reduce(
    (acc, doc) => acc + (doc.content?.length || 0),
    0
  );

  // ✅ Tela de loading
  if (authChecking) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'linear-gradient(135deg, #0a1628 0%, #0f1e3a 50%, #0a1628 100%)',
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
              iconBg="#eff6ff"
              iconColor="#3b82f6"
            />
            <MetricCard
              icon={FolderOpen}
              label="Categorias"
              value={String(totalCategories)}
              iconBg="#f0fdf4"
              iconColor="#22c55e"
            />
            <MetricCard
              icon={Clock3}
              label="Documentos Hoje"
              value={String(todayDocs)}
              iconBg="#fef3c7"
              iconColor="#f59e0b"
            />
            <MetricCard
              icon={HardDrive}
              label="Armazenamento"
              value={`${(totalSize / 1024).toFixed(1)} KB`}
              iconBg="#f3e8ff"
              iconColor="#a855f7"
            />
          </div>

          {/* Grid Principal */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2rem',
            }}
          >
            {/* Coluna Esquerda */}
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
            >
              {/* Card de Envio */}
              <div style={moduleStyles.card}>
                <div style={moduleStyles.cardHeader}>
                  <h2 style={moduleStyles.cardTitle}>
                    <Upload size={20} color="#3b82f6" />
                    Enviar Novo Documento
                  </h2>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: '#64748b',
                      backgroundColor: '#f1f5f9',
                      padding: '0.25rem 0.75rem',
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
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.backgroundColor = '#dbeafe';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#93c5fd';
                      e.currentTarget.style.backgroundColor = '#eff6ff';
                    }}
                  >
                    <div style={moduleStyles.uploadIcon}>
                      <Upload size={32} color="#3b82f6" />
                    </div>
                    <p style={moduleStyles.uploadText}>Arraste seu PDF aqui</p>
                    <p style={moduleStyles.uploadSubtext}>
                      ou clique para selecionar
                    </p>
                  </div>
                </Link>
                <div style={moduleStyles.uploadFeatures}>
                  <div style={moduleStyles.featureItem}>
                    <CheckCircle2 size={16} color="#3b82f6" />
                    OCR Inteligente
                  </div>
                  <div style={moduleStyles.featureItem}>
                    <Zap size={16} color="#3b82f6" />
                    Busca Avançada
                  </div>
                  <div style={moduleStyles.featureItem}>
                    <Shield size={16} color="#3b82f6" />
                    Seguro & Privado
                  </div>
                </div>
              </div>

              {/* Documentos Recentes */}
              <div style={moduleStyles.card}>
                <div style={moduleStyles.cardHeader}>
                  <h2 style={moduleStyles.cardTitle}>
                    <Clock3 size={20} color="#3b82f6" />
                    Documentos Recentes
                  </h2>
                  <button
                    onClick={() => setActiveModule('documentos')}
                    style={{
                      fontSize: '0.8rem',
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
                    Ver todos <ArrowRight size={14} />
                  </button>
                </div>
                <div style={moduleStyles.docList}>
                  {loading && (
                    <p
                      style={{
                        textAlign: 'center',
                        color: '#94a3b8',
                        padding: '2rem 0',
                        fontSize: '0.875rem',
                      }}
                    >
                      Carregando...
                    </p>
                  )}
                  {!loading &&
                    documents
                      .slice(0, 5)
                      .map((doc) => (
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
                        color: '#94a3b8',
                        padding: '2rem 0',
                        fontSize: '0.875rem',
                      }}
                    >
                      Nenhum documento enviado ainda.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Coluna Direita */}
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}
            >
              <BuscarDocumentosModule />

              <div style={moduleStyles.card}>
                <div style={moduleStyles.cardHeader}>
                  <h2 style={moduleStyles.cardTitle}>
                    <Database size={20} color="#3b82f6" />
                    Todos os documentos ({totalDocuments})
                  </h2>
                  <button
                    onClick={() => setActiveModule('documentos')}
                    style={{
                      fontSize: '0.8rem',
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
                    Ver todos <ArrowRight size={14} />
                  </button>
                </div>
                <div style={moduleStyles.docList}>
                  {!loading &&
                    documents.map((doc) => (
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
                        color: '#94a3b8',
                        padding: '2rem 0',
                        fontSize: '0.875rem',
                      }}
                    >
                      Nenhum documento enviado ainda.
                    </p>
                  )}
                </div>
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
              O que faremos hoje?{userName ? ` ${userName}` : ''}! 
            </h1>
            <p style={pageStyles.headerSubtitle}>
              SGI.Docs
            </p>
          </div>
          <div style={pageStyles.headerActions}>
            <Link href="/upload" style={pageStyles.uploadButton}>
              <Upload size={16} />
            
            </Link>
          </div>
        </header>

        <main style={pageStyles.main}>{renderModule()}</main>
      </div>
    </div>
  );
}
