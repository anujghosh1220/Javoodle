-- ============================================================================
-- 0009 · Globally unique student display names (normalized)
-- Normalization: trim, collapse internal whitespace, case-insensitive.
-- Safe for existing rows — no data is modified; fails only if duplicates exist.
-- ============================================================================

create unique index if not exists students_display_name_norm_key
  on public.students (
    lower(regexp_replace(btrim(display_name), '\s+', ' ', 'g'))
  );
