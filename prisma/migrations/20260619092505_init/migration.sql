-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MAIN_ADMIN', 'WARDEN', 'TENANT');

-- CreateEnum
CREATE TYPE "OccupationType" AS ENUM ('STUDENT', 'WORKING_PROFESSIONAL');

-- CreateEnum
CREATE TYPE "AccommodationType" AS ENUM ('MENS', 'WOMENS');

-- CreateEnum
CREATE TYPE "SharingType" AS ENUM ('SINGLE', 'DOUBLE', 'TRIPLE', 'FOUR', 'SIX', 'EIGHT');

-- CreateEnum
CREATE TYPE "BedType" AS ENUM ('UPPER_BERTH', 'LOWER_BERTH', 'SINGLE_COT');

-- CreateEnum
CREATE TYPE "BedStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'IN_MAINTENANCE', 'ON_HOLD', 'NOT_IN_USE');

-- CreateEnum
CREATE TYPE "OnboardingRequestStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "StayStatus" AS ENUM ('ONBOARDING_PENDING', 'APPROVED_AWAITING_PAYMENT', 'ACTIVE', 'EXTENDED', 'EARLY_EXIT', 'CHECKED_OUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DurationType" AS ENUM ('MONTHLY', 'WEEKLY', 'DAILY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "FoodPlan" AS ENUM ('NOT_INCLUDED', 'BREAKFAST_ONLY', 'BREAKFAST_DINNER', 'BLD');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'UPI', 'COMPANY_ACCOUNT', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PAID', 'PARTIALLY_PAID', 'PENDING');

-- CreateEnum
CREATE TYPE "DocumentOwnerType" AS ENUM ('TENANT', 'STAY');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('AADHAAR', 'PAN', 'PASSPORT_PHOTO', 'COLLEGE_ID', 'COMPANY_ID', 'PROFILE_PHOTO', 'PAYMENT_SCREENSHOT', 'REGISTRATION_FORM_PDF', 'RECEIPT_PDF', 'REFUND_INVOICE_PDF', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('WHATSAPP_BOT', 'MANUAL');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'FOLLOW_UP', 'CONVERTED', 'DROPPED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "supabaseAuthId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "passwordSetAt" TIMESTAMP(3),
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warden" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Warden_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gender" TEXT NOT NULL,
    "placeOfBirth" TEXT NOT NULL,
    "permanentAddress" TEXT NOT NULL,
    "emergencyContactName" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "emergencyContactNumber" TEXT NOT NULL,
    "parentGuardianName" TEXT NOT NULL,
    "parentGuardianContact" TEXT NOT NULL,
    "occupationType" "OccupationType" NOT NULL,
    "collegeName" TEXT,
    "courseOrBranch" TEXT,
    "companyName" TEXT,
    "designation" TEXT,
    "purposeOfStay" TEXT NOT NULL,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hostel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "accommodationType" "AccommodationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hostel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Floor" (
    "id" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "Floor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Flat" (
    "id" TEXT NOT NULL,
    "floorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Flat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "flatId" TEXT,
    "floorId" TEXT,
    "roomNumber" TEXT NOT NULL,
    "sharingType" "SharingType" NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bed" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "bedType" "BedType",
    "status" "BedStatus" NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "Bed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnboardingRequest" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "wardenId" TEXT NOT NULL,
    "status" "OnboardingRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OnboardingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stay" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bedId" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "status" "StayStatus" NOT NULL,
    "durationType" "DurationType" NOT NULL,
    "joiningDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isNewAdmission" BOOLEAN NOT NULL,
    "admissionFeePaise" INTEGER NOT NULL,
    "monthlyRentPaise" INTEGER NOT NULL,
    "securityDepositPaise" INTEGER NOT NULL,
    "foodChargesPaise" INTEGER NOT NULL,
    "foodPlan" "FoodPlan" NOT NULL DEFAULT 'NOT_INCLUDED',
    "totalPayablePaise" INTEGER NOT NULL,
    "discountPaise" INTEGER NOT NULL,
    "marketingExecutive" TEXT,
    "leadSource" TEXT,
    "commissionStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StayStatusEvent" (
    "id" TEXT NOT NULL,
    "stayId" TEXT NOT NULL,
    "fromStatus" "StayStatus" NOT NULL,
    "toStatus" "StayStatus" NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StayStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "stayId" TEXT NOT NULL,
    "amountPaidPaise" INTEGER NOT NULL,
    "paymentMode" "PaymentMode" NOT NULL,
    "transactionRefNo" TEXT,
    "receivedBy" TEXT,
    "paymentStatus" "PaymentStatus" NOT NULL,
    "verifiedByUserId" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "screenshotDocumentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundInvoice" (
    "id" TEXT NOT NULL,
    "stayId" TEXT NOT NULL,
    "originalAmountPaise" INTEGER NOT NULL,
    "daysUsed" INTEGER NOT NULL,
    "daysRemaining" INTEGER NOT NULL,
    "refundAmountPaise" INTEGER NOT NULL,
    "processedByUserId" TEXT NOT NULL,
    "notes" TEXT,
    "pdfDocumentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefundInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodOrder" (
    "id" TEXT NOT NULL,
    "stayId" TEXT NOT NULL,
    "forDate" TIMESTAMP(3) NOT NULL,
    "breakfast" BOOLEAN NOT NULL,
    "lunch" BOOLEAN NOT NULL,
    "dinner" BOOLEAN NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "ownerType" "DocumentOwnerType" NOT NULL,
    "tenantId" TEXT,
    "stayId" TEXT,
    "documentType" "DocumentType" NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "hostelId" TEXT,
    "phone" TEXT NOT NULL,
    "source" "LeadSource" NOT NULL,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_supabaseAuthId_key" ON "User"("supabaseAuthId");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Warden_userId_key" ON "Warden"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Warden_hostelId_key" ON "Warden"("hostelId");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_userId_key" ON "Tenant"("userId");

-- CreateIndex
CREATE INDEX "OnboardingRequest_phone_idx" ON "OnboardingRequest"("phone");

-- CreateIndex
CREATE INDEX "OnboardingRequest_phone_status_idx" ON "OnboardingRequest"("phone", "status");

-- CreateIndex
CREATE INDEX "Stay_bedId_status_idx" ON "Stay"("bedId", "status");

-- CreateIndex
CREATE INDEX "Stay_hostelId_status_idx" ON "Stay"("hostelId", "status");

-- CreateIndex
CREATE INDEX "Stay_endDate_idx" ON "Stay"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_screenshotDocumentId_key" ON "Payment"("screenshotDocumentId");

-- CreateIndex
CREATE INDEX "Payment_stayId_idx" ON "Payment"("stayId");

-- CreateIndex
CREATE UNIQUE INDEX "RefundInvoice_pdfDocumentId_key" ON "RefundInvoice"("pdfDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "FoodOrder_stayId_forDate_key" ON "FoodOrder"("stayId", "forDate");

-- CreateIndex
CREATE INDEX "Document_ownerType_tenantId_idx" ON "Document"("ownerType", "tenantId");

-- CreateIndex
CREATE INDEX "Document_ownerType_stayId_idx" ON "Document"("ownerType", "stayId");

-- AddForeignKey
ALTER TABLE "Warden" ADD CONSTRAINT "Warden_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warden" ADD CONSTRAINT "Warden_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Floor" ADD CONSTRAINT "Floor_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Flat" ADD CONSTRAINT "Flat_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_flatId_fkey" FOREIGN KEY ("flatId") REFERENCES "Flat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_floorId_fkey" FOREIGN KEY ("floorId") REFERENCES "Floor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bed" ADD CONSTRAINT "Bed_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingRequest" ADD CONSTRAINT "OnboardingRequest_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingRequest" ADD CONSTRAINT "OnboardingRequest_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "Bed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnboardingRequest" ADD CONSTRAINT "OnboardingRequest_wardenId_fkey" FOREIGN KEY ("wardenId") REFERENCES "Warden"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_bedId_fkey" FOREIGN KEY ("bedId") REFERENCES "Bed"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stay" ADD CONSTRAINT "Stay_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StayStatusEvent" ADD CONSTRAINT "StayStatusEvent_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StayStatusEvent" ADD CONSTRAINT "StayStatusEvent_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_screenshotDocumentId_fkey" FOREIGN KEY ("screenshotDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundInvoice" ADD CONSTRAINT "RefundInvoice_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundInvoice" ADD CONSTRAINT "RefundInvoice_processedByUserId_fkey" FOREIGN KEY ("processedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundInvoice" ADD CONSTRAINT "RefundInvoice_pdfDocumentId_fkey" FOREIGN KEY ("pdfDocumentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodOrder" ADD CONSTRAINT "FoodOrder_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
