-- CreateTable
CREATE TABLE "GameRating" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameRating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameRating_gameId_idx" ON "GameRating"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "GameRating_gameId_userId_key" ON "GameRating"("gameId", "userId");

-- CreateIndex
CREATE INDEX "GameSession_hostId_idx" ON "GameSession"("hostId");

-- AddForeignKey
ALTER TABLE "GameRating" ADD CONSTRAINT "GameRating_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRating" ADD CONSTRAINT "GameRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
