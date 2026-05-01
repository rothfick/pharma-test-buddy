-- Move vector extension out of public schema
create schema if not exists extensions;
alter extension vector set schema extensions;

-- Tighten rag_chunks policies
drop policy if exists "Authenticated can read chunks" on public.rag_chunks;
drop policy if exists "Authenticated can insert chunks" on public.rag_chunks;

create policy "Signed-in users can read chunks"
  on public.rag_chunks for select to authenticated
  using (auth.uid() is not null);
create policy "Signed-in users can insert chunks"
  on public.rag_chunks for insert to authenticated
  with check (auth.uid() is not null);

-- Tighten semantic_cache policies
drop policy if exists "Authenticated can read cache" on public.semantic_cache;
drop policy if exists "Authenticated can write cache" on public.semantic_cache;
drop policy if exists "Authenticated can update cache hits" on public.semantic_cache;

create policy "Signed-in users can read cache"
  on public.semantic_cache for select to authenticated
  using (auth.uid() is not null);
create policy "Signed-in users can write cache"
  on public.semantic_cache for insert to authenticated
  with check (auth.uid() is not null);
create policy "Signed-in users can update cache"
  on public.semantic_cache for update to authenticated
  using (auth.uid() is not null);

-- Tighten read policies on rag_documents and prompt tables
drop policy if exists "Authenticated can read docs" on public.rag_documents;
create policy "Signed-in users can read docs"
  on public.rag_documents for select to authenticated
  using (auth.uid() is not null);

drop policy if exists "Authenticated can read prompts" on public.prompt_registry;
create policy "Signed-in users can read prompts"
  on public.prompt_registry for select to authenticated
  using (auth.uid() is not null);

drop policy if exists "Authenticated can read evals" on public.prompt_evals;
create policy "Signed-in users can read evals"
  on public.prompt_evals for select to authenticated
  using (auth.uid() is not null);

-- Restrict SECURITY DEFINER function execution
revoke execute on function public.match_rag_chunks(extensions.vector, int, uuid[]) from public, anon;
revoke execute on function public.match_semantic_cache(extensions.vector, text, float) from public, anon;
grant execute on function public.match_rag_chunks(extensions.vector, int, uuid[]) to authenticated;
grant execute on function public.match_semantic_cache(extensions.vector, text, float) to authenticated;