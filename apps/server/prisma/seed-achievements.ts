import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://twitch_hub:twitch_hub@localhost:5432/twitch_hub';

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const achievements = [
  // Participation
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Complete your first game session',
    category: 'PARTICIPATION' as const,
    xpReward: 25,
    hidden: false,
    sortOrder: 1,
  },
  {
    id: 'regular',
    name: 'Regular',
    description: 'Complete 10 game sessions',
    category: 'PARTICIPATION' as const,
    xpReward: 50,
    hidden: false,
    sortOrder: 2,
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Complete 50 game sessions',
    category: 'PARTICIPATION' as const,
    xpReward: 100,
    hidden: false,
    sortOrder: 3,
  },
  {
    id: 'centurion',
    name: 'Centurion',
    description: 'Complete 100 game sessions',
    category: 'PARTICIPATION' as const,
    xpReward: 250,
    hidden: false,
    sortOrder: 4,
  },

  // Skill
  {
    id: 'on_fire',
    name: 'On Fire',
    description: 'Get a 5-answer streak in a single session',
    category: 'SKILL' as const,
    xpReward: 50,
    hidden: false,
    sortOrder: 10,
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Get a 10-answer streak in a single session',
    category: 'SKILL' as const,
    xpReward: 150,
    hidden: false,
    sortOrder: 11,
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Earn 5 speed bonuses in a single session',
    category: 'SKILL' as const,
    xpReward: 75,
    hidden: false,
    sortOrder: 12,
  },
  {
    id: 'perfect_game',
    name: 'Perfect Game',
    description: 'Answer every question correctly in a BlindTest session',
    category: 'SKILL' as const,
    xpReward: 200,
    hidden: false,
    sortOrder: 13,
  },
  {
    id: 'crowd_reader',
    name: 'Crowd Reader',
    description: 'Vote with the majority 10 times in a row',
    category: 'SKILL' as const,
    xpReward: 100,
    hidden: false,
    sortOrder: 14,
  },

  // Social
  {
    id: 'channel_regular',
    name: 'Channel Regular',
    description: 'Reach Regular loyalty tier in any channel',
    category: 'SOCIAL' as const,
    xpReward: 50,
    hidden: false,
    sortOrder: 20,
  },
  {
    id: 'superfan',
    name: 'Superfan',
    description: 'Reach Superfan loyalty tier in any channel',
    category: 'SOCIAL' as const,
    xpReward: 200,
    hidden: false,
    sortOrder: 21,
  },
  {
    id: 'channel_surfer',
    name: 'Channel Surfer',
    description: 'Play in 5 or more different channels',
    category: 'SOCIAL' as const,
    xpReward: 75,
    hidden: false,
    sortOrder: 22,
  },

  // Rare (hidden)
  {
    id: 'night_owl',
    name: 'Night Owl',
    description: 'Play a session between 2 AM and 5 AM',
    category: 'RARE' as const,
    xpReward: 100,
    hidden: true,
    sortOrder: 30,
  },
  {
    id: 'full_house',
    name: 'Full House',
    description: 'Be in a session with 100+ participants',
    category: 'RARE' as const,
    xpReward: 150,
    hidden: true,
    sortOrder: 31,
  },
];

async function main() {
  for (const achievement of achievements) {
    await prisma.achievementDefinition.upsert({
      where: { id: achievement.id },
      update: {
        name: achievement.name,
        description: achievement.description,
        category: achievement.category,
        xpReward: achievement.xpReward,
        hidden: achievement.hidden,
        sortOrder: achievement.sortOrder,
      },
      create: achievement,
    });
  }

  console.log(`Seeded ${achievements.length} achievement definitions`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
