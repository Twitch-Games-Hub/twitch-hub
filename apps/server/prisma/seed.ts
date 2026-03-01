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

  // 3. Create example games for all 4 game types
  const games = [
    // --- Hot Take Meter ---
    {
      ownerId: user.id,
      type: 'HOT_TAKE' as const,
      title: 'Hot Take Meter: Video Games',
      description:
        'Ten spicy gaming opinions — rate each from 1 (strongly disagree) to 10 (strongly agree)!',
      status: 'READY' as const,
      config: {
        statements: [
          'The Witcher 3 is overrated',
          'Mobile gaming is real gaming',
          'Single-player games are better than multiplayer',
          'Graphics matter more than gameplay',
          'Microtransactions have ruined modern gaming',
          'Retro games are better than modern games',
          'Open-world games are too bloated',
          'PC gaming is superior to console gaming',
          'Dark Souls difficulty is perfect and should not have an easy mode',
          'Minecraft is the greatest game ever made',
        ],
        roundDurationSec: 30,
      },
    },

    // --- Balance Game ---
    {
      ownerId: user.id,
      type: 'BALANCE' as const,
      title: 'Would You Rather: Superpowers',
      description: 'Impossible choices between amazing superpowers. Pick your side!',
      status: 'READY' as const,
      config: {
        questions: [
          { optionA: 'Fly anywhere', optionB: 'Teleport instantly' },
          { optionA: 'Read minds', optionB: 'Be invisible' },
          { optionA: 'Super strength', optionB: 'Super speed' },
          { optionA: 'Control time', optionB: 'Control weather' },
          { optionA: 'Talk to animals', optionB: 'Speak every language' },
          { optionA: 'Never need sleep', optionB: 'Never need food' },
          { optionA: 'Breathe underwater', optionB: 'Survive in space' },
          { optionA: 'See the future', optionB: 'Change the past' },
        ],
        roundDurationSec: 20,
      },
    },

    // --- Blind Test ---
    {
      ownerId: user.id,
      type: 'BLIND_TEST' as const,
      title: 'Guess the Movie',
      description:
        'Progressive hints reveal a famous movie — type your guess before time runs out!',
      status: 'READY' as const,
      config: {
        rounds: [
          {
            answer: 'Inception',
            hints: [
              'Released in 2010',
              'Directed by Christopher Nolan',
              'Features a spinning top',
              'Dreams within dreams',
            ],
          },
          {
            answer: 'The Matrix',
            hints: [
              'Released in 1999',
              'Features a red and blue pill',
              'Popularized bullet-time effects',
              '"There is no spoon"',
            ],
          },
          {
            answer: 'Jurassic Park',
            hints: [
              'Based on a Michael Crichton novel',
              'Directed by Steven Spielberg',
              'Set on a tropical island theme park',
              '"Life finds a way"',
            ],
          },
          {
            answer: 'The Lion King',
            hints: [
              'Disney animated classic from 1994',
              'Set in the African savanna',
              'Features the song "Hakuna Matata"',
              'A young prince must reclaim his throne',
            ],
          },
          {
            answer: 'Titanic',
            hints: [
              'Won 11 Academy Awards',
              'Directed by James Cameron',
              'Features a famous "flying" scene at the bow',
              '"I\'m the king of the world!"',
            ],
          },
          {
            answer: 'Star Wars',
            hints: [
              'Created by George Lucas',
              'Features lightsabers and the Force',
              '"May the Force be with you"',
              'Luke Skywalker is the main hero',
            ],
          },
          {
            answer: 'The Shawshank Redemption',
            hints: [
              'Based on a Stephen King novella',
              'Set in a prison in Maine',
              'Features Morgan Freeman as narrator',
              '"Get busy living, or get busy dying"',
            ],
          },
          {
            answer: 'Back to the Future',
            hints: [
              'Features a time-traveling DeLorean',
              'Released in 1985',
              'Needs 1.21 gigawatts of power',
              'Marty McFly and Doc Brown',
            ],
          },
        ],
        answerWindowSec: 20,
      },
    },

    // --- Ranking Tournament ---
    {
      ownerId: user.id,
      type: 'RANKING' as const,
      title: 'Greatest Video Game of All Time',
      description:
        'Sixteen iconic games battle head-to-head in a bracket tournament. Vote for your favorite each round!',
      status: 'READY' as const,
      config: {
        items: [
          { id: 'game-01', name: 'The Legend of Zelda: Ocarina of Time' },
          { id: 'game-02', name: 'Super Mario Bros.' },
          { id: 'game-03', name: 'Minecraft' },
          { id: 'game-04', name: 'Tetris' },
          { id: 'game-05', name: 'The Witcher 3: Wild Hunt' },
          { id: 'game-06', name: 'Grand Theft Auto V' },
          { id: 'game-07', name: 'Portal 2' },
          { id: 'game-08', name: 'Dark Souls' },
          { id: 'game-09', name: 'Half-Life 2' },
          { id: 'game-10', name: 'Red Dead Redemption 2' },
          { id: 'game-11', name: 'Chrono Trigger' },
          { id: 'game-12', name: 'Super Smash Bros. Ultimate' },
          { id: 'game-13', name: 'The Last of Us' },
          { id: 'game-14', name: 'Elden Ring' },
          { id: 'game-15', name: 'Halo: Combat Evolved' },
          { id: 'game-16', name: 'Pokémon Red & Blue' },
        ],
        bracketSize: 16,
        roundDurationSec: 25,
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
