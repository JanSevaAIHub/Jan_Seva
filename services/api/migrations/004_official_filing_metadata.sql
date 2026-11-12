-- Additive, rerunnable upgrade. Preserve all existing reference/history records.
SELECT pg_advisory_xact_lock(hashtext('janseva:004_official_filing_metadata'));
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS official_channel VARCHAR(30);
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS official_submitted_on DATE;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'complaints_official_channel'
                   AND conrelid = 'public.complaints'::regclass) THEN
        ALTER TABLE public.complaints ADD CONSTRAINT complaints_official_channel
            CHECK (official_channel IS NULL OR official_channel IN ('CPGRAMS', 'CONNECT_PUNJAB', 'OTHER_OFFICIAL'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'complaints_filing_requires_reference'
                   AND conrelid = 'public.complaints'::regclass) THEN
        ALTER TABLE public.complaints ADD CONSTRAINT complaints_filing_requires_reference
            CHECK (official_ref IS NOT NULL OR (official_channel IS NULL AND official_submitted_on IS NULL));
    END IF;
END $$;
