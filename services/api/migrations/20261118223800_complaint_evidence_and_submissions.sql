-- Additive migration only. Review against the verified development project and
-- confirm backup/recovery before an operator applies it. Never run at startup.
SELECT pg_advisory_xact_lock(hashtext('janseva:evidence-and-submissions'));

CREATE TABLE IF NOT EXISTS public.complaint_submissions (
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE RESTRICT,
    request_key UUID NOT NULL,
    complaint_id UUID NOT NULL UNIQUE REFERENCES public.complaints(id) ON DELETE RESTRICT,
    fingerprint VARCHAR(64) NOT NULL,
    PRIMARY KEY (user_id, request_key)
);
CREATE TABLE IF NOT EXISTS public.complaint_evidence (
    complaint_id UUID PRIMARY KEY REFERENCES public.complaints(id) ON DELETE RESTRICT,
    id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    object_path VARCHAR(250) NOT NULL UNIQUE,
    filename VARCHAR(120) NOT NULL,
    mime_type VARCHAR(30) NOT NULL,
    size_bytes INTEGER NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT evidence_size_positive CHECK (size_bytes > 0),
    CONSTRAINT evidence_mime_allowed CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp'))
);
ALTER TABLE public.complaint_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaint_submissions ENABLE ROW LEVEL SECURITY;
-- Access is exclusively via JWT-verified FastAPI ownership/assignment checks.
-- No browser role receives direct access; no permissive RLS policy is added.
REVOKE ALL ON public.complaint_evidence, public.complaint_submissions FROM PUBLIC;
REVOKE ALL ON public.complaint_evidence, public.complaint_submissions FROM anon, authenticated;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'complaint-evidence' AND public) THEN
        RAISE EXCEPTION 'Existing complaint-evidence bucket is public; review manually before proceeding';
    END IF;
END $$;
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('complaint-evidence', 'complaint-evidence', false, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;
-- Restrictive policy blocks pre-existing broad browser policies for this bucket.
-- Service-role operations from the verified API bypass RLS.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage'
                   AND tablename = 'objects' AND policyname = 'janseva_evidence_api_only') THEN
        CREATE POLICY janseva_evidence_api_only ON storage.objects AS RESTRICTIVE
        FOR ALL TO anon, authenticated
        USING (bucket_id <> 'complaint-evidence')
        WITH CHECK (bucket_id <> 'complaint-evidence');
    END IF;
END $$;
