import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Twitch Hub',
  description: 'Interactive Twitch games and polls for streamers',
  base: '/twitch-hub/',
  vite: {
    server: {
      port: 5174,
    },
  },
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/streamer-setup' },
      { text: 'Development', link: '/dev/getting-started' },
      { text: 'API', link: '/api/rest' },
      { text: 'Games', link: '/games/hot-take' },
    ],
    sidebar: {
      '/dev/': [
        {
          text: 'Development',
          items: [
            { text: 'Getting Started', link: '/dev/getting-started' },
            { text: 'Architecture', link: '/dev/architecture' },
            { text: 'Contributing', link: '/dev/contributing' },
            { text: 'Deployment', link: '/dev/deployment' },
          ],
        },
      ],
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Streamer Setup', link: '/guide/streamer-setup' },
            { text: 'Overlay Setup', link: '/guide/overlay-setup' },
            { text: 'Chat Commands', link: '/guide/chat-commands' },
            { text: 'Ranking Game', link: '/guide/ranking-game' },
            { text: 'Moderators & Invites', link: '/guide/moderators-and-invites' },
            { text: 'Viewer Engagement', link: '/guide/viewer-engagement' },
            { text: 'Gamification', link: '/guide/gamification' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'REST API', link: '/api/rest' },
            { text: 'Socket Events', link: '/api/socket-events' },
            { text: 'Shared Types', link: '/api/shared-types' },
          ],
        },
      ],
      '/games/': [
        {
          text: 'Game Types',
          items: [
            { text: 'Hot Take', link: '/games/hot-take' },
            { text: 'Balance', link: '/games/balance' },
            { text: 'Blind Test', link: '/games/blind-test' },
            { text: 'Ranking', link: '/guide/ranking-game' },
          ],
        },
      ],
    },
    socialLinks: [{ icon: 'github', link: 'https://github.com/your-org/twitch-hub' }],
  },
});
