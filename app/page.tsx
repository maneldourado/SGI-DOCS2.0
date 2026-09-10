// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import Link from 'next/link';
import Sidebar from './Sidebar';
import BuscarDocumentosModule from './BuscarDocumentosModule';
import ConfiguracoesModule from './ConfiguracoesModule';
import DocumentosModule from './DocumentosModule';
import { pageStyles, metricCardStyles, moduleStyles } from './styles';
import { getAllDocuments, deleteDocument } from './lib/documents';
import type { DocumentData } from './lib/supabase';

// ✅ MetricCard
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
  return (
    <div style={metricCardStyles.card}>
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

// ✅ DocumentCard
function DocumentCard({
  doc,
  onDelete,
}: {
  doc: DocumentData;
  onDelete: (id: string) => void;
}) {
  return (
    <div style={moduleStyles.docItem}>
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
      <button onClick={() => onDelete(doc.id)} style={moduleStyles.docMenu}>
        <MoreVertical size={16} />
      </button>
    </div>
  );
}

export default function Home() {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModule, setActiveModule] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);

  // ✅ Buscar documentos do Supabase
  useEffect(() => {
    getAllDocuments()
      .then((docs) => setDocuments(docs))
      .catch((err) => console.error('Erro ao buscar documentos:', err))
      .finally(() => setLoading(false));
  }, []);

  // ✅ Excluir documento (Supabase)
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
                      color: '#94a3b8',
                      backgroundColor: '#f1f5f9',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                    }}
                  >
                    PDF, máximo 50MB
                  </span>
                </div>
                <div style={moduleStyles.uploadContainer}>
                  <div style={moduleStyles.uploadIcon}>
                    <Upload size={32} color="#3b82f6" />
                  </div>
                  <p style={moduleStyles.uploadText}>Arraste seu PDF aqui</p>
                  <p style={moduleStyles.uploadSubtext}>
                    Apenas arquivos PDF são aceitos
                  </p>
                  <Link href="/upload" style={moduleStyles.uploadButton}>
                    <Upload size={16} />
                    Selecionar PDF
                  </Link>
                </div>
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
                  <Link
                    href="/documentos"
                    style={{
                      fontSize: '0.875rem',
                      color: '#3b82f6',
                      textDecoration: 'none',
                      fontWeight: 500,
                    }}
                  >
                    Ver todos →
                  </Link>
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
              {/* Busca Inteligente */}
              <BuscarDocumentosModule />

              {/* Todos os documentos */}
              <div style={moduleStyles.card}>
                <div style={moduleStyles.cardHeader}>
                  <h2 style={moduleStyles.cardTitle}>
                    <Database size={20} color="#3b82f6" />
                    Todos os documentos ({totalDocuments})
                  </h2>
                  <Link
                    href="/documentos"
                    style={{
                      fontSize: '0.875rem',
                      color: '#3b82f6',
                      textDecoration: 'none',
                      fontWeight: 500,
                    }}
                  >
                    Ver todos →
                  </Link>
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
    } else if (activeModule === 'upload') {
      return (
        <div style={{ textAlign: 'center', padding: '4rem 0' }}>
          <Link href="/upload" style={moduleStyles.uploadButton}>
            <Upload size={16} />
            Ir para página de upload
          </Link>
        </div>
      );
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
            <h1 style={pageStyles.headerTitle}>Bem-vindo ao SGI Docs! 👋</h1>
            <p style={pageStyles.headerSubtitle}>
              Sua central inteligente de documentos
            </p>
          </div>
          <div style={pageStyles.headerActions}>
            <Link href="/upload" style={pageStyles.uploadButton}>
              <Upload size={16} />
              Enviar Documentos
            </Link>
          </div>
        </header>

        <main style={pageStyles.main}>{renderModule()}</main>
      </div>
    </div>
  );
}
