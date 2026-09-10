// BuscarDocumentosModule.tsx
'use client';

import { useState } from 'react';
import {
  Search,
  FileText,
  X,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { searchDocuments } from './lib/documents';
import type { DocumentData } from './lib/supabase';
import { buscarModuleStyles } from './styles';

interface SearchResult {
  document: DocumentData;
  snippet: string;
}

interface GroupedResult {
  document: DocumentData;
  results: SearchResult[];
}

// ✅ Normaliza para busca (remove acentos)
function normalizeForSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// ✅ Destaca palavras
function highlightText(text: string, searchTerm: string) {
  if (!searchTerm) return text;

  const parts: React.ReactNode[] = [];
  const lowerText = text.toLowerCase();
  const lowerSearch = searchTerm.toLowerCase();

  let lastIndex = 0;
  let index = lowerText.indexOf(lowerSearch);

  while (index !== -1) {
    parts.push(text.substring(lastIndex, index));
    parts.push(
      <mark
        key={index}
        style={{
          backgroundColor: '#fef08a',
          padding: '0',
          borderRadius: '2px',
          color: 'inherit',
        }}
      >
        {text.substring(index, index + searchTerm.length)}
      </mark>
    );
    lastIndex = index + searchTerm.length;
    index = lowerText.indexOf(lowerSearch, lastIndex);
  }

  parts.push(text.substring(lastIndex));
  return parts;
}

// ✅ Gera snippet com contexto
function generateSnippet(content: string, searchTerm: string): string {
  if (!content) return '';

  const lowerContent = content.toLowerCase();
  const lowerTerm = searchTerm.toLowerCase();
  const index = lowerContent.indexOf(lowerTerm);

  if (index === -1) return content.substring(0, 300);

  const start = Math.max(0, index - 150);
  const end = Math.min(content.length, index + searchTerm.length + 150);
  return content.substring(start, end);
}

export default function BuscarDocumentosModule() {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('Todas');
  const [dateFilter, setDateFilter] = useState('');
  const [groupedResults, setGroupedResults] = useState<GroupedResult[]>([]);
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setError('Digite uma palavra ou código para buscar');
      setGroupedResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      // ✅ Busca no Supabase
      const docs = await searchDocuments({
        searchTerm: searchTerm.trim(),
        category,
        date: dateFilter || undefined,
      });

      if (docs.length === 0) {
        setGroupedResults([]);
        setError('Nenhum documento contém esse termo.');
        return;
      }

      // ✅ Gera os resultados (snippet + destaque)
      const allResults: SearchResult[] = docs.map((doc) => ({
        document: doc,
        snippet: generateSnippet(doc.content || '', searchTerm.trim()),
      }));

      // ✅ Agrupa por documento
      const grouped: GroupedResult[] = allResults.map((result) => ({
        document: result.document,
        results: [result],
      }));

      setGroupedResults(grouped);
      setExpandedDocs(new Set()); // Fecha tudo por padrão
    } catch (err: any) {
      console.error('Erro na busca:', err);
      setError(`Erro na busca: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleExpand = (docId: string) => {
    const newExpanded = new Set(expandedDocs);
    if (newExpanded.has(docId)) {
      newExpanded.delete(docId);
    } else {
      newExpanded.add(docId);
    }
    setExpandedDocs(newExpanded);
  };

  return (
    <div style={buscarModuleStyles.container}>
      {/* Cabeçalho */}
      <div style={buscarModuleStyles.header}>
        <Filter size={20} style={{ color: '#2563eb' }} />
        <h2 style={buscarModuleStyles.title}>Busca Inteligente</h2>
      </div>

      {/* Formulário */}
      <div style={buscarModuleStyles.formContainer}>
        <div style={buscarModuleStyles.searchInputContainer}>
          <Search
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af',
            }}
            size={16}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite qualquer palavra, código ou título..."
            style={buscarModuleStyles.searchInput}
          />
        </div>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={buscarModuleStyles.select}
        >
          <option value="Todas">Todas as categorias</option>
          <option value="Segurança da Informação">
            Segurança da Informação
          </option>
          <option value="Procedimentos">Procedimentos</option>
          <option value="Manuais">Manuais</option>
          <option value="Políticas">Políticas</option>
          <option value="Formulários">Formulários</option>
          <option value="Geral">Geral</option>
        </select>

        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          style={buscarModuleStyles.dateInput}
        />

        <button
          onClick={handleSearch}
          disabled={loading}
          style={buscarModuleStyles.searchButton}
        >
          {loading ? '...' : 'Buscar'}
        </button>
      </div>

      {/* Erro */}
      {error && <div style={buscarModuleStyles.errorContainer}>{error}</div>}

      {/* Resultados agrupados (sanfona) */}
      {groupedResults.length > 0 && (
        <div style={buscarModuleStyles.resultsContainer}>
          <h3 style={buscarModuleStyles.resultsTitle}>
            Resultados ({groupedResults.length} documentos)
          </h3>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {groupedResults.map((group) => {
              const isExpanded = expandedDocs.has(group.document.id);
              const totalResults = group.results.length;

              return (
                <div
                  key={group.document.id}
                  style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  {/* Cabeçalho clicável */}
                  <button
                    onClick={() => toggleExpand(group.document.id)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      backgroundColor: isExpanded ? '#f8fafc' : 'white',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        flex: 1,
                      }}
                    >
                      <FileText style={{ color: '#3b82f6' }} size={20} />
                      <div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 'bold',
                              fontSize: '14px',
                              color: '#111827',
                            }}
                          >
                            {group.document.code}
                          </span>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            - {group.document.title}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#6b7280',
                            marginTop: '4px',
                          }}
                        >
                          Enviado em:{' '}
                          {new Date(
                            group.document.uploaded_at
                          ).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                      }}
                    >
                      <span style={{ fontSize: '12px', color: '#6b7280' }}>
                        <strong>{totalResults}</strong>{' '}
                        {totalResults === 1 ? 'resultado' : 'resultados'}
                      </span>
                      {isExpanded ? (
                        <ChevronUp size={16} />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                    </div>
                  </button>

                  {/* Conteúdo expandido */}
                  {isExpanded && (
                    <div
                      style={{
                        borderTop: '1px solid #e5e7eb',
                        padding: '16px',
                        backgroundColor: '#f8fafc',
                      }}
                    >
                      {group.results.map((result, idx) => (
                        <div
                          key={idx}
                          style={{
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            padding: '12px',
                            marginBottom: '8px',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '14px',
                              color: '#374151',
                              lineHeight: '1.8',
                              whiteSpace: 'pre-wrap',
                            }}
                          >
                            {highlightText(result.snippet, searchTerm)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mensagem inicial */}
      {!hasSearched && groupedResults.length === 0 && (
        <div
          style={{
            marginTop: '24px',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '0.875rem',
          }}
        >
          Digite um termo e clique em Buscar para pesquisar nos documentos.
        </div>
      )}
    </div>
  );
}
