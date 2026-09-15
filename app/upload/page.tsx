// app/upload/page.tsx
'use client';

import { useState, useRef } from 'react';
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
} from 'lucide-react';
import Sidebar from '../Sidebar';
import { uploadDocument } from '../lib/documents';
import { pageStyles, moduleStyles } from '../styles';

function normalizeSpaces(text: string): string {
  return text.replace(/\s{2,}/g, ' ').trim();
}

function removeFooterKeywords(text: string): string {
  let result = text;
  result = result.replace(
    /T[ÍI]TULO:\s*[^\n]*?(?=DATA\s+REVIS[ÃA]O:|ELABORA[ÇC][ÃA]O:|APROVA[ÇC][ÃA]O:|$)/gi,
    ''
  );
  result = result.replace(
    /DATA\s+REVIS[ÃA]O:\s*[^\n]*?(?=ELABORA[ÇC][ÃA]O:|APROVA[ÇC][ÃA]O:|P[ÁA]GINA:|$)/gi,
    ''
  );
  result = result.replace(
    /ELABORA[ÇC][ÃA]O:\s*[^\n]*?(?=APROVA[ÇC][ÃA]O:|P[ÁA]GINA:|$)/gi,
    ''
  );
  result = result.replace(/APROVA[ÇC][ÃA]O:\s*[^\n]*?(?=P[ÁA]GINA:|$)/gi, '');
  result = result.replace(/P[ÁA]GINA:\s*\d+\s*de\s*\d+/gi, '');
  result = result.replace(/P[ÁA]G:\s*\d+/gi, '');
  result = result.replace(/C[ÓO]PIA\s+ELETR[ÔO]NICA/gi, '');
  result = result.replace(/\s{2,}/g, ' ');
  return result.trim();
}

function extractTitleFromFileName(fileName: string): string {
  return fileName
    .replace(/\.pdf$/i, '')
    .replace(/[_-]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function generateCodeFromFileName(fileName: string): string {
  const base = fileName
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9]/g, '-')
    .toUpperCase()
    .substring(0, 20);
  return `${base}-${Date.now().toString().slice(-4)}`;
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    'portrait'
  );
  const [removeExtraSpaces, setRemoveExtraSpaces] = useState(true);

  // ✅ Drag & Drop states
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter((f) =>
        f.name.toLowerCase().endsWith('.pdf')
      );
      setFiles((prev) => [...prev, ...newFiles]);
    }
  };

  // ✅ Drag & Drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Só desativa se sair completamente da área
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

    const droppedFiles = Array.from(e.dataTransfer.files);
    const pdfFiles = droppedFiles.filter((f) =>
      f.name.toLowerCase().endsWith('.pdf')
    );

    if (pdfFiles.length === 0) {
      setMessage('⚠️ Apenas arquivos PDF são aceitos.');
      return;
    }

    setFiles((prev) => [...prev, ...pdfFiles]);
    setMessage(`✅ ${pdfFiles.length} arquivo(s) adicionado(s).`);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  function preprocessImage(canvas: HTMLCanvasElement): HTMLCanvasElement {
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
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
    return canvas;
  }

  const extractPDFText = async (file: File): Promise<string> => {
    if (!(window as any).pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Erro ao carregar PDF.js'));
        document.head.appendChild(script);
      });
    }

    const pdfjsLib = (window as any).pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');

      if (pageText.trim().length < 10) {
        const viewport = page.getViewport({ scale: 3 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        await page.render({ canvasContext: context, viewport }).promise;
        const processedCanvas = preprocessImage(canvas);
        const imageData = processedCanvas.toDataURL('image/png');

        try {
          if (!(window as any).Tesseract) {
            await new Promise<void>((resolve, reject) => {
              const script = document.createElement('script');
              script.src =
                'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/tesseract.min.js';
              script.onload = () => resolve();
              script.onerror = () =>
                reject(new Error('Erro ao carregar Tesseract.js'));
              document.head.appendChild(script);
            });
          }

          const Tesseract = (window as any).Tesseract;
          const result = await Tesseract.recognize(imageData, 'por+eng', {
            tessedit_psm: 6,
            timeout: 60000,
          });
          fullText += result.data.text + '\n';
        } catch {
          fullText += pageText + '\n';
        }
      } else {
        fullText += pageText + '\n';
      }
    }
    return fullText;
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setMessage('Selecione pelo menos um arquivo');
      return;
    }

    setUploading(true);
    setMessage('');
    setProgress({ current: 0, total: files.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress({ current: i + 1, total: files.length });
      setMessage(`Processando ${i + 1} de ${files.length}: ${file.name}`);

      try {
        const content = await extractPDFText(file);
        let finalContent = content;

        if (removeExtraSpaces) {
          finalContent = normalizeSpaces(finalContent);
        }

        finalContent = removeFooterKeywords(finalContent);

        if (finalContent.length < 10) {
          finalContent = content;
        }

        if (!finalContent || finalContent.length < 5) {
          errorCount++;
          continue;
        }

        const autoCode = generateCodeFromFileName(file.name);
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
        console.error(`Erro no arquivo ${file.name}:`, error);
        errorCount++;
      }
    }

    setUploading(false);
    setMessage(
      `✅ Concluído! ${successCount} enviado(s), ${errorCount} erro(s).`
    );

    setTimeout(() => {
      if (successCount > 0) router.push('/');
    }, 2500);
  };

  const handleModuleChange = (module: string) => {
    if (module === 'dashboard') router.push('/');
    else if (module === 'documentos') router.push('/');
    else if (module === 'configuracoes') router.push('/');
  };

  const progressPercent =
    progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div style={pageStyles.container}>
      <Sidebar
        activeModule="upload"
        onModuleChange={handleModuleChange}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
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
                    data-theme="dark"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
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
                    }}
                  >
                    <option value="">Geral</option>
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
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        color: '#94a3b8',
                        marginBottom: '0.5rem',
                      }}
                    >
                      Orientação do documento
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setOrientation('portrait')}
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
                          cursor: 'pointer',
                        }}
                      >
                        📄 Retrato
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrientation('landscape')}
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
                          cursor: 'pointer',
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
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      color: '#cbd5e1',
                      fontWeight: 500,
                    }}
                  >
                    <input
                      data-theme="dark"
                      type="checkbox"
                      checked={removeExtraSpaces}
                      onChange={(e) => setRemoveExtraSpaces(e.target.checked)}
                    />
                    Excluir espaços em branco extras
                  </label>
                </div>

                {/* ✅ Upload com Drag & Drop */}
                <div>
                  <label
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
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
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
                      cursor: 'pointer',
                      transform: isDragging ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      multiple
                      onChange={handleFileSelect}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
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
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
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
                      {files.map((file, index) => (
                        <div
                          key={index}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            background: 'rgba(30, 58, 95, 0.3)',
                            padding: '0.75rem',
                            borderRadius: '0.75rem',
                            border: '1px solid rgba(59, 130, 246, 0.15)',
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
                            onClick={() => removeFile(index)}
                            style={{
                              color: '#64748b',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '0.25rem',
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
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

                {/* Botão de enviar */}
                <button
                  onClick={handleUpload}
                  disabled={uploading || files.length === 0}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    background:
                      uploading || files.length === 0
                        ? 'rgba(37, 99, 235, 0.4)'
                        : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    padding: '0.875rem',
                    borderRadius: '0.75rem',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    border: 'none',
                    cursor:
                      uploading || files.length === 0
                        ? 'not-allowed'
                        : 'pointer',
                    boxShadow:
                      uploading || files.length === 0
                        ? 'none'
                        : '0 4px 16px rgba(37, 99, 235, 0.4)',
                  }}
                >
                  {uploading ? (
                    <>
                      <Loader2
                        size={16}
                        style={{ animation: 'spin 1s linear infinite' }}
                      />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Enviar {files.length > 0 ? `(${files.length})` : ''}
                    </>
                  )}
                </button>

                {message && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      background: 'rgba(59, 130, 246, 0.1)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      color: '#93c5fd',
                      borderRadius: '0.5rem',
                      fontSize: '0.8rem',
                    }}
                  >
                    {message}
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
                    { n: 1, t: 'Selecione os arquivos', d: 'Arraste ou clique para escolher vários PDFs' },
                    { n: 2, t: 'Extração automática', d: 'O OCR extrai o texto de cada um' },
                    { n: 3, t: 'Título e código automáticos', d: 'Gerados a partir do nome do arquivo' },
                    { n: 4, t: 'Disponível para busca', d: 'Encontre informações em segundos' },
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
                ].map((item, i) => (
                  <div
                    key={i}
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
