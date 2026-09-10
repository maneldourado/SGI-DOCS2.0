// app/BuscarDocumentosModule.tsx
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
  page: number;
  matchIndex: number;
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
          color: '#0f172a',
          fontWeight: 600,
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

// ✅ Calcula página aproximada pelo índice do caractere
function estimatePage(content: string, charIndex: number): number {
  const charsPerPage = 3000;
  return Math.floor(charIndex / charsPerPage) + 1;
}

// ✅ Encontra TODAS as ocorrências de um termo no conteúdo
function findAllOccurrences(
  content: string,
  searchTerm: string
): { index: number; snippet: string; page: number }[] {
  const occurrences: { index: number; snippet: string; page: number }[] = [];
  const lowerContent = content.toLowerCase();
  const lowerSearch = searchTerm.toLowerCase();

  let searchIndex = 0;
  let matchIndex = 0;

  while (searchIndex !== -1) {
    const index = lowerContent.indexOf(lowerSearch, searchIndex);
    if (index === -1) break;

    // Pega o trecho com contexto (150 antes e 150 depois)
    const start = Math.max(0, index - 150);
    const end = Math.min(content.length, index + searchTerm.length + 150);
    const snippet = content.substring(start, end);

    occurrences.push({
      index,
      snippet,
      page: estimatePage(content, index),
    });

    matchIndex++;
    searchIndex = index + searchTerm.length;
  }

  return occurrences;
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
  const [totalMatches, setTotalMatches] = useState(0);

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
      // ✅ Busca no Supabase (retorna documentos que contêm o termo)
      const docs = await searchDocuments({
        searchTerm: searchTerm.trim(),
        category,
        date: dateFilter || undefined,
      });

      if (docs.length === 0) {
        setGroupedResults([]);
        setTotalMatches(0);
        setError('Nenhum documento contém esse termo.');
        return;
      }

      // ✅ Para cada documento, encontra TODAS as ocorrências
      const grouped: GroupedResult[] = [];
      let total = 0;

      for (const doc of docs) {
        const content = doc.content || '';
        const occurrences = findAllOccurrences(content, searchTerm.trim());

        if (occurrences.length > 0) {
          const results: SearchResult[] = occurrences.map((occ, idx) => ({
            document: doc,
            snippet: occ.snippet,
            page: occ.page,
            matchIndex: idx + 1,
          }));

          grouped.push({
            document: doc,
            results,
          });

          total += results.length;
        }
      }

      setGroupedResults(grouped);
      setTotalMatches(total);
      setExpandedDocs(new Set()); // Fecha tudo por padrão

      if (grouped.length === 0) {
        setError('Nenhum documento contém esse termo.');
      }
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

  const expandAll = () => {
    setExpandedDocs(new Set(groupedResults.map((g) => g.document.id)));
  };

  const collapseAll = () => {
    setExpandedDocs(new Set());
  };

  return (
    <div style={buscarModuleStyles.container}>
      {/* Cabeçalho */}
      <div style={buscarModuleStyles.header}>
        <Filter size={18} style={{ color: '#3b82f6' }} />
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
              color: '#64748b',
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
          data-theme="dark"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={buscarModuleStyles.select}
        >
          <option value="Todas">Todas as categorias</option>
          <option value="Segurança da Informação">Segurança da Informação</option>
          <option value="Procedimentos">Procedimentos</option>
          <option value="Manuais">Manuais</option>
          <option value="Políticas">Políticas</option>
          <option value="Formulários">Formulários</option>
          <option value="Geral">Geral</option>
        </select>

        <input
          data-theme="dark"
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
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {/* Erro */}
      {error && <div style={buscarModuleStyles.errorContainer}>{error}</div>}

      {/* Resultados agrupados (sanfona) */}
      {groupedResults.length > 0 && (
        <div style={buscarModuleStyles.resultsContainer}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}
          >
            <h3 style={{ ...buscarModuleStyles.resultsTitle, margin: 0 }}>
              Resultados ({groupedResults.length} documentos • {totalMatches}{' '}
              ocorrências)
            </h3>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={expandAll}
                style={{
                  fontSize: '0.7rem',
                  color: '#60a5fa',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Expandir tudo
              </button>
              <button
                onClick={collapseAll}
                style={{
                  fontSize: '0.7rem',
                  color: '#94a3b8',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Recolher tudo
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {groupedResults.map((group) => {
              const isExpanded = expandedDocs.has(group.document.id);
              const totalResults = group.results.length;
              const pages = Array.from(
                new Set(group.results.map((r) => r.page))
              ).sort((a, b) => a - b);

              return (
                <div
                  key={group.document.id}
                  style={{
                    border: '1px solid rgba(59, 130, 246, 0.15)',
                    borderRadius: '0.75rem',
                    overflow: 'hidden',
                    background: 'rgba(30, 58, 95, 0.2)',
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
                      padding: '1rem',
                      backgroundColor: isExpanded
                        ? 'rgba(30, 58, 95, 0.4)'
                        : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        flex: 1,
                      }}
                    >
                      <div
                        style={{
                          width: '2.25rem',
                          height: '2.25rem',
                          background:
                            'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          borderRadius: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <FileText size={16} color="white" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              color: 'white',
                            }}
                          >
                            {group.document.code}
                          </span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              color: '#94a3b8',
                            }}
                          >
                            {group.document.title}
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: '0.65rem',
                            color: '#64748b',
                            margin: '0.25rem 0 0',
                          }}
                        >
                          Enviado em{' '}
                          {new Date(
                            group.document.uploaded_at
                          ).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.65rem',
                          color: '#94a3b8',
                          textAlign: 'right',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            color: '#60a5fa',
                            fontSize: '0.8rem',
                          }}
                        >
                          {totalResults}
                        </span>{' '}
                        {totalResults === 1 ? 'ocorrência' : 'ocorrências'}
                        <div
                          style={{
                            fontSize: '0.6rem',
                            marginTop: '0.125rem',
                            color: '#64748b',
                          }}
                        >
                          Páginas: {pages.join(', ')}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={16} color="#94a3b8" />
                      ) : (
                        <ChevronDown size={16} color="#94a3b8" />
                      )}
                    </div>
                  </button>

                  {/* Conteúdo expandido */}
                  {isExpanded && (
                    <div
                      style={{
                        borderTop: '1px solid rgba(59, 130, 246, 0.15)',
                        padding: '0.75rem',
                        maxHeight: '500px',
                        overflowY: 'auto',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                        }}
                      >
                        {group.results.map((result, idx) => (
                          <div
                            key={idx}
                            style={{
                              background: 'rgba(15, 30, 58, 0.6)',
                              borderRadius: '0.5rem',
                              padding: '0.75rem',
                              border: '1px solid rgba(59, 130, 246, 0.1)',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '0.5rem',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  color: '#60a5fa',
                                  fontWeight: 600,
                                }}
                              >
                                📄 Ocorrência #{result.matchIndex} • Página ~
                                {result.page}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: '#cbd5e1',
                                lineHeight: 1.7,
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              {highlightText(result.snippet, searchTerm)}
                            </div>
                          </div>
                        ))}
                      </div>
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
            marginTop: '1.5rem',
            textAlign: 'center',
            color: '#64748b',
            fontSize: '0.8rem',
          }}
        >
          Digite um termo e clique em Buscar para pesquisar nos documentos.
        </div>
      )}
    </div>
  );
}
