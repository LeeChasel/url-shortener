UPDATE "Url"
SET
    "expiresAt" = NOW() + INTERVAL '1 days'
WHERE
    "expiresAt" IS NULL;

ALTER TABLE "Url" ALTER COLUMN "expiresAt" SET NOT NULL;