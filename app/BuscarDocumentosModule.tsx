// app/BuscarDocumentosModule.tsx
'use client';

import { useState, useRef, useMemo } from 'react';
import {
  Search,
  FileText,
  Filter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { searchDocuments } from './lib/documents';
import type { DocumentData } from './lib/supabase';
import { buscarModuleStyles } from './styles';

// ============================================================
// Constantes
// ============================================================

/** Estimativa de caracteres por página (fallback quando não temos páginas reais). */
const CHARS_PER_PAGE_ESTIMATE = 3000;

/** Quantidade de caracteres de contexto antes/depois de cada match. */
const SNIPPET_CONTEXT_CHARS = 150;

/** Campos string que serão varridos em cada documento. */
const SEARCHABLE_FIELDS = [
  'title',
  'code',
  'content',
  'description',
  'category',
] as const;

type SearchableField = (typeof SEARCHABLE_FIELDS)[number];

// ============================================================
// Normalização (remove acentos + minúsculas)
// ============================================================

/**
 * Normaliza um texto para comparação:
 *  - NFD: decompõe caracteres acentuados
 *  - remove marcas combinantes (\u0300–\u036f)
 *  - toLowerCase
 */
function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Constrói a versão normalizada do texto + mapas de início/fim (em code units)
 * para cada caractere normalizado. Isso permite recuperar a posição EXATA
 * no texto original, mesmo com acentos/cedilha etc.
 *
 * Usamos iteração por code point (`for...of`) para não quebrar surrogates.
 */
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
  /** Índice inicial do match no texto original (code units) */
  start: number;
  /** Índice final EXCLUSIVO no texto original */
  end: number;
  /** Linha (1-based) */
  line: number;
  /** Coluna (1-based) */
  column: number;
  /** Página estimada */
  page: number;
  /** Trecho de contexto extraído do texto original */
  snippet: string;
  /** Offset de início do snippet no texto original */
  snippetStart: number;
  /** Offset do match DENTRO do snippet */
  matchStartInSnippet: number;
  /** Comprimento do match dentro do snippet */
  matchLengthInSnippet: number;
}

interface GroupedResult {
  document: DocumentData;
  occurrences: Occurrence[];
}

// ============================================================
// Busca de ocorrências
// ============================================================

/**
 * Encontra TODAS as ocorrências (inclusive sobrepostas) de `needleNormalized`
 * em `haystack`, retornando posições no texto ORIGINAL.
 *
 * Importante: avança de 1 em 1 no índice normalizado para capturar
 * ocorrências sobrepostas (ex.: "aa" em "aaa" → 2 ocorrências).
 */
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

    // +1 para permitir matches sobrepostos
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

/** Recupera todos os campos string pesquisáveis do documento. */
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
  const [groupedResults, setGroupedResults] = useState<GroupedResult[]>([]);
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Guarda o ID da requisição atual para evitar race conditions
  const requestIdRef = useRef(0);

  const totalMatches = useMemo(
    () => groupedResults.reduce((acc, g) => acc + g.occurrences.length, 0),
    [groupedResults]
  );

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

      // Descarta resposta obsoleta
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
          occurrences.push(...buildOccurrences(field, value, needleNormalized));
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
            'Documentos foram encontrados, mas o termo exato não pôde ser localizado nos campos pesquisáveis (título, código, conteúdo, descrição, categoria).'
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

  // Limpa erro assim que o usuário altera qualquer filtro
  const handleTermChange = (value: string) => {
    setSearchTerm(value);
    if (error) setError(null);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    if (error) setError(null);
  };

  const handleDateChange = (value: string) => {
    setDateFilter(value);
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
            onChange={(e) => handleTermChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite qualquer palavra, código ou título..."
            style={buscarModuleStyles.searchInput}
          />
        </div>

        <select
          data-theme="dark"
          value={category}
          onChange={(e) => handleCategoryChange(e.target.value)}
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
          data-theme="dark"
          type="date"
          value={dateFilter}
          onChange={(e) => handleDateChange(e.target.value)}
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
                    border: '1px solid rgba(59, 130, 246, 0.15)',
                    borderRadius: '0.75rem',
                    overflow: 'hidden',
                    background: 'rgba(30, 58, 95, 0.2)',
                  }}
                >
                  {/* Cabeçalho clicável */}
                  <button
                    onClick={() => toggleExpand(docId)}
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
                            flexWrap: 'wrap',
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
                            style={{ fontSize: '0.7rem', color: '#94a3b8' }}
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
                        {group.occurrences.map((occ, idx) => (
                          <div
                            key={`${occ.field}-${occ.start}-${idx}`}
                            style={{
                              background: 'rgba(15, 30, 58, 0.6)',
                              borderRadius: '0.5rem',
                              padding: '0.75rem',
                              border:
                                '1px solid rgba(59, 130, 246, 0.1)',
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
                                  color: '#60a5fa',
                                  fontWeight: 600,
                                }}
                              >
                                📄 Ocorrência #{idx + 1}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.6rem',
                                  color: '#94a3b8',
                                }}
                              >
                                campo:{' '}
                                <strong style={{ color: '#cbd5e1' }}>
                                  {occ.field}
                                </strong>{' '}
                                • Página ~{occ.page} • Linha {occ.line}, Coluna{' '}
                                {occ.column} • offset {occ.start}–{occ.end}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: '0.75rem',
                                color: '#cbd5e1',
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

// ============================================================
// Renderização de snippet com highlight POSICIONAL
// (não depende de nova busca textual — usa os offsets já calculados)
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
