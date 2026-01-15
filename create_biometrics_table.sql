-- Copie e cole este código no SQL Editor do seu painel Supabase

-- Criação da tabela de biometria facial
create table if not exists face_biometrics (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  descriptor jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar segurança a nível de linha (RLS)
alter table face_biometrics enable row level security;

-- Política de Leitura:
-- Permite que qualquer pessoa leia os descritores biométricos.
-- Necessário para que a tela de login (não autenticada) consiga baixar os descritores
-- para comparar com o rosto da câmera.
create policy "Biometrics are viewable by everyone"
  on face_biometrics for select
  using ( true );

-- Política de Inserção:
-- Apenas usuários autenticados podem cadastrar seus próprios rostos.
create policy "Users can insert their own biometrics"
  on face_biometrics for insert
  with check ( auth.uid() = user_id );

-- Política de Exclusão:
-- Usuários podem deletar seus próprios dados biométricos.
create policy "Users can delete their own biometrics"
  on face_biometrics for delete
  using ( auth.uid() = user_id );
