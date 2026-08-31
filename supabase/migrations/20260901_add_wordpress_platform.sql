-- Allow 'wordpress' in social_accounts.platform.
--
-- Run this in the Supabase SQL editor BEFORE using the WordPress connect form,
-- otherwise the insert fails the existing check constraint.
--
-- The constraint was created by hand rather than by a migration, so its name is
-- not knowable from the repo. Find it by definition instead of guessing.

DO $$
DECLARE
    existing_name text;
BEGIN
    SELECT conname
      INTO existing_name
      FROM pg_constraint
     WHERE conrelid = 'public.social_accounts'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%platform%'
     LIMIT 1;

    IF existing_name IS NOT NULL THEN
        EXECUTE format(
            'ALTER TABLE public.social_accounts DROP CONSTRAINT %I',
            existing_name
        );
    END IF;

    EXECUTE $ddl$
        ALTER TABLE public.social_accounts
            ADD CONSTRAINT social_accounts_platform_check
            CHECK (platform IN ('instagram', 'facebook', 'pinterest', 'wordpress'))
    $ddl$;
END $$;
