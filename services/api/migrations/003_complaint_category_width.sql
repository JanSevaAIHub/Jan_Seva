-- Upgrade pre-existing PR #1 databases without recreating tables or records.
-- The original VARCHAR(10) cannot store the valid 'streetlight' category.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'complaints'
          AND column_name = 'category' AND data_type = 'character varying'
          AND character_maximum_length < 50
    ) THEN
        ALTER TABLE public.complaints ALTER COLUMN category TYPE VARCHAR(50);
    END IF;
END $$;
