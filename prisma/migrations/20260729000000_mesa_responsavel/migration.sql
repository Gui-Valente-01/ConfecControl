-- Funcionario responsavel por cada mesa da bancada. Idempotente.
ALTER TABLE "mesas" ADD COLUMN IF NOT EXISTS "responsibleUserId" TEXT;

CREATE INDEX IF NOT EXISTS "mesas_responsibleUserId_idx" ON "mesas" ("responsibleUserId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'mesas_responsibleUserId_fkey') THEN
    ALTER TABLE "mesas" ADD CONSTRAINT "mesas_responsibleUserId_fkey"
      FOREIGN KEY ("responsibleUserId") REFERENCES "usuarios" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
