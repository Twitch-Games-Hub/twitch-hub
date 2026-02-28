import { Router } from 'express';
import { prisma } from '../db/client.js';
import { authMiddleware } from '../auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  getUserById,
  getChannel,
  getStream,
  getFollowedChannels,
  getFollowedStreams,
  getFollowers,
  validateToken,
  refreshUserToken,
} from '../twitch/api.js';
import { logger } from '../logger.js';
import type { Request, Response } from 'express';
import type { ProfileData } from '@twitch-hub/shared-types';

const log = logger.child({ module: 'profile' });

export const profileRouter = Router();

profileRouter.use(authMiddleware);

async function getValidAccessToken(
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

// GET / — full profile data
profileRouter.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;

    const tokens = await getValidAccessToken(userId);
    if (!tokens) {
      res.status(401).json({ error: 'Unable to authenticate with Twitch' });
      return;
    }

    const { accessToken, twitchId } = tokens;

    const [
      userResult,
      channelResult,
      streamResult,
      followedResult,
      followedStreamsResult,
      followersResult,
      gamesResult,
    ] = await Promise.allSettled([
      getUserById(twitchId, accessToken),
      getChannel(twitchId, accessToken),
      getStream(twitchId, accessToken),
      getFollowedChannels(twitchId, accessToken),
      getFollowedStreams(twitchId, accessToken),
      getFollowers(twitchId, accessToken),
      prisma.game.findMany({
        where: { ownerId: userId },
        select: { id: true, title: true, type: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const games = gamesResult.status === 'fulfilled' ? gamesResult.value : [];

    // Sync profile image URL to DB when fresh Twitch data is available
    const twitchUser = userResult.status === 'fulfilled' ? userResult.value : null;
    if (twitchUser?.profile_image_url) {
      await prisma.user.update({
        where: { id: userId },
        data: { profileImageUrl: twitchUser.profile_image_url },
      });
    }

    const profileData: ProfileData = {
      twitchUser,
      channel: channelResult.status === 'fulfilled' ? channelResult.value : null,
      stream: streamResult.status === 'fulfilled' ? streamResult.value : null,
      followed: followedResult.status === 'fulfilled' ? followedResult.value : null,
      followedStreams:
        followedStreamsResult.status === 'fulfilled' ? followedStreamsResult.value : null,
      followers: followersResult.status === 'fulfilled' ? followersResult.value : null,
      appStats: {
        games: games.map((g) => ({
          id: g.id,
          title: g.title,
          type: g.type,
          status: g.status,
          createdAt: g.createdAt.toISOString(),
        })),
        gameCount: games.length,
      },
    };

    res.json(profileData);
  }),
);

// GET /followed?after=CURSOR — paginate followed channels
profileRouter.get(
  '/followed',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;

    const tokens = await getValidAccessToken(userId);
    if (!tokens) {
      res.status(401).json({ error: 'Unable to authenticate with Twitch' });
      return;
    }

    const after = req.query.after as string | undefined;
    const data = await getFollowedChannels(tokens.twitchId, tokens.accessToken, 20, after);
    res.json(data);
  }),
);

// GET /followers?after=CURSOR — paginate followers
profileRouter.get(
  '/followers',
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.userId!;

    const tokens = await getValidAccessToken(userId);
    if (!tokens) {
      res.status(401).json({ error: 'Unable to authenticate with Twitch' });
      return;
    }

    const after = req.query.after as string | undefined;
    const data = await getFollowers(tokens.twitchId, tokens.accessToken, 20, after);
    res.json(data);
  }),
);
