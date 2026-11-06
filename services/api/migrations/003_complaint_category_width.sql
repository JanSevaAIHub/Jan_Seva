-- Repair existing Phase 1 databases without truncating values or dropping data.
SELECT pg_advisory_xact_lock(hashtext('janseva:003_complaint_category_width'));
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'complaints'
          AND column_name = 'category' AND data_type = 'character varying'
          AND character_maximum_length < 11
    ) THEN
        ALTER TABLE public.complaints ALTER COLUMN category TYPE VARCHAR(11);
    END IF;
END $$;
