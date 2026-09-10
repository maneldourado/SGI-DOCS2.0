// DocumentosModule.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Clock,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getAllDocuments, deleteDocument } from './lib/documents';
import type { DocumentData } from './lib/supabase';

export default function DocumentosModule() {
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('Todas');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ Buscar documentos do Supabase
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const docs = await getAllDocuments();
        setDocuments(docs);
      } catch (err: any) {
        console.error('Erro ao buscar documentos:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  // ✅ Excluir documento do Supabase
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

  // ✅ Filtros locais (busca, categoria, data)
  const filteredDocuments = documents.filter((doc) => {
    // Filtro de categoria
    if (category !== 'Todas' && doc.category !== category) return false;

    // Filtro de data
    if (dateFilter) {
      const docDate = new Date(doc.uploaded_at).toLocaleDateString('pt-BR');
      if (docDate !== dateFilter) return false;
    }

    // Filtro de busca (case-insensitive)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const matchesCode = doc.code.toLowerCase().includes(term);
      const matchesTitle = doc.title.toLowerCase().includes(term);
      const matchesContent = (doc.content || '').toLowerCase().includes(term);

      if (!matchesCode && !matchesTitle && !matchesContent) return false;
    }

    return true;
  });

  // ✅ Categorias únicas (para o filtro)
  const categories = Array.from(new Set(documents.map((d) => d.category)));

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1
        style={{
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: '#0f172a',
          marginBottom: '0.5rem',
        }}
      >
        Meus Documentos
      </h1>
      <p
        style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '2rem' }}
      >
        Gerencie todos os seus documentos
      </p>

      {/* Filtros */}
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '1rem',
          border: '1px solid #e2e8f0',
          padding: '1.5rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
              size={16}
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por código, título ou conteúdo..."
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem 0.625rem 2.25rem',
                fontSize: '0.875rem',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
                outline: 'none',
                color: '#0f172a',
              }}
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              padding: '0.625rem 0.75rem',
              fontSize: '0.875rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.5rem',
              outline: 'none',
              color: '#0f172a',
            }}
          >
            <option value="Todas">Todas as categorias</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            style={{
              padding: '0.625rem 0.75rem',
              fontSize: '0.875rem',
              border: '1px solid #e2e8f0',
              borderRadius: '0.5rem',
              outline: 'none',
              color: '#0f172a',
            }}
          />
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div
          style={{
            padding: '0.75rem',
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            marginBottom: '1rem',
          }}
        >
          {error}
        </div>
      )}

      {/* Lista de documentos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Loading */}
        {loading && (
          <div
            style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}
          >
            <p style={{ fontSize: '0.875rem' }}>Carregando documentos...</p>
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
                  backgroundColor: 'white',
                  borderRadius: '0.75rem',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                }}
              >
                {/* Cabeçalho do documento */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '1rem',
                    cursor: 'pointer',
                    backgroundColor: isExpanded ? '#f8fafc' : 'white',
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : doc.id)}
                >
                  <div
                    style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      backgroundColor: '#fee2e2',
                      borderRadius: '0.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '0.75rem',
                    }}
                  >
                    <FileText style={{ color: '#ef4444' }} size={20} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 'bold',
                        color: '#0f172a',
                        margin: 0,
                      }}
                    >
                      {doc.code}
                    </p>
                    <p
                      style={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        margin: '0.25rem 0 0',
                      }}
                    >
                      {doc.title}
                    </p>
                    <p
                      style={{
                        fontSize: '0.75rem',
                        color: '#94a3b8',
                        margin: '0.25rem 0 0',
                      }}
                    >
                      <Clock
                        size={12}
                        style={{ display: 'inline', marginRight: '4px' }}
                      />
                      {new Date(doc.uploaded_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        backgroundColor: '#f1f5f9',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '9999px',
                      }}
                    >
                      {doc.category}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(doc.id);
                      }}
                      style={{
                        color: '#94a3b8',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.25rem',
                      }}
                    >
                      <X size={16} />
                    </button>
                    {isExpanded ? (
                      <ChevronUp size={16} color="#94a3b8" />
                    ) : (
                      <ChevronDown size={16} color="#94a3b8" />
                    )}
                  </div>
                </div>

                {/* Conteúdo expandido */}
                {isExpanded && (
                  <div
                    style={{
                      padding: '1rem',
                      borderTop: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    <p
                      style={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <strong>Arquivo:</strong> {doc.file_name}
                    </p>
                    {doc.file_url && (
                      <p
                        style={{
                          fontSize: '0.75rem',
                          color: '#64748b',
                          marginBottom: '0.5rem',
                        }}
                      >
                        <strong>Download:</strong>{' '}
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: '#3b82f6',
                            textDecoration: 'underline',
                          }}
                        >
                          Abrir PDF
                        </a>
                      </p>
                    )}
                    <div
                      style={{
                        backgroundColor: 'white',
                        borderRadius: '0.5rem',
                        padding: '1rem',
                        fontSize: '0.875rem',
                        color: '#334155',
                        lineHeight: '1.6',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {doc.content || 'Nenhum conteúdo extraído.'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

        {/* Nenhum documento */}
        {!loading && filteredDocuments.length === 0 && (
          <div
            style={{ textAlign: 'center', padding: '3rem 0', color: '#94a3b8' }}
          >
            <FileText size={48} style={{ marginBottom: '1rem' }} />
            <p style={{ fontSize: '0.875rem' }}>
              {documents.length === 0
                ? 'Nenhum documento enviado ainda.'
                : 'Nenhum documento encontrado com esses filtros.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
