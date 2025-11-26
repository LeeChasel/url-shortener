-- CreateEnum
CREATE TYPE "FetchStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'NO_METADATA');

-- CreateTable
CREATE TABLE "MetaData" (
    "id" SERIAL NOT NULL,
    "urlId" INTEGER NOT NULL,
    "title" VARCHAR(255),
    "description" VARCHAR(1000),
    "image" VARCHAR(2048),
    "siteName" VARCHAR(255),
    "type" VARCHAR(50),
    "locale" VARCHAR(10),
    "fetchStatus" "FetchStatus" NOT NULL DEFAULT 'PENDING',
    "failureReason" VARCHAR(500),
    "fetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetaData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MetaData_urlId_key" ON "MetaData"("urlId");

-- CreateIndex
CREATE INDEX "MetaData_fetchStatus_idx" ON "MetaData"("fetchStatus");

-- AddForeignKey
ALTER TABLE "MetaData" ADD CONSTRAINT "MetaData_urlId_fkey" FOREIGN KEY ("urlId") REFERENCES "Url"("id") ON DELETE CASCADE ON UPDATE CASCADE;
