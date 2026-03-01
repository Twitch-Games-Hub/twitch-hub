import { GameType, type FinalResults } from '@twitch-hub/shared-types';
import type { GameEngine } from './GameEngine.js';
import { HotTakeGame } from './types/HotTakeGame.js';
import { BalanceGame } from './types/BalanceGame.js';
import { BlindTestGame } from './types/BlindTestGame.js';
import { RankingGame } from './types/RankingGame.js';
import { prisma } from '../db/client.js';
import { logger } from '../logger.js';

const log = logger.child({ module: 'registry' });

type GameRecord = {
  id: string;
  type: string;
  config: unknown;
  title: string;
  coverImageUrl?: string | null;
};

const engineMap: Record<string, new (sessionId: string, config: never) => GameEngine> = {
  [GameType.HOT_TAKE]: HotTakeGame as unknown as new (
    sessionId: string,
    config: never,
  ) => GameEngine,
  [GameType.BALANCE]: BalanceGame as unknown as new (
    sessionId: string,
    config: never,
  ) => GameEngine,
  [GameType.BLIND_TEST]: BlindTestGame as unknown as new (
    sessionId: string,
    config: never,
  ) => GameEngine,
  [GameType.RANKING]: RankingGame as unknown as new (
    sessionId: string,
    config: never,
  ) => GameEngine,
};

class GameRegistryClass {
  private engines = new Map<string, GameEngine>();
  private sessionHosts = new Map<string, string>();
  private broadcastCallback?: (sessionId: string, event: string, data: unknown) => void;

  setBroadcastCallback(cb: (sessionId: string, event: string, data: unknown) => void) {
    this.broadcastCallback = cb;
  }

  async initSession(sessionId: string, game: GameRecord, hostId: string): Promise<GameEngine> {
    const EngineClass = engineMap[game.type];
    if (!EngineClass) {
      throw new Error(`Unknown game type: ${game.type}`);
    }

    const engine = new EngineClass(sessionId, game.config as never);
    engine.setGameMeta(game.title, game.coverImageUrl ?? undefined);
    if (this.broadcastCallback) {
      engine.setBroadcastCallback(this.broadcastCallback);
    }
    engine.setOnAutoEnd((finalResults) => this.handleAutoEnd(sessionId, finalResults));
    this.engines.set(sessionId, engine);
    this.sessionHosts.set(sessionId, hostId);
    log.info({ sessionId, gameType: game.type, hostId }, 'Session initialized');
    return engine;
  }

  private async handleAutoEnd(sessionId: string, finalResults: FinalResults) {
    try {
      await prisma.gameSession.update({
        where: { id: sessionId },
        data: { status: 'ENDED', endedAt: new Date(), state: finalResults as object },
      });
      this.removeEngine(sessionId);
      log.info({ sessionId }, 'Auto-end: session completed');
    } catch (err) {
      log.error({ err, sessionId }, 'Auto-end: failed to update session');
    }
  }

  isHost(sessionId: string, userId: string): boolean {
    return this.sessionHosts.get(sessionId) === userId;
  }

  async isAuthorized(sessionId: string, userId: string): Promise<boolean> {
    // Fast path: check if user is the host (sync, no DB hit)
    if (this.isHost(sessionId, userId)) return true;

    // Slow path: check if user is an enabled moderator for the session's host
    const hostId = this.sessionHosts.get(sessionId);
    if (!hostId) return false;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twitchId: true },
    });
    if (!user) return false;

    const link = await prisma.moderatorLink.findFirst({
      where: { streamerId: hostId, modTwitchId: user.twitchId, enabled: true },
    });

    return !!link;
  }

  getEngine(sessionId: string): GameEngine | undefined {
    return this.engines.get(sessionId);
  }

  removeEngine(sessionId: string) {
    const engine = this.engines.get(sessionId);
    engine?.cleanup();
    this.engines.delete(sessionId);
    this.sessionHosts.delete(sessionId);
    log.info({ sessionId }, 'Engine removed');
  }

  async cleanupAll() {
    const count = this.engines.size;
    const cleanups = Array.from(this.engines.values()).map((engine) => engine.cleanup());
    await Promise.allSettled(cleanups);
    this.engines.clear();
    this.sessionHosts.clear();
    log.info({ count }, 'All engines cleaned up');
  }
}

export const gameRegistry = new GameRegistryClass();
