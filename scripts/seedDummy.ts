import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
    console.log('Seeding minimal demo data...');
    try {
        const created = await prisma.subscription.create({
            data: {
                calendarId: 'demo-calendar',
                eventId: 'demo-event',
                destination: 'test@example.com',
                destinationType: 'Email',
                sent: false,
            } as any,
        });
        console.log('Created Subscription:', created);
    } catch (err: any) {
        console.error('Seed failed (models may not exist or DB not ready):', err.message || err);
    } finally {
        await prisma.$disconnect();
    }
}

seed();
