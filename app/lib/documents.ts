// lib/documents.ts
export async function uploadDocument(
  file: File,
  metadata: {
    code: string;
    title: string;
    category: string;
    orientation: 'portrait' | 'landscape';
    content: string;
  }
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ✅ Sanitiza o nome do arquivo (remove caracteres inválidos)
  const sanitizedFileName = file.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Substitui caracteres especiais por _
    .replace(/_+/g, '_') // Remove _ duplicados
    .replace(/^_|_$/g, ''); // Remove _ no início/fim

  // ✅ Gera um caminho único e seguro
  const filePath = `${user?.id || 'anon'}/${Date.now()}-${sanitizedFileName}`;

  console.log('📁 Caminho do arquivo:', filePath);

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    console.error('❌ Erro no upload do arquivo:', uploadError);
    throw uploadError;
  }

  const { data: urlData } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath);

  const { data, error } = await supabase
    .from('documents')
    .insert({
      code: metadata.code.toUpperCase(),
      title: metadata.title,
      file_name: file.name, // ✅ Mantém o nome original para exibição
      file_url: urlData.publicUrl,
      content: metadata.content,
      category: metadata.category || 'Geral',
      orientation: metadata.orientation,
      user_id: user?.id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao salvar no banco:', error);
    throw error;
  }

  return data as DocumentData;
}
