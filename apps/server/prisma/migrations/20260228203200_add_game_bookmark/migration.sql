-- CreateTable
CREATE TABLE "GameBookmark" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GameBookmark_userId_idx" ON "GameBookmark"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GameBookmark_gameId_userId_key" ON "GameBookmark"("gameId", "userId");

-- AddForeignKey
ALTER TABLE "GameBookmark" ADD CONSTRAINT "GameBookmark_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameBookmark" ADD CONSTRAINT "GameBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
