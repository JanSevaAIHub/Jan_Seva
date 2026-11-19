-- Additive release migration. Review target/backup and obtain approval before execution.
SELECT pg_advisory_xact_lock(hashtext('janseva:005_private_evidence'));
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS submission_key UUID;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='complaints_submission_key'
                   AND conrelid='public.complaints'::regclass) THEN
        ALTER TABLE public.complaints ADD CONSTRAINT complaints_submission_key UNIQUE (user_id, submission_key);
    END IF;
END $$;
CREATE TABLE IF NOT EXISTS public.complaint_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE RESTRICT,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE RESTRICT,
    upload_key UUID NOT NULL,
    slot INTEGER NOT NULL,
    state VARCHAR(14) NOT NULL DEFAULT 'PENDING',
    extension VARCHAR(4) NOT NULL,
    content_type VARCHAR(20) NOT NULL,
    size_bytes INTEGER NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT complaint_evidence_slot UNIQUE (complaint_id, slot),
    CONSTRAINT complaint_evidence_upload_key UNIQUE (complaint_id, upload_key),
    CONSTRAINT complaint_evidence_slot_range CHECK (slot BETWEEN 1 AND 3),
    CONSTRAINT complaint_evidence_state CHECK (state IN ('PENDING', 'READY', 'DELETE_PENDING')),
    CONSTRAINT complaint_evidence_extension CHECK (extension IN ('jpg', 'png', 'webp')),
    CONSTRAINT complaint_evidence_size CHECK (size_bytes > 0 AND size_bytes <= 5242880)
);
CREATE INDEX IF NOT EXISTS ix_complaint_evidence_complaint_id ON public.complaint_evidence(complaint_id);
ALTER TABLE public.complaint_evidence ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.complaint_evidence FROM PUBLIC;
DO $$ DECLARE browser_role TEXT; BEGIN
    FOREACH browser_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname=browser_role) THEN
            EXECUTE format('REVOKE ALL ON public.complaint_evidence FROM %I', browser_role);
        END IF;
    END LOOP;
END $$;
-- A dedicated restrictive policy prevents direct browser access even when an
-- existing permissive policy allows other buckets. service_role bypasses RLS.
-- No bucket is created; its privacy is independently checked on every operation.
DO $$ BEGIN
    IF to_regclass('storage.objects') IS NULL THEN
        RAISE EXCEPTION 'Supabase Storage schema is required for private evidence';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polrelid='storage.objects'::regclass
                   AND polname='janseva_evidence_server_only') THEN
        CREATE POLICY janseva_evidence_server_only ON storage.objects
            AS RESTRICTIVE FOR ALL TO PUBLIC
            USING (bucket_id <> 'janseva-complaint-evidence')
            WITH CHECK (bucket_id <> 'janseva-complaint-evidence');
    END IF;
END $$;
