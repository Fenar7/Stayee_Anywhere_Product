/*
  Warnings:

  - You are about to drop the column `cutFruits` on the `FoodOrder` table. All the data in the column will be lost.
  - You are about to drop the column `gymDiet` on the `FoodOrder` table. All the data in the column will be lost.
  - You are about to drop the column `tea` on the `FoodOrder` table. All the data in the column will be lost.
  - You are about to drop the column `notes` on the `Lead` table. All the data in the column will be lost.
  - Added the required column `organizationId` to the `Hostel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `Lead` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `organizationId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FoodBillingMode" AS ENUM ('PREPAID_CONSUMPTION', 'POSTPAID', 'FLAT_RATE');

-- CreateEnum
CREATE TYPE "ServiceRequestType" AS ENUM ('FOOD_PLAN_UPGRADE', 'ROOM_CHANGE', 'FINE', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceRequestStatus" AS ENUM ('PENDING_PAYMENT', 'PAYMENT_UPLOADED', 'VERIFIED', 'REJECTED', 'REVOKED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('MAINTENANCE', 'CLEANING', 'ELECTRICAL', 'PLUMBING', 'OTHER');

-- CreateEnum
CREATE TYPE "ActivityEventType" AS ENUM ('TENANT_ONBOARDING_STARTED', 'TENANT_ONBOARDED', 'TENANT_PAYMENT_RECEIVED', 'TENANT_CHECKED_OUT', 'STAY_STATUS_CHANGED', 'TICKET_RAISED', 'TICKET_STATUS_UPDATED', 'TICKET_COMMENT_ADDED', 'FOOD_ORDER_UPDATED', 'FOOD_CYCLE_CLOSED', 'FOOD_WALLET_TOPPED_UP', 'FOOD_WALLET_TOPUP_REJECTED', 'FOOD_COMPLEMENTARY_ORDER_CREATED', 'SERVICE_REQUEST_CREATED', 'SERVICE_REQUEST_RESOLVED');

-- CreateEnum
CREATE TYPE "FoodBillingCycleStatus" AS ENUM ('OPEN', 'SETTLING', 'CLOSED');

-- CreateEnum
CREATE TYPE "TopUpStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SettlementOutcome" AS ENUM ('REFUND_DUE', 'AMOUNT_DUE', 'SETTLED');

-- CreateEnum
CREATE TYPE "ComplementaryOrderCategory" AS ENUM ('GUEST', 'STAFF', 'EVENT', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "FoodOrder" DROP COLUMN "cutFruits",
DROP COLUMN "gymDiet",
DROP COLUMN "tea",
ALTER COLUMN "breakfast" DROP DEFAULT,
ALTER COLUMN "lunch" DROP DEFAULT,
ALTER COLUMN "dinner" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Hostel" ADD COLUMN     "foodOrderCutoffEndHour" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN     "foodOrderCutoffStartHour" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "locationId" TEXT,
ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "notes",
ADD COLUMN     "organizationId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "OnboardingRequest" ADD COLUMN     "failedAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ADD COLUMN     "onboardingCurrentStep" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tempPasswordHash" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "receiptNumber" SERIAL NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Stay" ADD COLUMN     "foodBillingMode" "FoodBillingMode" NOT NULL DEFAULT 'FLAT_RATE',
ADD COLUMN     "foodPlanEndDate" TIMESTAMP(3),
ADD COLUMN     "foodPlanStartDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "additionalEmergencyContacts" JSONB,
ALTER COLUMN "dateOfBirth" DROP NOT NULL,
ALTER COLUMN "gender" DROP NOT NULL,
ALTER COLUMN "placeOfBirth" DROP NOT NULL,
ALTER COLUMN "permanentAddress" DROP NOT NULL,
ALTER COLUMN "emergencyContactName" DROP NOT NULL,
ALTER COLUMN "relationship" DROP NOT NULL,
ALTER COLUMN "emergencyContactNumber" DROP NOT NULL,
ALTER COLUMN "parentGuardianName" DROP NOT NULL,
ALTER COLUMN "parentGuardianContact" DROP NOT NULL,
ALTER COLUMN "occupationType" DROP NOT NULL,
ALTER COLUMN "purposeOfStay" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "organizationId" TEXT NOT NULL,
ADD COLUMN     "plainTextPassword" TEXT;

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

-- CreateTable
CREATE TABLE "LeadNote" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "brandColor" TEXT,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceRequest" (
    "id" TEXT NOT NULL,
    "stayId" TEXT NOT NULL,
    "type" "ServiceRequestType" NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "metadata" JSONB,
    "status" "ServiceRequestStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "paymentId" TEXT,

    CONSTRAINT "ServiceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetUrl" TEXT,
    "referenceId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "dismissedFromHome" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "TicketPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "category" "TicketCategory" NOT NULL DEFAULT 'OTHER',
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TicketComment" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hostelId" TEXT,
    "eventType" "ActivityEventType" NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "subjectId" TEXT,
    "subjectType" TEXT,
    "metadata" JSONB,
    "targetUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodPricing" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "hostelId" TEXT,
    "breakfastPricePaise" INTEGER NOT NULL,
    "lunchPricePaise" INTEGER NOT NULL,
    "dinnerPricePaise" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,

    CONSTRAINT "FoodPricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodBillingCycle" (
    "id" TEXT NOT NULL,
    "stayId" TEXT NOT NULL,
    "cycleStart" TIMESTAMP(3) NOT NULL,
    "cycleEnd" TIMESTAMP(3) NOT NULL,
    "status" "FoodBillingCycleStatus" NOT NULL DEFAULT 'OPEN',
    "breakfastPricePaise" INTEGER NOT NULL,
    "lunchPricePaise" INTEGER NOT NULL,
    "dinnerPricePaise" INTEGER NOT NULL,
    "totalConsumedPaise" INTEGER,
    "totalPaidPaise" INTEGER,
    "settlementPaise" INTEGER,
    "closedAt" TIMESTAMP(3),
    "closedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodBillingCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodWalletTopUp" (
    "id" TEXT NOT NULL,
    "stayId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "paymentMode" "PaymentMode",
    "transactionRef" TEXT,
    "status" "TopUpStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "requestedByTenantUserId" TEXT,
    "approvedByUserId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodWalletTopUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodSettlementStatement" (
    "id" TEXT NOT NULL,
    "stayId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "totalConsumedPaise" INTEGER NOT NULL,
    "totalPaidPaise" INTEGER NOT NULL,
    "balancePaise" INTEGER NOT NULL,
    "outcome" "SettlementOutcome" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" TEXT NOT NULL,

    CONSTRAINT "FoodSettlementStatement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplementaryFoodOrder" (
    "id" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "forDate" TIMESTAMP(3) NOT NULL,
    "category" "ComplementaryOrderCategory" NOT NULL,
    "reason" TEXT NOT NULL,
    "breakfastQty" INTEGER NOT NULL DEFAULT 0,
    "lunchQty" INTEGER NOT NULL DEFAULT 0,
    "dinnerQty" INTEGER NOT NULL DEFAULT 0,
    "totalCostPaise" INTEGER NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplementaryFoodOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "assignedToWardenId" TEXT NOT NULL,
    "hostelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "deadline" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "completionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskComment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HostelPaymentConfig_hostelId_key" ON "HostelPaymentConfig"("hostelId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_name_key" ON "Location"("name");

-- CreateIndex
CREATE INDEX "LeadNote_leadId_idx" ON "LeadNote"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_domain_key" ON "Organization"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRequest_paymentId_key" ON "ServiceRequest"("paymentId");

-- CreateIndex
CREATE INDEX "ServiceRequest_stayId_status_idx" ON "ServiceRequest"("stayId", "status");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Ticket_hostelId_status_idx" ON "Ticket"("hostelId", "status");

-- CreateIndex
CREATE INDEX "Ticket_tenantId_idx" ON "Ticket"("tenantId");

-- CreateIndex
CREATE INDEX "ActivityLog_organizationId_createdAt_idx" ON "ActivityLog"("organizationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "ActivityLog_hostelId_createdAt_idx" ON "ActivityLog"("hostelId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "FoodPricing_organizationId_effectiveFrom_idx" ON "FoodPricing"("organizationId", "effectiveFrom" DESC);

-- CreateIndex
CREATE INDEX "FoodPricing_hostelId_effectiveFrom_idx" ON "FoodPricing"("hostelId", "effectiveFrom" DESC);

-- CreateIndex
CREATE INDEX "FoodBillingCycle_stayId_status_idx" ON "FoodBillingCycle"("stayId", "status");

-- CreateIndex
CREATE INDEX "FoodBillingCycle_cycleEnd_status_idx" ON "FoodBillingCycle"("cycleEnd", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FoodBillingCycle_stayId_cycleStart_key" ON "FoodBillingCycle"("stayId", "cycleStart");

-- CreateIndex
CREATE UNIQUE INDEX "FoodWalletTopUp_idempotencyKey_key" ON "FoodWalletTopUp"("idempotencyKey");

-- CreateIndex
CREATE INDEX "FoodWalletTopUp_stayId_cycleId_idx" ON "FoodWalletTopUp"("stayId", "cycleId");

-- CreateIndex
CREATE INDEX "FoodWalletTopUp_cycleId_status_idx" ON "FoodWalletTopUp"("cycleId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FoodSettlementStatement_cycleId_key" ON "FoodSettlementStatement"("cycleId");

-- CreateIndex
CREATE INDEX "FoodSettlementStatement_stayId_idx" ON "FoodSettlementStatement"("stayId");

-- CreateIndex
CREATE INDEX "ComplementaryFoodOrder_hostelId_forDate_idx" ON "ComplementaryFoodOrder"("hostelId", "forDate");

-- CreateIndex
CREATE INDEX "Task_organizationId_idx" ON "Task"("organizationId");

-- CreateIndex
CREATE INDEX "Task_assignedToWardenId_status_idx" ON "Task"("assignedToWardenId", "status");

-- CreateIndex
CREATE INDEX "Task_hostelId_idx" ON "Task"("hostelId");

-- CreateIndex
CREATE INDEX "Task_deadline_idx" ON "Task"("deadline");

-- CreateIndex
CREATE INDEX "TaskComment_organizationId_idx" ON "TaskComment"("organizationId");

-- CreateIndex
CREATE INDEX "TaskComment_taskId_idx" ON "TaskComment"("taskId");

-- CreateIndex
CREATE INDEX "Hostel_organizationId_idx" ON "Hostel"("organizationId");

-- CreateIndex
CREATE INDEX "Lead_organizationId_idx" ON "Lead"("organizationId");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hostel" ADD CONSTRAINT "Hostel_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hostel" ADD CONSTRAINT "Hostel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostelPaymentConfig" ADD CONSTRAINT "HostelPaymentConfig_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadNote" ADD CONSTRAINT "LeadNote_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadNote" ADD CONSTRAINT "LeadNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketComment" ADD CONSTRAINT "TicketComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodPricing" ADD CONSTRAINT "FoodPricing_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodPricing" ADD CONSTRAINT "FoodPricing_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodPricing" ADD CONSTRAINT "FoodPricing_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodBillingCycle" ADD CONSTRAINT "FoodBillingCycle_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodBillingCycle" ADD CONSTRAINT "FoodBillingCycle_closedByUserId_fkey" FOREIGN KEY ("closedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodWalletTopUp" ADD CONSTRAINT "FoodWalletTopUp_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodWalletTopUp" ADD CONSTRAINT "FoodWalletTopUp_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "FoodBillingCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodWalletTopUp" ADD CONSTRAINT "FoodWalletTopUp_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodSettlementStatement" ADD CONSTRAINT "FoodSettlementStatement_stayId_fkey" FOREIGN KEY ("stayId") REFERENCES "Stay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodSettlementStatement" ADD CONSTRAINT "FoodSettlementStatement_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "FoodBillingCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodSettlementStatement" ADD CONSTRAINT "FoodSettlementStatement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplementaryFoodOrder" ADD CONSTRAINT "ComplementaryFoodOrder_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplementaryFoodOrder" ADD CONSTRAINT "ComplementaryFoodOrder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedToWardenId_fkey" FOREIGN KEY ("assignedToWardenId") REFERENCES "Warden"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_hostelId_fkey" FOREIGN KEY ("hostelId") REFERENCES "Hostel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskComment" ADD CONSTRAINT "TaskComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
