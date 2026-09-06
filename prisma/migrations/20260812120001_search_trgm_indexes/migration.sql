-- Trigram GIN indexes for fuzzy name search (100k+ student campus directory).
CREATE INDEX IF NOT EXISTS "FacultyMember_name_trgm_idx"
  ON "FacultyMember" USING gin ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "Building_name_trgm_idx"
  ON "Building" USING gin ("name" gin_trgm_ops);
