import { ActivityLog } from "@prisma/client";

export interface ActivityChannelParams {
  organizationId: string;
  hostelId?: string;
}

/**
 * [MIGRATION NOTE - V3] 
 * Supabase Realtime WebSockets have been temporarily disabled for the AWS MVP.
 * AWS RDS does not support native PostgreSQL LISTEN/NOTIFY over websockets 
 * without additional infrastructure (like AWS IoT Core or AppSync).
 * 
 * For now, this returns a dummy channel. The frontend will rely on standard
 * Next.js data fetching (refreshing the page) to see new activities.
 */
export function createActivityChannel(
  supabase: any,
  params: ActivityChannelParams,
  onInsert: (item: any) => void
): any {
  console.warn("Activity Feed WebSockets are disabled in AWS. Returning dummy channel.");
  
  // Return a mock channel object that won't break the frontend's unsubscribe() calls
  return {
    on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
    subscribe: () => ({ unsubscribe: () => {} }),
    unsubscribe: () => {}
  };
}
