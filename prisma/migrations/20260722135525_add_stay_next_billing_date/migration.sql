-- AlterTable
ALTER TABLE "Stay" ADD COLUMN     "nextBillingDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Stay_nextBillingDate_status_idx" ON "Stay"("nextBillingDate", "status");
