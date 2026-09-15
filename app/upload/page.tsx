// app/upload/page.tsx
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  FileText,
  Loader2,
  Save,
  X,
  CheckCircle2,
  Zap,
  Shield,
  ArrowLeft,
  AlertTriangle,
} from 'lucide-react';
import Sidebar from '../Sidebar';
import { uploadDocument } from '../lib/documents';
import { loadSettings } from '../lib/settings';
import { pageStyles, moduleStyles } from '../styles';

// ============================================================
// Constantes
// ============================================================

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB
const CDN_LOAD_TIMEOUT_MS = 20000;
const OCR_TIMEOUT_MS = 90000;
const PDFJS_CDN =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_CDN =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const TESSERACT_CDN =
  'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/tesseract.min.js';
const DARK_MODE_EVENT = 'sgi:darkModeChanged';

type MessageType = 'info' | 'success' | 'error' | 'warning';

const MESSAGE_STYLES: Record<
  MessageType,
  { bg: string; border: string; color: string }
> = {
  info: {
    bg: 'rgba(59, 130, 246, 0.1)',
    border: 'rgba(59, 130, 246, 0.3)',
    color: '#93c5fd',
  },
  success: {
    bg: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.3)',
    color: '#6ee7b7',
  },
  warning: {
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.3)',
    color: '#fcd34d',
  },
  error: {
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.3)',
    color: '#fca5a5',
  },
};

// ============================================================
// Utilidades de texto
// ============================================================

function normalizeSpaces(text: string): string {
  // Preserva quebras de linha: colapsa espaços/tabs, mas mantém \n
  return text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function removeFooterKeywords(text: string): string {
  let result = text;

  // Bloco 1: cabeçalho/rodapé em linha única (título, data, elaboração, etc.)
  result = result.replace(
    /T[ÍI]TULO:\s*[^\n]*?(?=DATA\s+REVIS[ÃA]O:|ELABORA[ÇC][ÃA]O:|APROVA[ÇC][ÃA]O:|P[ÁA]GINA:|P[ÁA]G\.|$)/gi,
    ''
  );
  result = result.replace(
    /DATA\s+REVIS[ÃA]O:\s*[^\n]*?(?=ELABORA[ÇC][ÃA]O:|APROVA[ÇC][ÃA]O:|P[ÁA]GINA:|P[ÁA]G\.|$)/gi,
    ''
  );
  result = result.replace(
    /ELABORA[ÇC][ÃA]O:\s*[^\n]*?(?=APROVA[ÇC][ÃA]O:|P[ÁA]GINA:|P[ÁA]G\.|$)/gi,
    ''
  );
  result = result.replace(
    /APROVA[ÇC][ÃA]O:\s*[^\n]*?(?=P[ÁA]GINA:|P[ÁA]G\.|$)/gi,
    ''
  );

  // Paginação em variações comuns
  result = result.replace(/P[ÁA]GINA:\s*\d+\s*(?:de|\/)\s*\d+/gi, '');
  result = result.replace(/P[ÁA]G\.?\s*\d+\s*(?:de|\/)\s*\d+/gi, '');
  result = result.replace(/P[ÁA]G\.?\s*\d+/gi, '');
  result = result.replace(/P[ÁA]GINA\s*\d+/gi, '');
  result = result.replace(/\b\d+\s*\/\s*\d+\b/g, ''); // "5 / 20"

  // Revisão / código de documento no rodapé
  result = result.replace(/REVIS[ÃA]O:\s*\d+/gi, '');
  result = result.replace(/REV\.?\s*\d+/gi, '');
  result = result.replace(/C[ÓO]DIGO:\s*[^\s\n]+/gi, '');

  // Marcações de cópia
  result = result.replace(/C[ÓO]PIA\s+ELETR[ÔO]NICA/gi, '');
  result = result.replace(/C[ÓO]PIA\s+N[ÃA]O\s+CONTROLADA/gi, '');

  // Limpa espaços residuais deixados pelas remoções
  result = result.replace(/[ \t]{2,}/g, ' ');
  result = result.replace(/[ \t]+\n/g, '\n');
  result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}

function extractTitleFromFileName(fileName: string): string {
  return fileName
    .replace(/\.pdf$/i, '')
    .replace(/[_-]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function generateCodeFromFileName(fileName: string, seq: number): string {
  const base = fileName
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toUpperCase()
    .substring(0, 20);

  const seqPart = String(seq + 1).padStart(3, '0');
  const randPart = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');

  return `${base || 'DOC'}-${seqPart}${randPart}`;
}

function fileKey(file: File): string {
  return `${file.name}::${file.size}::${file.lastModified}`;
}

// ============================================================
// Utilidades de runtime (CDNs)
// ============================================================

function loadScriptOnce(src: string, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`
    );
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;

    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`Timeout ao carregar: ${src}`));
    }, timeoutMs);

    script.onload = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve();
    };
    script.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      reject(new Error(`Erro ao carregar: ${src}`));
    };

    document.head.appendChild(script);
  });
}

async function ensurePdfJs(): Promise<any> {
  if (!(window as any).pdfjsLib) {
    await loadScriptOnce(PDFJS_CDN, CDN_LOAD_TIMEOUT_MS);
  }
  const lib = (window as any).pdfjsLib;
  if (!lib) throw new Error('PDF.js não disponível');
  if (lib.GlobalWorkerOptions.workerSrc !== PDFJS_WORKER_CDN) {
    lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
  }
  return lib;
}

async function ensureTesseract(): Promise<any> {
  if (!(window as any).Tesseract) {
    await loadScriptOnce(TESSERACT_CDN, CDN_LOAD_TIMEOUT_MS);
  }
  const t = (window as any).Tesseract;
  if (!t) throw new Error('Tesseract.js não disponível');
  return t;
}

// ============================================================
// Processamento de imagem
// ============================================================

function preprocessImage(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    const val = gray < 140 ? 0 : 255;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
  }
  ctx.putImageData(imageData, 0, 0);
}

function shouldUseOcr(pageText: string): boolean {
  const trimmed = pageText.trim();
  if (trimmed.length < 10) return true;
  // Se houver muitos caracteres não-alfanuméricos, provavelmente é lixo
  const alnum = (trimmed.match(/[a-zA-Z0-9À-ÿ]/g) || []).length;
  return alnum / trimmed.length < 0.3;
}

// ============================================================
// Componente
// ============================================================

interface UploadError {
  file: string;
  reason: string;
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState('Geral');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<MessageType>('info');
  const [darkMode, setDarkMode] = useState(true);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [uploadErrors, setUploadErrors] = useState<UploadError[]>([]);

  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    'portrait'
  );
  const [removeExtraSpaces, setRemoveExtraSpaces] = useState(true);

  const [isDragging, setIsDragging] = useState(false);

  // Controle de cancelamento e worker compartilhado do Tesseract
  const cancelRef = useRef(false);
  const tesseractWorkerRef = useRef<any>(null);
  const tesseractLoadingRef = useRef<Promise<any> | null>(null);

  // ----------------------------------------------------------
  // Carrega darkMode e sincroniza com outras telas
  // ----------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    loadSettings()
      .then((s) => {
        if (!cancelled) setDarkMode(Boolean(s?.darkMode));
      })
      .catch(() => {
        /* ignora */
      });

    const handleExternal = (e: Event) => {
      const detail = (e as CustomEvent<{ darkMode?: boolean }>).detail;
      if (typeof detail?.darkMode === 'boolean') {
        setDarkMode(detail.darkMode);
      }
    };
    window.addEventListener(DARK_MODE_EVENT, handleExternal);
    return () => {
      cancelled = true;
      window.removeEventListener(DARK_MODE_EVENT, handleExternal);
    };
  }, []);

  // ----------------------------------------------------------
  // Cleanup do worker Tesseract
  // ----------------------------------------------------------
  useEffect(() => {
    return () => {
      if (tesseractWorkerRef.current) {
        try {
          tesseractWorkerRef.current.terminate();
        } catch {
          /* ignora */
        }
        tesseractWorkerRef.current = null;
      }
    };
  }, []);

  const handleDarkModeChange = useCallback((value: boolean) => {
    setDarkMode(value);
    if (typeof window === 'undefined') return;
    try {
      window.dispatchEvent(
        new CustomEvent(DARK_MODE_EVENT, { detail: { darkMode: value } })
      );
      // Persistência best-effort (não quebra se saveSettings não existir)
      import('../lib/settings')
        .then((mod) => {
          const save = (
            mod as {
              saveSettings?: (s: { darkMode: boolean }) => Promise<void>;
            }
          ).saveSettings;
          if (typeof save === 'function') {
            save({ darkMode: value }).catch(() => {
              /* ignora */
            });
          }
        })
        .catch(() => {
          /* ignora */
        });
    } catch {
      /* ignora */
    }
  }, []);

  // ----------------------------------------------------------
  // Worker Tesseract reutilizável
  // ----------------------------------------------------------
  const getTesseractWorker = useCallback(async (): Promise<any> => {
    if (tesseractWorkerRef.current) return tesseractWorkerRef.current;
    if (tesseractLoadingRef.current) return tesseractLoadingRef.current;

    tesseractLoadingRef.current = (async () => {
      const Tesseract = await ensureTesseract();
      const worker = await Tesseract.createWorker('por+eng');
      try {
        await worker.setParameters({
          tessedit_pageseg_mode: '6',
        });
      } catch {
        /* ignora se o parâmetro não for aceito */
      }
      tesseractWorkerRef.current = worker;
      return worker;
    })();

    try {
      return await tesseractLoadingRef.current;
    } finally {
      tesseractLoadingRef.current = null;
    }
  }, []);

  // ----------------------------------------------------------
  // Seleção de arquivos
  // ----------------------------------------------------------
  const addFiles = useCallback(
    (incoming: File[], showMessage = true) => {
      if (incoming.length === 0) return;

      const tooBig: string[] = [];
      const notPdf: string[] = [];
      const valid: File[] = [];

      for (const f of incoming) {
        if (!f.name.toLowerCase().endsWith('.pdf')) {
          notPdf.push(f.name);
          continue;
        }
        if (f.size > MAX_FILE_SIZE_BYTES) {
          tooBig.push(f.name);
          continue;
        }
        valid.push(f);
      }

      setFiles((prev) => {
        const existing = new Set(prev.map(fileKey));
        const deduped: File[] = [];
        for (const f of valid) {
          const k = fileKey(f);
          if (existing.has(k)) continue;
          existing.add(k);
          deduped.push(f);
        }
        return [...prev, ...deduped];
      });

      if (showMessage) {
        const problems: string[] = [];
        if (notPdf.length)
          problems.push(`${notPdf.length} arquivo(s) não-PDF ignorado(s)`);
        if (tooBig.length)
          problems.push(
            `${tooBig.length} arquivo(s) acima de 50 MB ignorado(s)`
          );
        if (problems.length > 0) {
          setMessage(`⚠️ ${problems.join('. ')}.`);
          setMessageType('warning');
        } else if (valid.length > 0) {
          setMessage(`✅ ${valid.length} arquivo(s) adicionado(s).`);
          setMessageType('success');
        }
      }
    },
    []
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    if (input.files) {
      addFiles(Array.from(input.files));
    }
    // Permite reselecionar o mesmo arquivo
    input.value = '';
  };

  // ----------------------------------------------------------
  // Drag & Drop
  // ----------------------------------------------------------
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    addFiles(dropped);
  };

  const removeFile = (key: string) => {
    setFiles((prev) => prev.filter((f) => fileKey(f) !== key));
    setMessage('');
    setUploadErrors([]);
  };

  const handleDropzoneKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!uploading) fileInputRef.current?.click();
    }
  };

  // ----------------------------------------------------------
  // Extração de texto de um PDF
  // ----------------------------------------------------------
  const extractPDFText = useCallback(
    async (file: File, seq: number): Promise<string> => {
      const pdfjsLib = await ensurePdfJs();

      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      let pdf: any;
      try {
        pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      } catch (err: any) {
        if (err?.name === 'PasswordException') {
          throw new Error('PDF protegido por senha');
        }
        if (err?.name === 'InvalidPDFException') {
          throw new Error('Arquivo PDF inválido ou corrompido');
        }
        throw err;
      }

      const parts: string[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        if (cancelRef.current) break;

        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => (typeof item.str === 'string' ? item.str : ''))
          .join(' ');

        if (!shouldUseOcr(pageText)) {
          parts.push(pageText);
          continue;
        }

        // Renderiza em canvas para OCR
        const scale = 2;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.floor(viewport.width));
        canvas.height = Math.max(1, Math.floor(viewport.height));
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          // Sem contexto 2D: usa o que tiver de texto nativo
          parts.push(pageText);
          continue;
        }

        try {
          await page.render({ canvasContext: ctx, viewport }).promise;
          preprocessImage(canvas);
          const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85);

          // Libera memória do canvas antes do OCR
          canvas.width = 0;
          canvas.height = 0;

          const worker = await getTesseractWorker();

          const ocrPromise = worker.recognize(imageDataUrl);
          const timeoutPromise = new Promise<never>((_, reject) => {
            window.setTimeout(
              () => reject(new Error('Tempo esgotado no OCR')),
              OCR_TIMEOUT_MS
            );
          });

          let ocrText = '';
          try {
            const result: any = await Promise.race([
              ocrPromise,
              timeoutPromise,
            ]);
            ocrText = result?.data?.text ?? '';
          } catch (err: any) {
            // Se o worker travou, descarta para recriar na próxima
            if (String(err?.message || '').includes('Tempo esgotado')) {
              if (tesseractWorkerRef.current) {
                try {
                  tesseractWorkerRef.current.terminate();
                } catch {
                  /* ignora */
                }
                tesseractWorkerRef.current = null;
              }
            }
            parts.push(pageText);
            continue;
          }

          parts.push(ocrText.length > 0 ? ocrText : pageText);
        } catch {
          // Falha no render/OCR: cai para o texto nativo da página
          parts.push(pageText);
        } finally {
          // Garante liberação mesmo em exceção
          if (canvas.width !== 0 || canvas.height !== 0) {
            canvas.width = 0;
            canvas.height = 0;
          }
        }
      }

      try {
        if (typeof pdf.destroy === 'function') await pdf.destroy();
      } catch {
        /* ignora */
      }

      void seq; // reservado para uso futuro (não altera assinatura)
      return parts.join('\n');
    },
    [getTesseractWorker]
  );

  // ----------------------------------------------------------
  // Upload
  // ----------------------------------------------------------
  const handleUpload = async () => {
    if (uploading) return;
    if (files.length === 0) {
      setMessage('Selecione pelo menos um arquivo PDF.');
      setMessageType('warning');
      return;
    }

    cancelRef.current = false;
    setUploading(true);
    setMessage('');
    setUploadErrors([]);
    setProgress({ current: 0, total: files.length });

    const errors: UploadError[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      if (cancelRef.current) break;

      const file = files[i];
      setMessage(
        `Processando ${i + 1} de ${files.length}: ${file.name}`
      );
      setMessageType('info');

      try {
        const content = await extractPDFText(file, i);

        // Ordem correta: removeFooterKeywords ANTES de normalizeSpaces,
        // pois os regex de footer dependem de \n.
        let finalContent = removeFooterKeywords(content);

        if (removeExtraSpaces) {
          finalContent = normalizeSpaces(finalContent);
        }

        // Se o processamento destruiu o texto, volta ao original
        if (finalContent.length < 10 && content.length >= 10) {
          finalContent = removeExtraSpaces ? normalizeSpaces(content) : content;
        }

        if (!finalContent || finalContent.trim().length < 5) {
          errorCount++;
          errors.push({
            file: file.name,
            reason: 'Não foi possível extrair texto legível',
          });
          setProgress({ current: i + 1, total: files.length });
          continue;
        }

        const autoCode = generateCodeFromFileName(file.name, i);
        const autoTitle = extractTitleFromFileName(file.name);

        await uploadDocument(file, {
          code: autoCode,
          title: autoTitle,
          category: category || 'Geral',
          orientation,
          content: finalContent,
        });

        successCount++;
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : String(error);
        console.error(`Erro no arquivo ${file.name}:`, error);
        errors.push({ file: file.name, reason });
        errorCount++;
      } finally {
        setProgress({ current: i + 1, total: files.length });
      }
    }

    setUploading(false);
    setUploadErrors(errors);

    if (cancelRef.current) {
      setMessage(
        `⏹️ Cancelado. ${successCount} enviado(s), ${errorCount} com erro.`
      );
      setMessageType('warning');
      return;
    }

    if (errorCount === 0) {
      setMessage(`✅ Concluído! ${successCount} documento(s) enviado(s).`);
      setMessageType('success');
    } else if (successCount === 0) {
      setMessage(`❌ Falha ao enviar. ${errorCount} arquivo(s) com erro.`);
      setMessageType('error');
    } else {
      setMessage(
        `⚠️ Concluído com avisos: ${successCount} enviado(s), ${errorCount} com erro.`
      );
      setMessageType('warning');
    }

    if (successCount > 0) {
      window.setTimeout(() => {
        if (!cancelRef.current) router.push('/');
      }, 2500);
    }
  };

  const handleCancel = () => {
    cancelRef.current = true;
    setMessage('Cancelando... aguarde o processamento atual terminar.');
    setMessageType('warning');
  };

  // ----------------------------------------------------------
  // Navegação pelo Sidebar
  // ----------------------------------------------------------
  const handleModuleChange = (module: string) => {
    if (module === 'dashboard') router.push('/');
    else if (module === 'documentos') router.push('/');
    else if (module === 'configuracoes') router.push('/');
  };

  const progressPercent =
    progress.total > 0
      ? Math.min(100, (progress.current / progress.total) * 100)
      : 0;

  const messageStyle = MESSAGE_STYLES[messageType];

  return (
    <div style={pageStyles.container}>
      <Sidebar
        activeModule="upload"
        onModuleChange={handleModuleChange}
        darkMode={darkMode}
        setDarkMode={handleDarkModeChange}
      />

      <div style={pageStyles.mainContent}>
        <header style={pageStyles.header}>
          <div>
            <h1 style={pageStyles.headerTitle}>Enviar Documentos</h1>
            <p style={pageStyles.headerSubtitle}>
              Envie vários PDFs de uma vez. O título e o código serão gerados
              automaticamente.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(15, 30, 58, 0.6)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '0.75rem',
              padding: '0.625rem 1rem',
              color: '#94a3b8',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
        </header>

        <main style={pageStyles.main}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr',
              gap: '1.5rem',
            }}
          >
            {/* Coluna Esquerda */}
            <div style={moduleStyles.card}>
              <div style={moduleStyles.cardHeader}>
                <h2 style={moduleStyles.cardTitle}>
                  <Upload size={18} color="#3b82f6" />
                  Configurações de Envio
                </h2>
              </div>

              <div
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
              >
                {/* Categoria */}
                <div>
                  <label
                    htmlFor="upload-category"
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#94a3b8',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Categoria
                  </label>
                  <select
                    id="upload-category"
                    data-theme="dark"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={uploading}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      paddingRight: '2.5rem',
                      fontSize: '0.8rem',
                      border: '1px solid rgba(59, 130, 246, 0.2)',
                      borderRadius: '0.75rem',
                      background: '#0f1e3a',
                      color: 'white',
                      outline: 'none',
                      appearance: 'none',
                      backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 0.75rem center',
                      backgroundSize: '1rem',
                      opacity: uploading ? 0.6 : 1,
                    }}
                  >
                    <option value="Geral">Geral</option>
                    <option value="Segurança da Informação">
                      Segurança da Informação
                    </option>
                    <option value="Procedimentos">Procedimentos</option>
                    <option value="Manuais">Manuais</option>
                    <option value="Políticas">Políticas</option>
                    <option value="Formulários">Formulários</option>
                  </select>
                </div>

                {/* Configurações de Extração */}
                <div
                  style={{
                    background: 'rgba(30, 58, 95, 0.2)',
                    borderRadius: '0.75rem',
                    padding: '1rem',
                    border: '1px solid rgba(59, 130, 246, 0.1)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#cbd5e1',
                      margin: 0,
                    }}
                  >
                    Configurações de Extração
                  </h3>

                  <div>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#94a3b8',
                        marginBottom: '0.5rem',
                      }}
                    >
                      Orientação do documento
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setOrientation('portrait')}
                        disabled={uploading}
                        aria-pressed={orientation === 'portrait'}
                        style={{
                          flex: 1,
                          padding: '0.625rem',
                          borderRadius: '0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          border: `1px solid ${
                            orientation === 'portrait'
                              ? '#3b82f6'
                              : 'rgba(59, 130, 246, 0.2)'
                          }`,
                          background:
                            orientation === 'portrait'
                              ? 'rgba(59, 130, 246, 0.2)'
                              : 'rgba(15, 30, 58, 0.4)',
                          color:
                            orientation === 'portrait' ? '#60a5fa' : '#94a3b8',
                          cursor: uploading ? 'not-allowed' : 'pointer',
                          opacity: uploading ? 0.6 : 1,
                        }}
                      >
                        📄 Retrato
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrientation('landscape')}
                        disabled={uploading}
                        aria-pressed={orientation === 'landscape'}
                        style={{
                          flex: 1,
                          padding: '0.625rem',
                          borderRadius: '0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          border: `1px solid ${
                            orientation === 'landscape'
                              ? '#3b82f6'
                              : 'rgba(59, 130, 246, 0.2)'
                          }`,
                          background:
                            orientation === 'landscape'
                              ? 'rgba(59, 130, 246, 0.2)'
                              : 'rgba(15, 30, 58, 0.4)',
                          color:
                            orientation === 'landscape'
                              ? '#60a5fa'
                              : '#94a3b8',
                          cursor: uploading ? 'not-allowed' : 'pointer',
                          opacity: uploading ? 0.6 : 1,
                        }}
                      >
                        📐 Paisagem
                      </button>
                    </div>
                  </div>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      fontSize: '0.75rem',
                      color: '#cbd5e1',
                      fontWeight: 500,
                    }}
                  >
                    <input
                      data-theme="dark"
                      type="checkbox"
                      checked={removeExtraSpaces}
                      disabled={uploading}
                      onChange={(e) => setRemoveExtraSpaces(e.target.checked)}
                    />
                    Excluir espaços em branco extras
                  </label>
                </div>

                {/* Dropzone */}
                <div>
                  <label
                    htmlFor="pdf-input"
                    style={{
                      display: 'block',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: '#94a3b8',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Arquivos PDF *
                  </label>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label="Selecionar arquivos PDF"
                    aria-disabled={uploading}
                    onKeyDown={handleDropzoneKeyDown}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => {
                      if (!uploading) fileInputRef.current?.click();
                    }}
                    style={{
                      border: `2px dashed ${
                        isDragging
                          ? '#3b82f6'
                          : 'rgba(59, 130, 246, 0.3)'
                      }`,
                      borderRadius: '1rem',
                      padding: '2.5rem',
                      textAlign: 'center',
                      background: isDragging
                        ? 'rgba(59, 130, 246, 0.15)'
                        : 'rgba(30, 58, 95, 0.2)',
                      transition: 'all 0.2s',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      transform: isDragging ? 'scale(1.02)' : 'scale(1)',
                      opacity: uploading ? 0.6 : 1,
                    }}
                  >
                    <input
                      id="pdf-input"
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      multiple
                      onChange={handleFileSelect}
                      disabled={uploading}
                      aria-label="Selecionar arquivos PDF"
                      style={{ display: 'none' }}
                    />
                    <div
                      style={{
                        width: '3.5rem',
                        height: '3.5rem',
                        background:
                          'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1rem',
                        boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
                      }}
                    >
                      <Upload size={24} color="white" />
                    </div>
                    <p
                      style={{
                        fontSize: '0.9rem',
                        color: 'white',
                        margin: '0.5rem 0 0',
                        fontWeight: 600,
                      }}
                    >
                      {isDragging
                        ? 'Solte os arquivos aqui!'
                        : 'Arraste seus PDFs aqui'}
                    </p>
                    <p
                      style={{
                        fontSize: '0.75rem',
                        color: '#94a3b8',
                        margin: '0.25rem 0 1rem',
                      }}
                    >
                      ou clique para selecionar
                    </p>
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!uploading) fileInputRef.current?.click();
                      }}
                      style={{
                        background:
                          'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: 'white',
                        padding: '0.625rem 1.5rem',
                        borderRadius: '0.75rem',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        border: 'none',
                        cursor: uploading ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
                        opacity: uploading ? 0.6 : 1,
                      }}
                    >
                      <Upload size={14} />
                      Selecionar PDFs
                    </button>
                  </div>
                </div>

                {/* Lista de arquivos */}
                {files.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <p
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#cbd5e1',
                        margin: 0,
                      }}
                    >
                      {files.length} arquivo(s) selecionado(s):
                    </p>
                    <div
                      style={{
                        maxHeight: '240px',
                        overflowY: 'auto',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                      }}
                    >
                      {files.map((file) => {
                        const k = fileKey(file);
                        return (
                          <div
                            key={k}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.75rem',
                              background: 'rgba(30, 58, 95, 0.3)',
                              padding: '0.75rem',
                              borderRadius: '0.75rem',
                              border: '1px solid rgba(59, 130, 246, 0.15)',
                              opacity: uploading ? 0.6 : 1,
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
                              <p
                                style={{
                                  fontSize: '0.75rem',
                                  color: 'white',
                                  margin: 0,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {file.name}
                              </p>
                              <p
                                style={{
                                  fontSize: '0.65rem',
                                  color: '#94a3b8',
                                  margin: '0.125rem 0 0',
                                }}
                              >
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(k)}
                              disabled={uploading}
                              aria-label={`Remover ${file.name}`}
                              title="Remover"
                              style={{
                                color: '#64748b',
                                background: 'none',
                                border: 'none',
                                cursor: uploading ? 'not-allowed' : 'pointer',
                                padding: '0.25rem',
                                opacity: uploading ? 0.5 : 1,
                              }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Barra de progresso */}
                {uploading && progress.total > 0 && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.7rem',
                        color: '#94a3b8',
                        marginBottom: '0.5rem',
                      }}
                    >
                      <span>
                        Processando {progress.current} de {progress.total}
                      </span>
                      <span>{Math.round(progressPercent)}%</span>
                    </div>
                    <div
                      style={{
                        height: '6px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: '9999px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${progressPercent}%`,
                          background:
                            'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          transition: 'width 0.3s',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Botão de enviar / cancelar */}
                {!uploading ? (
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={files.length === 0}
                    title={
                      files.length === 0
                        ? 'Selecione pelo menos um arquivo PDF'
                        : 'Enviar documentos'
                    }
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      background:
                        files.length === 0
                          ? 'rgba(37, 99, 235, 0.4)'
                          : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white',
                      padding: '0.875rem',
                      borderRadius: '0.75rem',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      border: 'none',
                      cursor:
                        files.length === 0 ? 'not-allowed' : 'pointer',
                      boxShadow:
                        files.length === 0
                          ? 'none'
                          : '0 4px 16px rgba(37, 99, 235, 0.4)',
                    }}
                  >
                    <Save size={16} />
                    Enviar {files.length > 0 ? `(${files.length})` : ''}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCancel}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      color: '#fca5a5',
                      padding: '0.875rem',
                      borderRadius: '0.75rem',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                    }}
                  >
                    <Loader2
                      size={16}
                      style={{ animation: 'spin 1s linear infinite' }}
                    />
                    Cancelar processamento
                  </button>
                )}

                {/* Mensagem */}
                {message && (
                  <div
                    role="status"
                    aria-live="polite"
                    style={{
                      padding: '0.75rem 1rem',
                      background: messageStyle.bg,
                      border: `1px solid ${messageStyle.border}`,
                      color: messageStyle.color,
                      borderRadius: '0.5rem',
                      fontSize: '0.8rem',
                    }}
                  >
                    {message}
                  </div>
                )}

                {/* Erros detalhados */}
                {uploadErrors.length > 0 && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      background: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      borderRadius: '0.5rem',
                    }}
                  >
                    <p
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        margin: 0,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: '#fca5a5',
                      }}
                    >
                      <AlertTriangle size={14} />
                      {uploadErrors.length} arquivo(s) com erro
                    </p>
                    <ul
                      style={{
                        margin: '0.5rem 0 0',
                        padding: 0,
                        listStyle: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem',
                        fontSize: '0.7rem',
                        color: '#cbd5e1',
                      }}
                    >
                      {uploadErrors.map((e, i) => (
                        <li key={`${e.file}-${i}`}>
                          <strong style={{ color: '#fca5a5' }}>
                            {e.file}
                          </strong>
                          : {e.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Coluna Direita */}
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
            >
              <div style={moduleStyles.card}>
                <div style={moduleStyles.cardHeader}>
                  <h2 style={moduleStyles.cardTitle}>
                    <CheckCircle2 size={18} color="#3b82f6" />
                    Como funciona
                  </h2>
                </div>
                <p
                  style={{
                    fontSize: '0.8rem',
                    color: '#94a3b8',
                    margin: '0 0 1rem',
                    lineHeight: 1.5,
                  }}
                >
                  Nosso sistema utiliza OCR avançado para extrair texto dos seus
                  PDFs.
                </p>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  {[
                    {
                      n: 1,
                      t: 'Selecione os arquivos',
                      d: 'Arraste ou clique para escolher vários PDFs',
                    },
                    {
                      n: 2,
                      t: 'Extração automática',
                      d: 'O OCR extrai o texto de cada um',
                    },
                    {
                      n: 3,
                      t: 'Título e código automáticos',
                      d: 'Gerados a partir do nome do arquivo',
                    },
                    {
                      n: 4,
                      t: 'Disponível para busca',
                      d: 'Encontre informações em segundos',
                    },
                  ].map((item) => (
                    <div
                      key={item.n}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.75rem',
                      }}
                    >
                      <span
                        style={{
                          width: '1.5rem',
                          height: '1.5rem',
                          borderRadius: '50%',
                          background:
                            'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {item.n}
                      </span>
                      <div>
                        <p
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            color: 'white',
                            margin: 0,
                          }}
                        >
                          {item.t}
                        </p>
                        <p
                          style={{
                            fontSize: '0.7rem',
                            color: '#94a3b8',
                            margin: '0.125rem 0 0',
                          }}
                        >
                          {item.d}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  background:
                    'linear-gradient(135deg, rgba(30, 58, 95, 0.6) 0%, rgba(15, 30, 58, 0.8) 100%)',
                  borderRadius: '1rem',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  padding: '1.5rem',
                }}
              >
                <h2
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: 'white',
                    margin: '0 0 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  💡 Dicas para melhores resultados
                </h2>
                <ul
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    fontSize: '0.75rem',
                    color: '#cbd5e1',
                    lineHeight: 1.5,
                  }}
                >
                  <li>• Nomeie os arquivos de forma clara (ex: RQ-SMS-0001.pdf)</li>
                  <li>• Use PDFs com texto nítido e legível</li>
                  <li>• Evite PDFs protegidos por senha</li>
                  <li>• O OCR suporta português e inglês</li>
                  <li>• Arraste vários arquivos de uma vez para agilizar</li>
                  <li>• O primeiro arquivo pode demorar mais (download do OCR)</li>
                </ul>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.5rem',
                }}
              >
                {[
                  { icon: CheckCircle2, label: 'OCR Inteligente' },
                  { icon: Zap, label: 'Busca Avançada' },
                  { icon: Shield, label: 'Seguro & Privado' },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.375rem',
                      padding: '0.75rem 0.5rem',
                      background: 'rgba(15, 30, 58, 0.5)',
                      border: '1px solid rgba(59, 130, 246, 0.15)',
                      borderRadius: '0.75rem',
                      fontSize: '0.65rem',
                      color: '#94a3b8',
                      fontWeight: 500,
                      textAlign: 'center',
                    }}
                  >
                    <item.icon size={16} color="#3b82f6" />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
