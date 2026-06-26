import { prisma } from "@/lib/db";

export async function createNotification({
  userId,
  title,
  message,
  type,
}: {
  userId: string;
  title: string;
  message: string;
  type: string;
}) {
  return prisma.notification.create({
    data: {
      userId,
      title,
      message,
      type,
    },
  });
}
