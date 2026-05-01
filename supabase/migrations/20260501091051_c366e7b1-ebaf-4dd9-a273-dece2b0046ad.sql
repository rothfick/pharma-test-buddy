CREATE OR REPLACE FUNCTION public.match_rag_chunks(query_embedding extensions.vector, match_count integer DEFAULT 5, filter_doc_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS TABLE(chunk_id uuid, document_id uuid, content text, similarity double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select c.id, c.document_id, c.content,
    1 - (c.embedding OPERATOR(extensions.<=>) query_embedding) as similarity
  from public.rag_chunks c
  where c.embedding is not null
    and (filter_doc_ids is null or c.document_id = any(filter_doc_ids))
  order by c.embedding OPERATOR(extensions.<=>) query_embedding
  limit match_count
$function$;

CREATE OR REPLACE FUNCTION public.match_semantic_cache(query_embedding extensions.vector, feature_filter text, similarity_threshold double precision DEFAULT 0.95)
 RETURNS TABLE(id uuid, response text, similarity double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  select c.id, c.response,
    1 - (c.prompt_embedding OPERATOR(extensions.<=>) query_embedding) as similarity
  from public.semantic_cache c
  where c.feature = feature_filter
    and c.expires_at > now()
    and c.prompt_embedding is not null
    and 1 - (c.prompt_embedding OPERATOR(extensions.<=>) query_embedding) >= similarity_threshold
  order by c.prompt_embedding OPERATOR(extensions.<=>) query_embedding
  limit 1
$function$;