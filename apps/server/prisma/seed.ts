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
        'https://static-cdn.jtvnw.net/user-default-pictures-uv/998f01ae-def8-11e9-b95c-784f43822e80-profile_image-300x300.png',
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
    {
      ownerId: user.id,
      type: 'RANKING' as const,
      title: 'Il Miglior Film di Aldo, Giovanni e Giacomo',
      description:
        'Torneo a eliminazione diretta: 16 film si sfidano testa a testa. Il pubblico vota e il vincitore avanza fino alla finale!',
      coverImageUrl: 'https://pad.mymovies.it/filmclub/2022/07/011/locandina.jpg',
      status: 'READY' as const,
      config: {
        items: [
          {
            id: 'agg-01',
            name: 'Tre uomini e una gamba',
            imageUrl: 'https://pad.mymovies.it/filmclub/2005/02/007/locandina.jpg',
          },
          {
            id: 'agg-02',
            name: "Cosi' e' la vita",
            imageUrl: 'https://pad.mymovies.it/filmclub/2005/04/068/locandina.jpg',
          },
          {
            id: 'agg-03',
            name: 'Chiedimi se sono felice',
            imageUrl: 'https://pad.mymovies.it/filmclub/2005/01/060/locandina.jpg',
          },
          {
            id: 'agg-04',
            name: 'La leggenda di Al, John e Jack',
            imageUrl: 'https://pad.mymovies.it/filmclub/2005/01/596/locandina.jpg',
          },
          {
            id: 'agg-05',
            name: 'Tu la conosci Claudia?',
            imageUrl: 'https://pad.mymovies.it/filmclub/2004/09/048/locandina.jpg',
          },
          {
            id: 'agg-06',
            name: "Il cosmo sul como'",
            imageUrl: 'https://pad.mymovies.it/filmclub/2005/07/039/locandina.jpg',
          },
          {
            id: 'agg-07',
            name: 'Anplagghed al cinema',
            imageUrl: 'https://pad.mymovies.it/filmclub/2006/10/107/locandina.jpg',
          },
          {
            id: 'agg-08',
            name: 'La banda dei Babbi Natale',
            imageUrl: 'https://pad.mymovies.it/filmclub/2010/12/072/locandina.jpg',
          },
          {
            id: 'agg-09',
            name: 'Il ricco, il povero e il maggiordomo',
            imageUrl: 'https://pad.mymovies.it/filmclub/2014/12/049/locandina.jpg',
          },
          {
            id: 'agg-10',
            name: 'Fuga da Reuma Park',
            imageUrl: 'https://pad.mymovies.it/filmclub/2016/11/236/locandina.jpg',
          },
          {
            id: 'agg-11',
            name: "Odio l'estate",
            imageUrl: 'https://pad.mymovies.it/filmclub/2020/01/068/locandina.jpg',
          },
          {
            id: 'agg-12',
            name: "Il 7 e l'8",
            imageUrl: 'https://pad.mymovies.it/filmclub/2007/12/072/locandina.jpg',
          },
          {
            id: 'agg-13',
            name: 'Ammutta Muddica',
          },
          {
            id: 'agg-14',
            name: 'Pdor',
          },
          {
            id: 'agg-15',
            name: 'I corti',
          },
          {
            id: 'agg-16',
            name: 'Deejay Television (sketch)',
          },
        ],
        bracketSize: 16,
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
