// lib/documents.ts
import { supabase, DocumentData } from './supabase';

// ============================================
// CREATE - Upload de documento + arquivo
// ============================================
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

  const filePath = `${user?.id || 'anon'}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, file);

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
      file_name: file.name,
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

// ============================================
// READ - Buscar todos os documentos
// ============================================
export async function getAllDocuments(): Promise<DocumentData[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .order('uploaded_at', { ascending: false });

  if (error) {
    console.error('❌ Erro ao buscar documentos:', error);
    throw error;
  }

  return data as DocumentData[];
}

// ============================================
// READ - Buscar um documento por ID
// ============================================
export async function getDocumentById(
  id: string
): Promise<DocumentData | null> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('❌ Erro ao buscar documento:', error);
    return null;
  }

  return data as DocumentData;
}

// ============================================
// READ - Buscar com filtros (usando ILIKE)
// ============================================
export async function searchDocuments(filters: {
  searchTerm?: string;
  category?: string;
  date?: string;
}): Promise<DocumentData[]> {
  let query = supabase.from('documents').select('*');

  // ✅ Busca por ILIKE (funciona para qualquer termo, inclusive 1 letra)
  if (filters.searchTerm && filters.searchTerm.trim()) {
    const term = filters.searchTerm.trim();
    query = query.or(
      `code.ilike.%${term}%,title.ilike.%${term}%,content.ilike.%${term}%`
    );
  }

  if (filters.category && filters.category !== 'Todas') {
    query = query.eq('category', filters.category);
  }

  if (filters.date) {
    query = query.gte('uploaded_at', filters.date);
  }

  const { data, error } = await query.order('uploaded_at', {
    ascending: false,
  });

  if (error) {
    console.error('❌ Erro na busca:', error);
    throw error;
  }

  return data as DocumentData[];
}

// ============================================
// UPDATE - Atualizar documento
// ============================================
export async function updateDocument(
  id: string,
  updates: Partial<DocumentData>
): Promise<DocumentData> {
  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('❌ Erro ao atualizar:', error);
    throw error;
  }

  return data as DocumentData;
}

// ============================================
// DELETE - Excluir documento + arquivo
// ============================================
export async function deleteDocument(id: string): Promise<void> {
  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('file_url')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('❌ Erro ao buscar documento:', fetchError);
    throw fetchError;
  }

  if (doc?.file_url) {
    const filePath = doc.file_url.split('/documents/')[1];
    if (filePath) {
      await supabase.storage.from('documents').remove([filePath]);
    }
  }

  const { error } = await supabase.from('documents').delete().eq('id', id);

  if (error) {
    console.error('❌ Erro ao excluir:', error);
    throw error;
  }
}

// ============================================
// AUTH - Login / Logout (opcional)
// ============================================
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
