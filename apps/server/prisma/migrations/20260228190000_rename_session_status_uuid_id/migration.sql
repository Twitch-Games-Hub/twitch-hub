-- Rename enum values (PG 10+)
ALTER TYPE "SessionStatus" RENAME VALUE 'WAITING' TO 'LOBBY';
ALTER TYPE "SessionStatus" RENAME VALUE 'ACTIVE' TO 'LIVE';
ALTER TYPE "SessionStatus" RENAME VALUE 'COMPLETED' TO 'ENDED';

-- Migrate any PAUSED rows before removing the value
UPDATE "GameSession" SET "status" = 'LOBBY' WHERE "status" = 'PAUSED';

-- Remove PAUSED (PG has no DROP VALUE, so recreate the enum)
-- Must drop default first to allow type cast
ALTER TABLE "GameSession" ALTER COLUMN "status" DROP DEFAULT;
ALTER TYPE "SessionStatus" RENAME TO "SessionStatus_old";
CREATE TYPE "SessionStatus" AS ENUM ('LOBBY', 'LIVE', 'ENDED');
ALTER TABLE "GameSession" ALTER COLUMN "status" TYPE "SessionStatus" USING "status"::text::"SessionStatus";
ALTER TABLE "GameSession" ALTER COLUMN "status" SET DEFAULT 'LOBBY';
DROP TYPE "SessionStatus_old";

-- Switch session ID default to UUID v4 (existing CUID IDs stay valid — same TEXT column)
ALTER TABLE "GameSession" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();
