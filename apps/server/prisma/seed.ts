import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://twitch_hub:twitch_hub@localhost:5432/twitch_hub';

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_TWITCH_ID = 'seed-demo-streamer';

async function main() {
  // 1. Upsert demo streamer
  const user = await prisma.user.upsert({
    where: { twitchId: DEMO_TWITCH_ID },
    update: {},
    create: {
      twitchId: DEMO_TWITCH_ID,
      twitchLogin: 'twitchhub_demo',
      displayName: 'TwitchHub Demo',
      accessToken: 'seed-token',
      refreshToken: 'seed-refresh',
      tokenExpiresAt: new Date('2099-01-01'),
      role: 'STREAMER',
      profileImageUrl:
        'https://static-cdn.jtvnw.net/user-default-pictures-uv/cdd517fe-def4-11e9-948e-784f43822e80-profile_image-300x300.png',
    },
  });

  // 2. Clean previous seed data
  await prisma.game.deleteMany({ where: { ownerId: user.id } });

  // 3. Create games
  const games = [
    {
      ownerId: user.id,
      type: 'HOT_TAKE' as const,
      title: 'Hot Take Meter: Film di Aldo, Giovanni e Giacomo',
      description:
        "Dieci opinioni taglienti sulla filmografia di Aldo, Giovanni e Giacomo. Quanto sei d'accordo da 1 a 10?",
      coverImageUrl: 'https://pad.mymovies.it/filmclub/2022/07/011/locandina.jpg',
      status: 'READY' as const,
      config: {
        statements: [
          '"Tre uomini e una gamba" e\' il loro miglior film in assoluto',
          '"Chiedimi se sono felice" e\' sopravvalutato',
          "I film dopo il 2010 non sono all'altezza dei classici",
          '"La leggenda di Al, John e Jack" e\' sottovalutato',
          'La scena del "tavolino" e\' la piu\' divertente del cinema italiano',
          "\"Cosi' e' la vita\" e' piu' profondo di quanto sembri",
          "Aldo e' il piu' divertente dei tre",
          '"Il cosmo sul como\'" e\' il loro peggior film',
          '"La banda dei Babbi Natale" e\' il miglior film di Natale italiano',
          '"Odio l\'estate" dimostra che il trio funziona ancora',
        ],
        roundDurationSec: 30,
      },
    },
  ];

  await prisma.game.createMany({ data: games });

  console.log(`Seeded ${games.length} games for user ${user.displayName}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
