-- Additive metadata only; apply with the same development/recovery approval as 005.
ALTER TABLE public.complaint_evidence
    ADD COLUMN IF NOT EXISTS original_filename VARCHAR(120);
