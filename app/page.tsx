// app/page.tsx
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import type { LucideIcon } from 'lucide-react';
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

// ============================================================
// Constantes
// ============================================================

const LAST_SEEN_NOTIFICATIONS_KEY = 'sgi:lastSeenNotificationsAt';
const RECENT_DOCS_IN_DROPDOWN = 8;
const RECENT_ACTIVITY_LIMIT = 5;
const RECENT_DOCUMENTS_ON_DASHBOARD = 4;

// ============================================================
// Utilidades
// ============================================================

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'Erro desconhecido';
  }
}

/** Formata o nome do usuário a partir do e-mail. */
function formatNameFromEmail(email: string): string {
  if (!email) return '';
  const namePart = email.split('@')[0] || '';
  return namePart
    .replace(/\+.*$/, '')
    .replace(/[._-]+/g, ' ')
    .replace(/\d+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Converte string em bytes reais (UTF-8). */
function utf8ByteLength(text: string): number {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(text).length;
  }
  // Fallback
  return unescape(encodeURIComponent(text)).length;
}

/** Formata bytes em unidade legível. */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Ordena por uploaded_at DESC, sem mutar o array original. */
function sortByUploadedAtDesc(docs: DocumentData[]): DocumentData[] {
  return [...docs].sort((a, b) => {
    const ta = new Date(a.uploaded_at).getTime();
    const tb = new Date(b.uploaded_at).getTime();
    return tb - ta;
  });
}

function getLastSeenNotificationsAt(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(LAST_SEEN_NOTIFICATIONS_KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function setLastSeenNotificationsAt(ts: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAST_SEEN_NOTIFICATIONS_KEY, String(ts));
  } catch {
    /* ignora */
  }
}

// ============================================================
// MetricCard
// ============================================================

interface MetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string;
  subtitle: string;
  iconBg: string;
  trend?: string;
  loading?: boolean;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  iconBg,
  trend,
  loading,
}: MetricCardProps) {
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
        <p style={metricCardStyles.value}>{loading ? '—' : value}</p>
        <p style={metricCardStyles.subtitle}>{subtitle}</p>
      </div>
      {trend && !loading && (
        <div style={metricCardStyles.trend}>
          <TrendingUp size={12} />
          {trend}
        </div>
      )}
    </div>
  );
}

// ============================================================
// DocumentCard
// ============================================================

interface DocumentCardProps {
  doc: DocumentData;
  onDelete: (id: string) => void;
  deleting?: boolean;
}

function DocumentCard({ doc, onDelete, deleting }: DocumentCardProps) {
  const [hovered, setHovered] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const label = doc.code || doc.title || 'este documento';
    const ok =
      typeof window !== 'undefined'
        ? window.confirm(`Excluir "${label}"? Essa ação não pode ser desfeita.`)
        : true;
    if (!ok) return;
    onDelete(String(doc.id));
  };

  return (
    <div
      style={{
        ...moduleStyles.docItem,
        background: hovered ? 'var(--bg-card-hover)' : 'var(--bg-card)',
        borderColor: hovered ? 'var(--border-hover)' : 'var(--border-primary)',
        opacity: deleting ? 0.5 : 1,
        pointerEvents: deleting ? 'none' : 'auto',
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
        {doc.category || 'Sem categoria'}
      </span>
      <button
        type="button"
        aria-label={`Excluir ${doc.code || doc.title || 'documento'}`}
        title="Excluir"
        disabled={deleting}
        onClick={handleDeleteClick}
        style={{
          ...moduleStyles.docMenu,
          color: hovered ? '#ef4444' : 'var(--text-dim)',
          cursor: deleting ? 'wait' : 'pointer',
        }}
      >
        {deleting ? <Loader2 size={14} className="spin" /> : <MoreVertical size={14} />}
      </button>
    </div>
  );
}

// ============================================================
// CategoryDonut
// ============================================================

interface CategoryDatum {
  label: string;
  value: number;
  color: string;
}

function CategoryDonut({
  data,
  total,
}: {
  data: CategoryDatum[];
  total: number;
}) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let currentOffset = 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
      <div style={{ position: 'relative', width: '160px', height: '160px' }}>
        <svg width="160" height="160" viewBox="0 0 160 160" role="img" aria-label="Distribuição por categoria">
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="rgba(59, 130, 246, 0.1)"
            strokeWidth="20"
          />
          {data.map((item) => {
            if (item.value <= 0 || total <= 0) return null;
            const percentage = Math.min(1, item.value / total);
            const dashLength = percentage * circumference;
            const remaining = Math.max(0, circumference - dashLength);
            const dashOffset = -currentOffset;
            currentOffset += dashLength;

            return (
              <circle
                key={item.label}
                cx="80"
                cy="80"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth="20"
                strokeDasharray={`${dashLength} ${remaining}`}
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
        {data.length === 0 && (
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-dim)',
              margin: 0,
            }}
          >
            Nenhuma categoria cadastrada.
          </p>
        )}
        {data.map((item) => (
          <div
            key={item.label}
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

// ============================================================
// NotificationsDropdown
// ============================================================

interface NotificationsDropdownProps {
  documents: DocumentData[];
  onClose: () => void;
  onViewAll: () => void;
  onOpenDocument: (doc: DocumentData) => void;
}

function NotificationsDropdown({
  documents,
  onClose,
  onViewAll,
  onOpenDocument,
}: NotificationsDropdownProps) {
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

  // Fecha com Esc
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const recentDocs = documents.slice(0, RECENT_DOCS_IN_DROPDOWN);

  return (
    <div
      ref={dropdownRef}
      role="dialog"
      aria-label="Notificações"
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
          type="button"
          aria-label="Fechar notificações"
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
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
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
            <button
              key={doc.id}
              type="button"
              onClick={() => {
                onOpenDocument(doc);
                onClose();
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.875rem 1.25rem',
                borderBottom: '1px solid var(--border-primary)',
                background: 'transparent',
                border: 'none',
                borderBottomStyle: 'solid',
                cursor: 'pointer',
                textAlign: 'left',
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
            </button>
          ))
        )}
      </div>

      {/* Rodapé */}
      {recentDocs.length > 0 && (
        <button
          type="button"
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

// ============================================================
// Home
// ============================================================

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
  const [showNotifications, setShowNotifications] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // ----------------------------------------------------------
  // Autenticação + listener de mudança de estado
  // ----------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const applyUser = (email: string) => {
      const formatted = formatNameFromEmail(email) || 'Usuário';
      setUserName(formatted);
      setUserEmail(email);
      setUserInitial(formatted.charAt(0).toUpperCase() || 'U');
    };

    const checkAuth = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (error) {
          // Erro de rede ou sessão inválida.
          // Se for 401 (sem sessão), vai pro login.
          // Caso contrário, mantém o usuário na página (pode ser erro transitório).
          const status =
            (error as { status?: number }).status ?? undefined;
          if (status === 401 || status === 403) {
            router.replace('/login');
            return;
          }
          console.error('Erro ao verificar autenticação:', getErrorMessage(error));
          // Em erro transitório, libera a UI sem redirecionar.
          setAuthChecking(false);
          return;
        }

        if (!user) {
          router.replace('/login');
          return;
        }

        applyUser(user.email || '');
      } catch (err) {
        if (cancelled) return;
        console.error('Erro inesperado na autenticação:', getErrorMessage(err));
        router.replace('/login');
      } finally {
        if (!cancelled) setAuthChecking(false);
      }
    };

    checkAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'SIGNED_OUT' || !session?.user) {
        router.replace('/login');
        return;
      }
      if (session.user.email) {
        applyUser(session.user.email);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  // ----------------------------------------------------------
  // Configurações
  // ----------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    loadSettings()
      .then((s) => {
        if (!cancelled) setDarkMode(Boolean(s?.darkMode));
      })
      .catch((err) => {
        console.error('Erro ao carregar configurações:', getErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ----------------------------------------------------------
  // Buscar documentos
  // ----------------------------------------------------------
  useEffect(() => {
    if (authChecking) return;

    const controller = new AbortController();
    let cancelled = false;

    setLoading(true);

    getAllDocuments({ signal: controller.signal })
      .then((docs) => {
        if (cancelled) return;
        setDocuments(sortByUploadedAtDesc(docs));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.error('Erro ao buscar documentos:', getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [authChecking]);

  // ----------------------------------------------------------
  // Notificações não lidas
  // ----------------------------------------------------------
  useEffect(() => {
    const lastSeen = getLastSeenNotificationsAt();
    const count = documents.filter(
      (d) => new Date(d.uploaded_at).getTime() > lastSeen
    ).length;
    setUnreadCount(count);
  }, [documents]);

  const handleOpenNotifications = useCallback(() => {
    setShowNotifications((prev) => {
      const next = !prev;
      if (next) {
        // Marca como lido ao abrir
        setLastSeenNotificationsAt(Date.now());
        setUnreadCount(0);
      }
      return next;
    });
  }, []);

  // ----------------------------------------------------------
  // Excluir documento
  // ----------------------------------------------------------
  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => String(d.id) !== id));
    } catch (err) {
      console.error('Erro ao excluir:', getErrorMessage(err));
      if (typeof window !== 'undefined') {
        window.alert(
          `Não foi possível excluir o documento: ${getErrorMessage(err)}`
        );
      }
    } finally {
      setDeletingId(null);
    }
  }, []);

  // ----------------------------------------------------------
  // Métricas derivadas (memoizadas)
  // ----------------------------------------------------------
  const totalDocuments = documents.length;

  const totalCategories = useMemo(
    () => new Set(documents.map((d) => d.category || 'Sem categoria')).size,
    [documents]
  );

  const todayDocs = useMemo(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const d = today.getDate();
    return documents.filter((doc) => {
      const dt = new Date(doc.uploaded_at);
      return (
        dt.getFullYear() === y && dt.getMonth() === m && dt.getDate() === d
      );
    }).length;
  }, [documents]);

  const totalBytes = useMemo(() => {
    let acc = 0;
    for (const doc of documents) {
      const text = doc.content || '';
      acc += utf8ByteLength(text);
    }
    return acc;
  }, [documents]);

  const categoryData = useMemo<CategoryDatum[]>(() => {
    const palette = ['#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#64748b'];
    const map = new Map<string, number>();
    for (const d of documents) {
      const key = d.category || 'Sem categoria';
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, value], i) => ({
        label,
        value,
        color: palette[i % palette.length],
      }));
  }, [documents]);

  const recentActivity = useMemo(
    () => documents.slice(0, RECENT_ACTIVITY_LIMIT),
    [documents]
  );

  const recentDocuments = useMemo(
    () => documents.slice(0, RECENT_DOCUMENTS_ON_DASHBOARD),
    [documents]
  );

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

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
              loading={loading}
            />
            <MetricCard
              icon={FolderOpen}
              label="Categorias"
              value={String(totalCategories)}
              subtitle="Categorias cadastradas"
              iconBg="linear-gradient(135deg, #10b981 0%, #059669 100%)"
              loading={loading}
            />
            <MetricCard
              icon={Clock3}
              label="Documentos Hoje"
              value={String(todayDocs)}
              subtitle="Novos documentos enviados"
              iconBg="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
              loading={loading}
            />
            <MetricCard
              icon={HardDrive}
              label="Texto Indexado"
              value={formatBytes(totalBytes)}
              subtitle="Volume de conteúdo textual"
              iconBg="linear-gradient(135deg, #a855f7 0%, #9333ea 100%)"
              loading={loading}
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
                    type="button"
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
                    recentDocuments.map((doc) => (
                      <DocumentCard
                        key={String(doc.id)}
                        doc={doc}
                        onDelete={handleDelete}
                        deleting={deletingId === String(doc.id)}
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
                    type="button"
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
                      key={String(doc.id)}
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
                            { hour: '2-digit', minute: '2-digit' }
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
                    type="button"
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
                ].map((item) => (
                  <div
                    key={item.label}
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
    }

    if (activeModule === 'documentos') {
      return <DocumentosModule />;
    }

    if (activeModule === 'configuracoes') {
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
            {/* Sino com dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                aria-label={
                  unreadCount > 0
                    ? `Notificações (${unreadCount} não lidas)`
                    : 'Notificações'
                }
                aria-expanded={showNotifications}
                aria-haspopup="dialog"
                style={pageStyles.headerIconButton}
                onClick={handleOpenNotifications}
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      background: '#ef4444',
                      color: 'white',
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      minWidth: '1rem',
                      height: '1rem',
                      padding: '0 0.25rem',
                      borderRadius: '9999px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 0 0 2px var(--bg-primary)',
                    }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <NotificationsDropdown
                  documents={documents}
                  onClose={() => setShowNotifications(false)}
                  onViewAll={() => setActiveModule('documentos')}
                  onOpenDocument={() => setActiveModule('documentos')}
                />
              )}
            </div>

            {/* Engrenagem → Configurações */}
            <button
              type="button"
              aria-label="Abrir configurações"
              style={pageStyles.headerIconButton}
              onClick={() => setActiveModule('configuracoes')}
            >
              <SettingsIcon size={16} />
            </button>

            <div style={pageStyles.headerAvatar} aria-hidden="true">
              {userInitial}
            </div>
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
