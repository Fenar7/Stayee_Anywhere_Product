import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const user = await prisma.user.findFirst({ where: { role: 'MAIN_ADMIN' } })
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordSetAt: null }
    })
    console.log("Updated admin passwordSetAt to null")
  }
}
main()
