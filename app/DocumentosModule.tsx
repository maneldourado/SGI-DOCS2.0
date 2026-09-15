// app/DocumentosModule.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
  Filter,
  Loader2,
  FolderOpen,
  Download,
  ExternalLink,
} from 'lucide-react';
import { getAllDocuments, deleteDocument } from './lib/documents';
import type { DocumentData } from './lib/supabase';
import { pageStyles, moduleStyles } from './styles';

export default function DocumentosModule() {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('Todas');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAllDocuments()
      .then((docs) => setDocuments(docs))
      .catch((err) => {
        console.error('Erro ao buscar documentos:', err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return;

    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      console.error('Erro ao excluir:', err);
      setError(err.message);
    }
  };

  // ✅ Filtros
  const filteredDocuments = documents.filter((doc) => {
    if (category !== 'Todas' && doc.category !== category) return false;

    if (dateFilter) {
      const docDate = new Date(doc.uploaded_at).toLocaleDateString('pt-BR');
      if (docDate !== dateFilter) return false;
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const matchesCode = doc.code.toLowerCase().includes(term);
      const matchesTitle = doc.title.toLowerCase().includes(term);
      const matchesContent = (doc.content || '').toLowerCase().includes(term);

      if (!matchesCode && !matchesTitle && !matchesContent) return false;
    }

    return true;
  });

  const categories = Array.from(new Set(documents.map((d) => d.category)));

  return (
    <>
      {/* ✅ Header */}
      <header style={pageStyles.header}>
        <div>
          <h1 style={pageStyles.headerTitle}>Meus Documentos</h1>
          <p style={pageStyles.headerSubtitle}>
            Gerencie todos os seus documentos ({documents.length} no total)
          </p>
        </div>
      </header>

      <main style={pageStyles.main}>
        {/* ✅ Filtros */}
        <div style={moduleStyles.card}>
          <div style={moduleStyles.cardHeader}>
            <h2 style={moduleStyles.cardTitle}>
              <Filter size={18} color="var(--accent)" />
              Filtros
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto',
              gap: '0.75rem',
              alignItems: 'center',
            }}
          >
            {/* Busca */}
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-dim)',
                }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por código, título ou conteúdo..."
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.25rem',
                  fontSize: '0.8rem',
                  border: '1px solid var(--border-input)',
                  borderRadius: '0.75rem',
                  outline: 'none',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {/* Categoria */}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                fontSize: '0.8rem',
                border: '1px solid var(--border-input)',
                borderRadius: '0.75rem',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                outline: 'none',
                cursor: 'pointer',
                minWidth: '180px',
              }}
            >
              <option value="Todas">Todas as categorias</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {/* Data */}
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                padding: '0.75rem 1rem',
                fontSize: '0.8rem',
                border: '1px solid var(--border-input)',
                borderRadius: '0.75rem',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>
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
            }}
          >
            {error}
          </div>
        )}

        {/* ✅ Lista de documentos */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          {/* Loading */}
          {loading && (
            <div
              style={{
                textAlign: 'center',
                padding: '4rem 0',
                color: 'var(--text-muted)',
              }}
            >
              <Loader2
                size={32}
                style={{
                  color: 'var(--accent)',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1rem',
                }}
              />
              <p style={{ fontSize: '0.8rem' }}>Carregando documentos...</p>
            </div>
          )}

          {/* Documentos */}
          {!loading &&
            filteredDocuments.map((doc) => {
              const isExpanded = expandedId === doc.id;
              return (
                <div
                  key={doc.id}
                  style={{
                    ...moduleStyles.card,
                    padding: 0,
                    overflow: 'hidden',
                  }}
                >
                  {/* Cabeçalho do documento */}
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : doc.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '1rem 1.25rem',
                      cursor: 'pointer',
                      background: isExpanded
                        ? 'var(--bg-card-hover)'
                        : 'transparent',
                      transition: 'background 0.2s',
                    }}
                  >
                    {/* Ícone */}
                    <div
                      style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        background:
                          'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        borderRadius: '0.625rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: '0.875rem',
                        flexShrink: 0,
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                      }}
                    >
                      <FileText size={18} color="white" />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: '0.85rem',
                          fontWeight: 700,
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
                          fontSize: '0.75rem',
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
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}
                      >
                        <Clock size={10} />
                        {new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}{' '}
                        às{' '}
                        {new Date(doc.uploaded_at).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {/* Ações */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginLeft: '0.75rem',
                      }}
                    >
                      {/* Categoria */}
                      <span
                        style={{
                          fontSize: '0.65rem',
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: 'var(--accent-light)',
                          padding: '0.25rem 0.625rem',
                          borderRadius: '9999px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {doc.category}
                      </span>

                      {/* Excluir */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(doc.id);
                        }}
                        style={{
                          color: 'var(--text-dim)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '0.375rem',
                          borderRadius: '0.5rem',
                          display: 'flex',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#ef4444';
                          e.currentTarget.style.background =
                            'rgba(239, 68, 68, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-dim)';
                          e.currentTarget.style.background = 'none';
                        }}
                      >
                        <X size={16} />
                      </button>

                      {/* Chevron */}
                      <div
                        style={{
                          color: 'var(--text-muted)',
                          padding: '0.375rem',
                          display: 'flex',
                        }}
                      >
                        {isExpanded ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ✅ Conteúdo expandido */}
                  {isExpanded && (
                    <div
                      style={{
                        padding: '1.25rem',
                        borderTop: '1px solid var(--border-primary)',
                        background: 'var(--bg-input)',
                      }}
                    >
                      {/* Metadados */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 1fr)',
                          gap: '0.75rem',
                          marginBottom: '1rem',
                        }}
                      >
                        <div>
                          <p
                            style={{
                              fontSize: '0.65rem',
                              color: 'var(--text-dim)',
                              margin: 0,
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
                            Arquivo
                          </p>
                          <p
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-primary)',
                              margin: '0.25rem 0 0',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {doc.file_name}
                          </p>
                        </div>
                        <div>
                          <p
                            style={{
                              fontSize: '0.65rem',
                              color: 'var(--text-dim)',
                              margin: 0,
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                            }}
                          >
                            Orientação
                          </p>
                          <p
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--text-primary)',
                              margin: '0.25rem 0 0',
                            }}
                          >
                            {doc.orientation === 'landscape'
                              ? '📐 Paisagem'
                              : '📄 Retrato'}
                          </p>
                        </div>
                      </div>

                      {/* Link para PDF */}
                      {doc.file_url && (
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.5rem 1rem',
                            background:
                              'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            color: 'white',
                            borderRadius: '0.5rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            textDecoration: 'none',
                            marginBottom: '1rem',
                            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                          }}
                        >
                          <ExternalLink size={12} />
                          Abrir PDF
                        </a>
                      )}

                      {/* Conteúdo */}
                      <div>
                        <p
                          style={{
                            fontSize: '0.65rem',
                            color: 'var(--text-dim)',
                            margin: '0 0 0.5rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}
                        >
                          Conteúdo extraído ({doc.content?.length || 0}{' '}
                          caracteres)
                        </p>
                        <div
                          style={{
                            background: 'var(--bg-card)',
                            borderRadius: '0.75rem',
                            padding: '1rem',
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.7,
                            maxHeight: '300px',
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap',
                            border: '1px solid var(--border-primary)',
                          }}
                        >
                          {doc.content || 'Nenhum conteúdo extraído.'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

          {/* Nenhum documento */}
          {!loading && filteredDocuments.length === 0 && (
            <div
              style={{
                ...moduleStyles.card,
                textAlign: 'center',
                padding: '4rem 1.5rem',
              }}
            >
              <FolderOpen
                size={48}
                style={{
                  color: 'var(--text-dim)',
                  marginBottom: '1rem',
                  opacity: 0.5,
                }}
              />
              <p
                style={{
                  fontSize: '0.9rem',
                  color: 'var(--text-muted)',
                  margin: 0,
                  fontWeight: 500,
                }}
              >
                {documents.length === 0
                  ? 'Nenhum documento enviado ainda.'
                  : 'Nenhum documento encontrado com esses filtros.'}
              </p>
              {documents.length === 0 && (
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-dim)',
                    marginTop: '0.5rem',
                  }}
                >
                  Envie seu primeiro PDF para começar.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
