-- Phase 1: run with app.scripts.migrate, which wraps this file in one transaction.
-- Supabase owns auth.users. No tables, users, existing rows or policies are deleted.
SELECT pg_advisory_xact_lock(hashtext('janseva:001_initial'));

DO $$
BEGIN
    IF to_regclass('auth.users') IS NULL THEN
        RAISE EXCEPTION 'Supabase auth.users is required; configure the correct database';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
    user_id UUID PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    role VARCHAR(7) NOT NULL DEFAULT 'citizen',
    state VARCHAR(100),
    occupation VARCHAR(100),
    CONSTRAINT profiles_auth_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT,
    CONSTRAINT profiles_role CHECK (role IN ('citizen', 'officer')),
    CONSTRAINT profiles_name_nonempty CHECK (length(trim(name)) > 0)
);

CREATE TABLE IF NOT EXISTS public.schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(250) NOT NULL,
    category VARCHAR(100) NOT NULL,
    state VARCHAR(100),
    description TEXT NOT NULL,
    source_url TEXT NOT NULL,
    rules_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    reviewed_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT schemes_title_nonempty CHECK (length(trim(title)) > 0)
);

CREATE TABLE IF NOT EXISTS public.scheme_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id UUID NOT NULL REFERENCES public.schemes(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    source_url TEXT NOT NULL,
    embedding JSONB,
    embedding_model VARCHAR(200),
    embedding_dimensions INTEGER,
    CONSTRAINT scheme_chunks_positive_dimensions CHECK (embedding_dimensions IS NULL OR embedding_dimensions > 0),
    CONSTRAINT scheme_chunks_embedding_metadata CHECK (
        (embedding IS NULL AND embedding_model IS NULL AND embedding_dimensions IS NULL) OR
        (embedding IS NOT NULL AND embedding_model IS NOT NULL AND embedding_dimensions IS NOT NULL)
    ),
    CONSTRAINT scheme_chunks_embedding_shape CHECK (
        embedding IS NULL OR (jsonb_typeof(embedding) = 'array' AND jsonb_array_length(embedding) = embedding_dimensions)
    )
);
CREATE INDEX IF NOT EXISTS ix_scheme_chunks_scheme_id ON public.scheme_chunks(scheme_id);

CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE RESTRICT,
    title VARCHAR(250) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(11) NOT NULL,
    locality VARCHAR(250) NOT NULL,
    status VARCHAR(15) NOT NULL DEFAULT 'LOCAL_SUBMITTED',
    assigned_officer_id UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
    official_ref VARCHAR(250),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_synthetic BOOLEAN NOT NULL DEFAULT false,
    seed_key VARCHAR(100) UNIQUE,
    CONSTRAINT complaints_title_nonempty CHECK (length(trim(title)) > 0),
    CONSTRAINT complaints_category CHECK (category IN ('road', 'water', 'sanitation', 'streetlight', 'other')),
    CONSTRAINT complaints_status CHECK (status IN ('DRAFT', 'LOCAL_SUBMITTED', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED', 'REJECTED', 'REOPENED'))
);
CREATE INDEX IF NOT EXISTS ix_complaints_user_id ON public.complaints(user_id);
CREATE INDEX IF NOT EXISTS ix_complaints_assigned_officer_id ON public.complaints(assigned_officer_id);
CREATE INDEX IF NOT EXISTS ix_complaints_status ON public.complaints(status);

CREATE TABLE IF NOT EXISTS public.complaint_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE RESTRICT,
    actor_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE RESTRICT,
    old_status VARCHAR(15),
    new_status VARCHAR(15) NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT complaint_events_old_status CHECK (old_status IN ('DRAFT', 'LOCAL_SUBMITTED', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED', 'REJECTED', 'REOPENED')),
    CONSTRAINT complaint_events_new_status CHECK (new_status IN ('DRAFT', 'LOCAL_SUBMITTED', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED', 'REJECTED', 'REOPENED'))
);
CREATE INDEX IF NOT EXISTS ix_complaint_events_complaint_id ON public.complaint_events(complaint_id);

CREATE OR REPLACE FUNCTION public.janseva_touch_complaint()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END $$;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'janseva_complaints_updated_at'
                   AND tgrelid = 'public.complaints'::regclass AND NOT tgisinternal) THEN
        CREATE TRIGGER janseva_complaints_updated_at BEFORE UPDATE ON public.complaints
        FOR EACH ROW EXECUTE FUNCTION public.janseva_touch_complaint();
    END IF;
END $$;

-- These tables are served through FastAPI using a trusted server DB account.
-- Browser Supabase users cannot mutate their profile role or bypass API ownership checks.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schemes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheme_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles, public.schemes, public.scheme_chunks, public.complaints, public.complaint_events FROM PUBLIC;
DO $$
DECLARE browser_role TEXT;
BEGIN
    FOREACH browser_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = browser_role) THEN
            EXECUTE format('REVOKE ALL ON public.profiles, public.schemes, public.scheme_chunks, public.complaints, public.complaint_events FROM %I', browser_role);
        END IF;
    END LOOP;
END $$;
