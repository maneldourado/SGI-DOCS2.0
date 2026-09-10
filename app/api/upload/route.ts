import { NextRequest, NextResponse } from 'next/server';

// Configuração para rodar no Node.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const code = formData.get('code') as string;
    const title = formData.get('title') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    // Lê o arquivo como buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Importação dinâmica do pdf-parse
    const pdfParse = (await import('pdf-parse')).default;

    // Extrai texto do PDF
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;

    // Se não extraiu nada, avisa
    if (!text || text.length < 10) {
      return NextResponse.json(
        {
          error:
            'Não foi possível extrair texto deste PDF (pode ser digitalizado)',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, text, textLength: text.length });
  } catch (error) {
    console.error('Erro no upload:', error);
    return NextResponse.json(
      { error: 'Erro interno no upload' },
      { status: 500 }
    );
  }
}
