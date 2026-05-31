import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const project = await prisma.project.upsert({
    where: { id: 'seed-webopedia-seo' },
    update: {},
    create: {
      id: 'seed-webopedia-seo',
      name: 'Webopedia SEO',
      domain: 'webopedia.com',
      description: 'Seed project for local SEO intelligence workflows.',
      keywords: {
        create: [
          { keyword: 'what is seo', intent: 'informational', volume: 12000, difficulty: 42 },
          { keyword: 'keyword research tools', intent: 'commercial', volume: 8100, difficulty: 57 },
        ],
      },
      competitors: {
        create: [
          { domain: 'semrush.com', name: 'Semrush' },
          { domain: 'ahrefs.com', name: 'Ahrefs' },
        ],
      },
    },
  });

  console.log(`Seeded project: ${project.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
