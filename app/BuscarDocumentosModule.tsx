// app/BuscarDocumentosModule.tsx
'use client';

import { useState, useRef, useMemo } from 'react';
import {
  Search,
  FileText,
  Filter,
  ChevronDown,
  ChevronUp,
  Ban,
  Minus,
  Plus,
} from 'lucide-react';
import { searchDocuments } from './lib/documents';
import type { DocumentData } from './lib/supabase';
import { buscarModuleStyles } from './styles';

// ============================================================
// Constantes
// ============================================================
const CHARS_PER_PAGE_ESTIMATE = 3000;
const SNIPPET_CONTEXT_CHARS = 150;

/** ✅ Range padrão (caracteres antes/depois do termo excluído) */
const DEFAULT_EXCLUDE_RANGE = 200;

const SEARCHABLE_FIELDS = [
  'title',
  'code',
  'content',
  'description',
  'category',
] as const;

type SearchableField = (typeof SEARCHABLE_FIELDS)[number];

// ============================================================
// Normalização
// ============================================================

function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[\s\-_.:;,()\[\]{}!?@#$%^&*+=~`<>|\\/\"']/g, '');
}

function normalizeWithMap(text: string): {
  normalized: string;
  starts: number[];
  ends: number[];
} {
  let normalized = '';
  const starts: number[] = [];
  const ends: number[] = [];

  let codeUnitIndex = 0;
  for (const ch of text) {
    const norm = normalizeForSearch(ch);
    for (let j = 0; j < norm.length; j++) {
      normalized += norm[j];
      starts.push(codeUnitIndex);
      ends.push(codeUnitIndex + ch.length);
    }
    codeUnitIndex += ch.length;
  }

  return { normalized, starts, ends };
}

// ============================================================
// ✅ Exclusão com RANGE de caracteres
// ============================================================

/**
 * Remove trechos que contêm um termo, incluindo N caracteres ao redor dele.
 * Exemplo: se excluir "ELABORAÇÃO" com range=200, remove
 * 200 caracteres ANTES + "ELABORAÇÃO" + 200 caracteres DEPOIS.
 */
function removeExcludedTermsWithRange(
  text: string,
  excludeTerms: string[],
  range: number
): string {
  if (excludeTerms.length === 0) return text;

  const lowerText = text.toLowerCase();
  // Marca quais índices devem ser removidos
  const toRemove = new Array(text.length).fill(false);

  for (const term of excludeTerms) {
    if (!term) continue;

    const lowerTerm = term.toLowerCase();
    let searchFrom = 0;

    while (true) {
      const index = lowerText.indexOf(lowerTerm, searchFrom);
      if (index === -1) break;

      // Calcula o range a remover
      const start = Math.max(0, index - range);
      const end = Math.min(text.length, index + term.length + range);

      // Marca o range para remoção
      for (let i = start; i < end; i++) {
        toRemove[i] = true;
      }

      searchFrom = index + term.length;
    }
  }

  // Constrói o texto final removendo os índices marcados
  let result = '';
  let i = 0;
  while (i < text.length) {
    if (toRemove[i]) {
      // Substitui por um espaço (preserva quebras de linha)
      if (text[i] === '\n') {
        result += '\n';
      } else {
        result += ' ';
      }
      i++;
    } else {
      result += text[i];
      i++;
    }
  }

  // Limpa espaços múltiplos
  return result.replace(/[ \t]{2,}/g, ' ');
}

// ============================================================
// Utilidades de posição
// ============================================================

function getLineAndColumn(
  text: string,
  index: number
): { line: number; column: number } {
  let line = 1;
  let lastNewlineIndex = -1;
  const limit = Math.min(index, text.length);
  for (let i = 0; i < limit; i++) {
    if (text[i] === '\n') {
      line++;
      lastNewlineIndex = i;
    }
  }
  return { line, column: index - lastNewlineIndex };
}

function estimatePage(_content: string, charIndex: number): number {
  if (charIndex <= 0) return 1;
  return Math.floor(charIndex / CHARS_PER_PAGE_ESTIMATE) + 1;
}

// ============================================================
// Tipos
// ============================================================

interface Occurrence {
  field: SearchableField;
  start: number;
  end: number;
  line: number;
  column: number;
  page: number;
  snippet: string;
  snippetStart: number;
  matchStartInSnippet: number;
  matchLengthInSnippet: number;
}

interface GroupedResult {
  document: DocumentData;
  occurrences: Occurrence[];
}

// ============================================================
// Busca de ocorrências
// ============================================================

function findAllOccurrencePositions(
  haystack: string,
  needleNormalized: string
): { start: number; end: number }[] {
  if (!needleNormalized) return [];

  const { normalized, starts, ends } = normalizeWithMap(haystack);

  const results: { start: number; end: number }[] = [];
  let searchFrom = 0;

  while (searchFrom <= normalized.length - needleNormalized.length) {
    const found = normalized.indexOf(needleNormalized, searchFrom);
    if (found === -1) break;

    const lastNormIndex = found + needleNormalized.length - 1;
    results.push({
      start: starts[found],
      end: ends[lastNormIndex],
    });

    searchFrom = found + 1;
  }

  return results;
}

function buildOccurrences(
  field: SearchableField,
  text: string,
  needleNormalized: string
): Occurrence[] {
  const positions = findAllOccurrencePositions(text, needleNormalized);

  return positions.map(({ start, end }) => {
    const snippetStart = Math.max(0, start - SNIPPET_CONTEXT_CHARS);
    const snippetEnd = Math.min(text.length, end + SNIPPET_CONTEXT_CHARS);
    const snippet = text.substring(snippetStart, snippetEnd);
    const { line, column } = getLineAndColumn(text, start);

    return {
      field,
      start,
      end,
      line,
      column,
      page: estimatePage(text, start),
      snippet,
      snippetStart,
      matchStartInSnippet: start - snippetStart,
      matchLengthInSnippet: end - start,
    };
  });
}

function getSearchableFields(
  doc: DocumentData
): { field: SearchableField; value: string }[] {
  const result: { field: SearchableField; value: string }[] = [];
  const docAny = doc as unknown as Record<string, unknown>;

  for (const field of SEARCHABLE_FIELDS) {
    const value = docAny[field];
    if (typeof value === 'string' && value.length > 0) {
      result.push({ field, value });
    }
  }

  return result;
}

// ============================================================
// Componente
// ============================================================

export default function BuscarDocumentosModule() {
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('Todas');
  const [dateFilter, setDateFilter] = useState('');
  const [excludeTerms, setExcludeTerms] = useState('');
  const [excludeRange, setExcludeRange] = useState(DEFAULT_EXCLUDE_RANGE); // ✅ NOVO
  const [groupedResults, setGroupedResults] = useState<GroupedResult[]>([]);
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showExclude, setShowExclude] = useState(false);

  const requestIdRef = useRef(0);

  const totalMatches = useMemo(
    () => groupedResults.reduce((acc, g) => acc + g.occurrences.length, 0),
    [groupedResults]
  );

  const parsedExcludeTerms = useMemo(() => {
    return excludeTerms
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }, [excludeTerms]);

  const handleSearch = async () => {
    const trimmed = searchTerm.trim();

    if (!trimmed) {
      setError('Digite uma palavra ou código para buscar');
      setGroupedResults([]);
      setHasSearched(false);
      return;
    }

    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const docs = await searchDocuments({
        searchTerm: trimmed,
        category,
        date: dateFilter || undefined,
      });

      if (requestId !== requestIdRef.current) return;

      const needleNormalized = normalizeForSearch(trimmed);
      if (!needleNormalized) {
        setGroupedResults([]);
        setError('Termo de busca inválido.');
        return;
      }

      const grouped: GroupedResult[] = [];

      for (const doc of docs) {
        const fields = getSearchableFields(doc);
        const occurrences: Occurrence[] = [];

        for (const { field, value } of fields) {
          // ✅ Remove trechos com range ao redor do termo excluído
          const cleanedValue = removeExcludedTermsWithRange(
            value,
            parsedExcludeTerms,
            excludeRange
          );

          occurrences.push(
            ...buildOccurrences(field, cleanedValue, needleNormalized)
          );
        }

        if (occurrences.length > 0) {
          grouped.push({ document: doc, occurrences });
        }
      }

      setGroupedResults(grouped);
      setExpandedDocs(new Set());

      if (grouped.length === 0) {
        if (docs.length === 0) {
          setError('Nenhum documento corresponde aos filtros selecionados.');
        } else {
          setError(
            'Documentos foram encontrados, mas o termo exato não pôde ser localizado após a exclusão dos termos.'
          );
        }
      }
    } catch (err: unknown) {
      if (requestId !== requestIdRef.current) return;
      console.error('Erro na busca:', err);
      const message = err instanceof Error ? err.message : String(err);
      setError(`Erro na busca: ${message}`);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleTermChange = (value: string) => {
    setSearchTerm(value);
    if (error) setError(null);
  };

  const toggleExpand = (docId: string) => {
    setExpandedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedDocs(new Set(groupedResults.map((g) => String(g.document.id))));
  };

  const collapseAll = () => {
    setExpandedDocs(new Set());
  };

  return (
    <div style={buscarModuleStyles.container}>
      {/* Cabeçalho */}
      <div style={buscarModuleStyles.header}>
        <Filter size={18} style={{ color: 'var(--accent)' }} />
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
              color: 'var(--text-dim)',
            }}
            size={16}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleTermChange(e.target.value)}
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
          type="button"
          onClick={() => setShowExclude(!showExclude)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            background: showExclude
              ? 'rgba(239, 68, 68, 0.15)'
              : 'var(--bg-input)',
            border: `1px solid ${
              showExclude ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-input)'
            }`,
            borderRadius: '0.75rem',
            color: showExclude ? '#fca5a5' : 'var(--text-muted)',
            fontSize: '0.8rem',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
        >
          <Ban size={14} />
          Excluir termos
          {parsedExcludeTerms.length > 0 && (
            <span
              style={{
                background: '#ef4444',
                color: 'white',
                fontSize: '0.6rem',
                padding: '0.125rem 0.375rem',
                borderRadius: '9999px',
                fontWeight: 700,
              }}
            >
              {parsedExcludeTerms.length}
            </span>
          )}
        </button>

        <button
          onClick={handleSearch}
          disabled={loading}
          style={buscarModuleStyles.searchButton}
        >
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {/* ✅ Painel de exclusão */}
      {showExclude && (
        <div
          style={{
            marginTop: '0.75rem',
            padding: '1rem',
            background: 'rgba(239, 68, 68, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '0.75rem',
          }}
        >
          <label
            style={{
              display: 'block',
              fontSize: '0.7rem',
              fontWeight: 600,
              color: '#fca5a5',
              marginBottom: '0.5rem',
            }}
          >
            🚫 Termos a serem excluídos (separados por vírgula)
          </label>
          <input
            type="text"
            value={excludeTerms}
            onChange={(e) => setExcludeTerms(e.target.value)}
            placeholder="Ex: ELABORAÇÃO, TÍTULO, APROVAÇÃO"
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              fontSize: '0.8rem',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '0.75rem',
              background: 'var(--bg-input)',
              color: 'var(--text-primary)',
              outline: 'none',
            }}
          />

          {/* ✅ Range de exclusão */}
          <div style={{ marginTop: '0.75rem' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#fca5a5',
                marginBottom: '0.5rem',
              }}
            >
              📏 Range de exclusão (caracteres ao redor do termo)
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setExcludeRange(Math.max(0, excludeRange - 50))
                }
                style={{
                  width: '2.25rem',
                  height: '2.25rem',
                  borderRadius: '0.5rem',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-input)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Minus size={14} />
              </button>

              <input
                type="range"
                min="0"
                max="1000"
                step="50"
                value={excludeRange}
                onChange={(e) =>
                  setExcludeRange(parseInt(e.target.value))
                }
                style={{
                  flex: 1,
                  accentColor: '#ef4444',
                  cursor: 'pointer',
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setExcludeRange(Math.min(1000, excludeRange + 50))
                }
                style={{
                  width: '2.25rem',
                  height: '2.25rem',
                  borderRadius: '0.5rem',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-input)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Plus size={14} />
              </button>

              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#fca5a5',
                  minWidth: '70px',
                  textAlign: 'right',
                }}
              >
                {excludeRange} chars
              </span>
            </div>
            <p
              style={{
                fontSize: '0.65rem',
                color: 'var(--text-dim)',
                margin: '0.5rem 0 0',
                lineHeight: 1.5,
              }}
            >
              💡 Remove <strong>{excludeRange} caracteres ANTES</strong> e{' '}
              <strong>{excludeRange} caracteres DEPOIS</strong> de cada termo
              excluído. Aumente o range para remover blocos maiores (como
              rodapés inteiros).
            </p>
          </div>

          {parsedExcludeTerms.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.375rem',
                marginTop: '0.75rem',
              }}
            >
              {parsedExcludeTerms.map((term, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: '0.65rem',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#fca5a5',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '9999px',
                    fontWeight: 600,
                  }}
                >
                  {term}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Erro */}
      {error && <div style={buscarModuleStyles.errorContainer}>{error}</div>}

      {/* Resultados */}
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
              Resultados ({groupedResults.length}{' '}
              {groupedResults.length === 1 ? 'documento' : 'documentos'} •{' '}
              {totalMatches}{' '}
              {totalMatches === 1 ? 'ocorrência' : 'ocorrências'})
            </h3>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={expandAll}
                style={{
                  fontSize: '0.7rem',
                  color: 'var(--accent-light)',
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
                  color: 'var(--text-muted)',
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

          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {groupedResults.map((group) => {
              const docId = String(group.document.id);
              const isExpanded = expandedDocs.has(docId);
              const totalResults = group.occurrences.length;
              const pages = Array.from(
                new Set(group.occurrences.map((o) => o.page))
              ).sort((a, b) => a - b);
              const fields = Array.from(
                new Set(group.occurrences.map((o) => o.field))
              );

              return (
                <div
                  key={docId}
                  style={{
                    border: '1px solid var(--border-primary)',
                    borderRadius: '0.75rem',
                    overflow: 'hidden',
                    background: 'var(--bg-card)',
                  }}
                >
                  <button
                    onClick={() => toggleExpand(docId)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem',
                      backgroundColor: isExpanded
                        ? 'var(--bg-card-hover)'
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
                            flexWrap: 'wrap',
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              color: 'var(--text-primary)',
                            }}
                          >
                            {group.document.code}
                          </span>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {group.document.title}
                          </span>
                        </div>
                        <p
                          style={{
                            fontSize: '0.65rem',
                            color: 'var(--text-dim)',
                            margin: '0.25rem 0 0',
                          }}
                        >
                          Enviado em{' '}
                          {new Date(
                            group.document.uploaded_at
                          ).toLocaleDateString('pt-BR')}{' '}
                          • Campos: {fields.join(', ')}
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
                          color: 'var(--text-muted)',
                          textAlign: 'right',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            color: 'var(--accent-light)',
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
                            color: 'var(--text-dim)',
                          }}
                        >
                          Páginas: {pages.join(', ')}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={16} color="var(--text-muted)" />
                      ) : (
                        <ChevronDown size={16} color="var(--text-muted)" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div
                      style={{
                        borderTop: '1px solid var(--border-primary)',
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
                        {group.occurrences.map((occ, idx) => (
                          <div
                            key={`${occ.field}-${occ.start}-${idx}`}
                            style={{
                              background: 'var(--bg-input)',
                              borderRadius: '0.5rem',
                              padding: '0.75rem',
                              border: '1px solid var(--border-primary)',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '0.5rem',
                                flexWrap: 'wrap',
                                gap: '0.25rem',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  color: 'var(--accent-light)',
                                  fontWeight: 600,
                                }}
                              >
                                📄 Ocorrência #{idx + 1}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.6rem',
                                  color: 'var(--text-muted)',
                                }}
                              >
                                campo:{' '}
                                <strong
                                  style={{ color: 'var(--text-secondary)' }}
                                >
                                  {occ.field}
                                </strong>{' '}
                                • Página ~{occ.page} • Linha {occ.line}, Coluna{' '}
                                {occ.column}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: 'var(--text-secondary)',
                                lineHeight: 1.7,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                              }}
                            >
                              {renderSnippet(
                                occ.snippet,
                                occ.matchStartInSnippet,
                                occ.matchLengthInSnippet
                              )}
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

      {!hasSearched && groupedResults.length === 0 && (
        <div
          style={{
            marginTop: '1.5rem',
            textAlign: 'center',
            color: 'var(--text-dim)',
            fontSize: '0.8rem',
          }}
        >
          Digite um termo e clique em Buscar para pesquisar nos documentos.
        </div>
      )}
    </div>
  );
}

// ============================================================
// Renderização de snippet com highlight
// ============================================================
function renderSnippet(
  snippet: string,
  matchStart: number,
  matchLength: number
) {
  const safeStart = Math.max(0, Math.min(matchStart, snippet.length));
  const safeEnd = Math.max(
    safeStart,
    Math.min(safeStart + matchLength, snippet.length)
  );

  const before = snippet.substring(0, safeStart);
  const match = snippet.substring(safeStart, safeEnd);
  const after = snippet.substring(safeEnd);

  return (
    <>
      {before}
      <mark
        style={{
          backgroundColor: '#fef08a',
          padding: '0',
          borderRadius: '2px',
          color: '#0f172a',
          fontWeight: 600,
        }}
      >
        {match}
      </mark>
      {after}
    </>
  );
}
