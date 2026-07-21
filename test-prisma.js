const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://postgres:Stayee7865@localhost:5432/staye_db?sslmode=require' } } });
prisma.$connect().then(() => { console.log('Connected!'); prisma.$disconnect(); }).catch(e => { console.error('Error:', e.message); prisma.$disconnect(); });