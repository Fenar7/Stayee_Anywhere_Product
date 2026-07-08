import { ActivityEventType } from "@prisma/client";

export function formatActivityAction(eventType: ActivityEventType): string {
  switch (eventType) {
    case ActivityEventType.TENANT_ONBOARDING_STARTED:
      return "started onboarding for";
    case ActivityEventType.TENANT_ONBOARDED:
      return "completed onboarding for";
    case ActivityEventType.TENANT_PAYMENT_RECEIVED:
      return "recorded payment from";
    case ActivityEventType.TENANT_CHECKED_OUT:
      return "checked out";
    case ActivityEventType.STAY_STATUS_CHANGED:
      return "updated stay status for";
    case ActivityEventType.TICKET_RAISED:
      return "raised a ticket for";
    case ActivityEventType.TICKET_STATUS_UPDATED:
      return "updated ticket status for";
    case ActivityEventType.TICKET_COMMENT_ADDED:
      return "commented on ticket";
    case ActivityEventType.FOOD_ORDER_UPDATED:
      return "updated food order for";
    case ActivityEventType.SERVICE_REQUEST_CREATED:
      return "created service request for";
    case ActivityEventType.SERVICE_REQUEST_RESOLVED:
      return "resolved service request for";
    case ActivityEventType.FOOD_CYCLE_CLOSED:
      return "closed food cycle for";
    case ActivityEventType.FOOD_WALLET_TOPPED_UP:
      return "topped up food wallet for";
    case ActivityEventType.FOOD_WALLET_TOPUP_REJECTED:
      return "rejected food wallet top-up for";
    case ActivityEventType.FOOD_COMPLEMENTARY_ORDER_CREATED:
      return "created a complementary food order for";
    default:
      return "performed action on";
  }
}
