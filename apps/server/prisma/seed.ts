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
      profileImageUrl: 'https://static-cdn.jtvnw.net/jtv_user_pictures/placeholder.png',
    },
  });

  // 2. Clean previous seed data
  await prisma.game.deleteMany({ where: { ownerId: user.id } });

  // 3. Create 9 games
  const games = [
    // ── HOT_TAKE games ──────────────────────────────────────
    {
      ownerId: user.id,
      type: 'HOT_TAKE' as const,
      title: 'Opinioni Scottanti sullo Streaming Italiano',
      description:
        "Otto affermazioni controverse sul mondo dello streaming italiano. Quanto sei d'accordo da 1 a 10?",
      status: 'READY' as const,
      config: {
        statements: [
          'Le live notturne dopo mezzanotte sono le migliori',
          'Uno streamer italiano dovrebbe streamare solo in italiano',
          "Le IRL stream sono piu' interessanti delle live gaming",
          "Il raid a fine live e' il gesto piu' bello della community",
          'Gli streamer dovrebbero mostrare sempre il contatore viewer',
          'Le reaction ai video sono contenuti pigri',
          "Twitch Italia crescera' piu' di YouTube Gaming nei prossimi anni",
          'Le subathon sono diventate troppo frequenti',
        ],
        roundDurationSec: 30,
      },
    },
    {
      ownerId: user.id,
      type: 'HOT_TAKE' as const,
      title: 'Hot Take: Cibo Italiano',
      description: 'Dieci opinioni scottanti sulla cucina italiana. Riesci a mantenere la calma?',
      status: 'READY' as const,
      config: {
        statements: [
          "La carbonara con la panna e' un crimine",
          "La pizza napoletana e' sopravvalutata",
          "Il cappuccino dopo le 11 e' accettabile",
          "L'ananas sulla pizza non e' poi cosi' male",
          "La pasta al dente e' l'unico modo corretto",
          "Il panettone e' superiore al pandoro",
          'La mozzarella di bufala batte qualsiasi altro formaggio',
          "Il caffe' del bar e' sempre meglio di quello a casa",
          "La nutella e' il miglior prodotto italiano",
          'Il ragù bolognese non va mai con gli spaghetti',
        ],
        roundDurationSec: 30,
      },
    },
    {
      ownerId: user.id,
      type: 'HOT_TAKE' as const,
      title: 'Stereotipi Regionali: Quanto Sono Veri?',
      description: 'Otto stereotipi sulle regioni italiane. Quanto ci credi davvero?',
      status: 'READY' as const,
      config: {
        statements: [
          "I napoletani sono i piu' calorosi d'Italia",
          'I milanesi pensano solo al lavoro',
          "I romani sono i piu' simpatici",
          "I sardi hanno il senso dell'ospitalita' piu' forte",
          'I siciliani fanno la migliore granita del mondo',
          "I toscani hanno il miglior senso dell'umorismo",
          "I veneti sono i piu' lavoratori del nord",
          "I pugliesi hanno il mare piu' bello d'Italia",
        ],
        roundDurationSec: 30,
      },
    },
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

    // ── BALANCE games ───────────────────────────────────────
    {
      ownerId: user.id,
      type: 'BALANCE' as const,
      title: 'Dilemmi da Streamer Italiano',
      description: 'Sei dilemmi che ogni streamer italiano deve affrontare. Tu cosa scegli?',
      status: 'READY' as const,
      config: {
        questions: [
          { optionA: 'Fare live tutti i giorni 2h', optionB: 'Fare live 3 volte a settimana 5h' },
          { optionA: 'Avere 100 viewer fedeli', optionB: 'Avere 1000 viewer casuali' },
          { optionA: 'Solo Just Chatting per sempre', optionB: 'Solo gaming per sempre' },
          { optionA: 'Collaborare con il tuo rivale', optionB: 'Streamare da solo per un anno' },
          {
            optionA: 'Perdere tutti i follower e ricominciare',
            optionB: 'Non poter mai cambiare categoria',
          },
          { optionA: 'Chat in sub-only per sempre', optionB: 'Chat senza moderazione per sempre' },
        ],
        roundDurationSec: 30,
      },
    },
    {
      ownerId: user.id,
      type: 'BALANCE' as const,
      title: 'Dilemmi della Cucina Italiana',
      description: 'Otto scelte impossibili sulla cucina italiana. Da che parte stai?',
      status: 'READY' as const,
      config: {
        questions: [
          { optionA: 'Carbonara', optionB: 'Amatriciana' },
          { optionA: 'Panettone', optionB: 'Pandoro' },
          { optionA: 'Pizza margherita', optionB: 'Pizza marinara' },
          { optionA: 'Pasta al forno', optionB: 'Lasagna' },
          { optionA: 'Gelato artigianale', optionB: 'Granita siciliana' },
          { optionA: 'Espresso', optionB: "Caffe' moka" },
          { optionA: 'Tiramisù', optionB: 'Panna cotta' },
          { optionA: 'Focaccia ligure', optionB: 'Piadina romagnola' },
        ],
        roundDurationSec: 30,
      },
    },
    {
      ownerId: user.id,
      type: 'BALANCE' as const,
      title: 'Gaming: Cosa Preferisci?',
      description: 'Sette dilemmi per veri gamer. Non puoi scegliere entrambi!',
      status: 'READY' as const,
      config: {
        questions: [
          { optionA: 'PC Master Race', optionB: 'Console per sempre' },
          { optionA: 'Single player epico', optionB: 'Multiplayer competitivo' },
          { optionA: 'Grafica next-gen', optionB: 'Gameplay perfetto con grafica retro' },
          { optionA: 'Dark Souls senza morire', optionB: 'Speedrun di Mario in 10 minuti' },
          { optionA: 'Solo giochi indie', optionB: 'Solo tripla A' },
          { optionA: 'Controller', optionB: 'Mouse e tastiera' },
          { optionA: 'Giocare la sera tardi', optionB: 'Giocare la mattina presto' },
        ],
        roundDurationSec: 30,
      },
    },

    // ── BLIND_TEST games ────────────────────────────────────
    {
      ownerId: user.id,
      type: 'BLIND_TEST' as const,
      title: 'Indovina la Hit Italiana',
      description: 'Sei round di musica italiana. Riesci a indovinare la canzone dagli indizi?',
      status: 'READY' as const,
      config: {
        rounds: [
          {
            answer: 'Soldi',
            hints: ['Mahmood', 'Sanremo 2019', 'Eurovision secondo posto'],
          },
          {
            answer: 'Zitti e buoni',
            hints: ['Maneskin', 'Sanremo 2021', 'Vittoria Eurovision'],
          },
          {
            answer: 'Rolls Royce',
            hints: ['Achille Lauro', 'Sanremo 2019', 'Spogliarello sul palco'],
          },
          {
            answer: 'Musica leggerissima',
            hints: ['Colapesce e Dimartino', 'Sanremo 2021', 'Tormentone estivo'],
          },
          {
            answer: 'Volare',
            hints: ['Domenico Modugno', '1958', 'Nel blu dipinto di blu'],
          },
          {
            answer: "L'essenziale",
            hints: ['Marco Mengoni', 'Sanremo 2013', 'Eurovision settimo posto'],
          },
        ],
        answerWindowSec: 30,
      },
    },
    {
      ownerId: user.id,
      type: 'BLIND_TEST' as const,
      title: 'Indovina il Videogioco dalla Descrizione',
      description: 'Sette videogiochi iconici descritti in modo criptico. Li riconosci tutti?',
      status: 'READY' as const,
      config: {
        rounds: [
          {
            answer: 'Minecraft',
            hints: ['Blocchi cubici', 'Creeper', 'Costruisci e sopravvivi'],
          },
          {
            answer: 'Dark Souls',
            hints: ['You Died', "Falo' di riposo", 'Preparati a morire'],
          },
          {
            answer: 'Among Us',
            hints: ["Impostore tra l'equipaggio", 'Emergenza!', 'Sus'],
          },
          {
            answer: 'The Legend of Zelda',
            hints: ['Il protagonista NON si chiama Zelda', 'Triforza', 'Hyrule'],
          },
          {
            answer: 'GTA V',
            hints: ['Los Santos', 'Tre protagonisti', 'Online ancora attivo dopo anni'],
          },
          {
            answer: 'Fortnite',
            hints: ['Battle Royale', 'Costruzioni', 'Balletti virali'],
          },
          {
            answer: 'League of Legends',
            hints: ['MOBA', 'Campioni e lane', "La chat piu' tossica del gaming"],
          },
        ],
        answerWindowSec: 30,
      },
    },
    {
      ownerId: user.id,
      type: 'BLIND_TEST' as const,
      title: 'Frasi Celebri: Cinema Italiano',
      description: 'Cinque citazioni iconiche del cinema italiano. Da quale film vengono?',
      status: 'DRAFT' as const,
      config: {
        rounds: [
          {
            answer: "La vita e' bella",
            hints: [
              'Roberto Benigni',
              '"Buongiorno, principessa!"',
              'Oscar miglior film straniero 1999',
            ],
          },
          {
            answer: 'Il Padrino',
            hints: [
              'Famiglia Corleone',
              "\"Gli faro' un'offerta che non potra' rifiutare\"",
              'Marlon Brando',
            ],
          },
          {
            answer: 'Perfetti sconosciuti',
            hints: ['Cena tra amici', 'Telefoni sul tavolo', "Film piu' rifatto al mondo"],
          },
          {
            answer: 'Nuovo Cinema Paradiso',
            hints: ['Giuseppe Tornatore', 'Sala cinematografica in Sicilia', 'Ennio Morricone'],
          },
          {
            answer: 'La grande bellezza',
            hints: ['Paolo Sorrentino', 'Roma notturna', 'Oscar miglior film straniero 2014'],
          },
        ],
        answerWindowSec: 30,
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
