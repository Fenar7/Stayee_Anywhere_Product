-- AlterTable
ALTER TABLE "Hostel" ADD COLUMN     "locationId" TEXT;

-- AlterTable
ALTER TABLE "OnboardingRequest" ADD COLUMN     "failedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "onboardingCurrentStep" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tempPasswordHash" TEXT;

-- CreateTable
CREATE TABLE "HostelPaymentConfig" (
    "id" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "upiId" TEXT,
    "qrCodePath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostelPaymentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HostelPaymentConfig_hostelId_key" ON "HostelPaymentConfig"("hostelId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- AddForeignKey
ALTER TABLE "Hostel" ADD CONSTRAINT "Hostel_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostelPaymentConfig" ADD CONSTRAINT "HostelPaymentConfig_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
