import { prisma } from '../db/client.js';
import { validateToken, refreshUserToken } from './api.js';
import { logger } from '../logger.js';

const log = logger.child({ module: 'twitch-tokens' });

export async function getValidAccessToken(
  userId: string,
): Promise<{ accessToken: string; twitchId: string } | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  let { accessToken } = user;
  const { refreshToken, twitchId } = user;

  const isValid = await validateToken(accessToken);
  if (!isValid) {
    try {
      const refreshed = await refreshUserToken(refreshToken);
      accessToken = refreshed.access_token;
      await prisma.user.update({
        where: { id: userId },
        data: {
          accessToken: refreshed.access_token,
          refreshToken: refreshed.refresh_token,
          tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
        },
      });
    } catch (err) {
      log.error({ err, userId }, 'Failed to refresh token');
      return null;
    }
  }

  return { accessToken, twitchId };
}
