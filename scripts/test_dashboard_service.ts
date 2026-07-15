
import { prisma } from '../lib/db';
import { BedStatus, StayStatus, PaymentStatus } from '@prisma/client';

export async function test() {
  const hostels = await prisma.hostel.findMany({
    select: {
      id: true,
      floors: {
        select: {
          rooms: { select: { beds: { select: { status: true } } } },
          flats: {
            select: {
              rooms: { select: { beds: { select: { status: true } } } }
            }
          }
        }
      }
    }
  });

  const stayStats = await prisma.stay.groupBy({
    by: ['hostelId', 'status'],
    _count: { _all: true },
  });

  console.log(JSON.stringify(stayStats, null, 2));
  console.log('Hostel 0 floors[0] beds:', hostels[0]?.floors[0]?.rooms[0]?.beds);
}
test().catch(console.error);

