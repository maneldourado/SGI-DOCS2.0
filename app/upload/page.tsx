// app/upload/page.tsx
'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Loader2, Save, X } from 'lucide-react';
import Sidebar from '../Sidebar';
import { uploadDocument } from '../lib/documents';

// ✅ REMOVE ESPAÇOS EM BRANCO EXTRAS
function normalizeSpaces(text: string): string {
  return text.replace(/\s{2,}/g, ' ').trim();
}

// ✅ REMOVE RODAPÉ USANDO REGEX
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

// ✅ Extrai o título do nome do arquivo (remove extensão e substitui _ e -)
function extractTitleFromFileName(fileName: string): string {
  return fileName
    .replace(/\.pdf$/i, '')
    .replace(/[_-]/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// ✅ Gera um código automático baseado no nome do arquivo
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
  const [darkMode, setDarkMode] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
    'portrait'
  );
  const [removeExtraSpaces, setRemoveExtraSpaces] = useState(true);

  // ✅ Aceita múltiplos arquivos
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  // ✅ Remove um arquivo da lista
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
      const threshold = 140;
      const val = gray < threshold ? 0 : 255;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  const extractPDFText = async (file: File): Promise<string> => {
    // Carrega pdf.js se ainda não estiver carregado
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
            tessedit_char_whitelist:
              'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-/:().,;áéíóúâêôãõçàüÁÉÍÓÚÂÊÔÃÕÇÀÜ',
            timeout: 60000,
          });

          fullText += result.data.text + '\n';
        } catch (error) {
          fullText += pageText + '\n';
        }
      } else {
        fullText += pageText + '\n';
      }
    }

    return fullText;
  };

  // ✅ Processa vários arquivos em sequência
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
          console.warn(`Sem texto extraído em: ${file.name}`);
          errorCount++;
          continue;
        }

        // ✅ Gera código e título automaticamente
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
      } catch (error: any) {
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
    if (module === 'dashboard') {
      router.push('/');
    } else if (module === 'documentos') {
      router.push('/');
    } else if (module === 'configuracoes') {
      router.push('/');
    } else if (module === 'upload') {
      // já está na página de upload
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        display: 'flex',
      }}
    >
      <Sidebar
        activeModule="upload"
        onModuleChange={handleModuleChange}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      <div style={{ flex: 1, minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        <main className="p-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Enviar Documentos
            </h1>
            <p className="text-sm text-gray-500 mb-8">
              Envie vários PDFs de uma vez. O título e o código serão gerados
              automaticamente a partir do nome do arquivo.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Coluna Esquerda - Formulário */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Configurações
                </h2>

                <div className="space-y-4">
                  {/* Categoria */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Categoria
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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

                  {/* Configurações de extração */}
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <h3 className="text-sm font-bold text-gray-700">
                      Configurações de Extração
                    </h3>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Orientação do documento
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setOrientation('portrait')}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                            orientation === 'portrait'
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-gray-300 bg-white text-gray-600'
                          }`}
                        >
                          📄 Retrato
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrientation('landscape')}
                          className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
                            orientation === 'landscape'
                              ? 'border-blue-600 bg-blue-50 text-blue-700'
                              : 'border-gray-300 bg-white text-gray-600'
                          }`}
                        >
                          📐 Paisagem
                        </button>
                      </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={removeExtraSpaces}
                        onChange={(e) => setRemoveExtraSpaces(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">
                        Excluir espaços em branco extras
                      </span>
                    </label>
                  </div>

                  {/* Upload de múltiplos arquivos */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Arquivos PDF *
                    </label>
                    <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center bg-blue-50">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                      <Upload className="mx-auto text-blue-500" size={48} />
                      <p className="mt-2 text-sm text-gray-600">
                        Arraste seus PDFs aqui ou clique para selecionar
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Aceita múltiplos arquivos PDF
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700"
                      >
                        Selecionar PDFs
                      </button>
                    </div>
                  </div>

                  {/* Lista de arquivos selecionados */}
                  {files.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">
                        {files.length} arquivo(s) selecionado(s):
                      </p>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <FileText
                                className="text-blue-500 flex-shrink-0"
                                size={20}
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">
                                  {(file.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              className="text-gray-400 hover:text-red-500 ml-2"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Barra de progresso */}
                  {uploading && progress.total > 0 && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>
                          Processando {progress.current} de {progress.total}
                        </span>
                        <span>
                          {Math.round(
                            (progress.current / progress.total) * 100
                          )}
                          %
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{
                            width: `${
                              (progress.current / progress.total) * 100
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Botão de enviar */}
                  <button
                    onClick={handleUpload}
                    disabled={uploading || files.length === 0}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
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
                    <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
                      {message}
                    </div>
                  )}
                </div>
              </div>

              {/* Coluna Direita */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">
                    Como funciona
                  </h2>
                  <p className="text-sm text-gray-600 mb-4">
                    Nosso sistema utiliza OCR avançado para extrair texto dos
                    seus PDFs.
                  </p>
                  <div className="space-y-3">
                    {[
                      {
                        n: 1,
                        t: 'Selecione os arquivos',
                        d: 'Escolha vários PDFs de uma vez',
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
                      <div key={item.n} className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                          {item.n}
                        </span>
                        <div>
                          <p className="text-sm font-semibold">{item.t}</p>
                          <p className="text-xs text-gray-500">{item.d}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl border border-blue-100 p-6">
                  <h2 className="text-lg font-bold text-blue-900 mb-4">
                    💡 Dicas para melhores resultados
                  </h2>
                  <ul className="space-y-2 text-sm text-blue-800">
                    <li>
                      • Nomeie os arquivos de forma clara (ex: RQ-SMS-0001.pdf)
                    </li>
                    <li>• Use PDFs com texto nítido e legível</li>
                    <li>• Evite PDFs protegidos por senha</li>
                    <li>• O OCR suporta português e inglês</li>
                    <li>
                      • Selecione a orientação correta para melhor precisão
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
