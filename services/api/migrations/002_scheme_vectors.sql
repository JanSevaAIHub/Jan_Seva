-- Additive Phase 3 migration: keep Phase 1 JSON embeddings and existing data.
SELECT pg_advisory_xact_lock(hashtext('janseva:002_scheme_vectors'));
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Respect an existing vector extension in public or another installed schema.
DO $$
DECLARE vector_schema TEXT;
BEGIN
    SELECT n.nspname INTO vector_schema FROM pg_extension e
      JOIN pg_namespace n ON n.oid = e.extnamespace WHERE e.extname = 'vector';
    EXECUTE format('ALTER TABLE public.scheme_chunks ADD COLUMN IF NOT EXISTS embedding_vector %I.vector', vector_schema);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'scheme_chunks_vector_dimensions'
                   AND conrelid = 'public.scheme_chunks'::regclass) THEN
        EXECUTE format('ALTER TABLE public.scheme_chunks ADD CONSTRAINT scheme_chunks_vector_dimensions CHECK
          (embedding_vector IS NULL OR (embedding_dimensions IS NOT NULL AND embedding_model IS NOT NULL
           AND %I.vector_dims(embedding_vector) = embedding_dimensions))', vector_schema);
    END IF;
END $$;
ALTER TABLE public.scheme_chunks ADD COLUMN IF NOT EXISTS source_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.scheme_chunks ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT true;
-- Exact cosine search is sufficient for this small corpus; no approximate index.
