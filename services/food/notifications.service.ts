/**
 * Mock Notification Service for Food Billing Module.
 * In production, this would integrate with AWS SNS, Twilio, or Firebase Cloud Messaging.
 */

export class FoodNotificationService {
  static async notifyTenantTopUpApproved(topUpId: string) {
    console.log(`[Notification] Tenant wallet top-up APPROVED for topUpId: ${topUpId}`);
    // TODO: Fetch tenant phone number and send SMS
  }

  static async notifyTenantTopUpRejected(topUpId: string) {
    console.log(`[Notification] Tenant wallet top-up REJECTED for topUpId: ${topUpId}`);
    // TODO: Fetch tenant phone number and send SMS
  }

  static async notifyAdminComplementaryOrder(orderId: string, hostelId: string) {
    console.log(`[Notification] WARDEN created a complementary order (${orderId}) in hostel ${hostelId}. Alerting MAIN_ADMINs.`);
    // TODO: Send in-app notification or email to all MAIN_ADMINs of the organization
  }

  static async notifyTenantCycleSettled(cycleId: string, balancePaise: number, outcome: string) {
    console.log(`[Notification] Cycle ${cycleId} settled. Outcome: ${outcome}, Balance: ${balancePaise}`);
    // TODO: Send SMS/Email to tenant
  }

  static async notifyHostelSettlementSummary(hostelId: string, successCount: number, failedCount: number) {
    console.log(`[Notification] Hostel ${hostelId} settlement completed. Success: ${successCount}, Failed: ${failedCount}`);
    // TODO: Send summary email/alert to hostel wardens and admins
  }
}
