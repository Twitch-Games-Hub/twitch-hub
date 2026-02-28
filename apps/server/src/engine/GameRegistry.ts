import { GameType } from '@twitch-hub/shared-types';
import type { GameEngine } from './GameEngine.js';
import { HotTakeGame } from './types/HotTakeGame.js';
import { BracketGame } from './types/BracketGame.js';
import { BalanceGame } from './types/BalanceGame.js';
import { PersonalityGame } from './types/PersonalityGame.js';
import { TierListGame } from './types/TierListGame.js';
import { BlindTestGame } from './types/BlindTestGame.js';

type GameRecord = { id: string; type: string; config: unknown };

const engineMap: Record<string, new (sessionId: string, config: never) => GameEngine> = {
  [GameType.HOT_TAKE]: HotTakeGame as unknown as new (
    sessionId: string,
    config: never,
  ) => GameEngine,
  [GameType.BRACKET]: BracketGame as unknown as new (
    sessionId: string,
    config: never,
  ) => GameEngine,
  [GameType.BALANCE]: BalanceGame as unknown as new (
    sessionId: string,
    config: never,
  ) => GameEngine,
  [GameType.PERSONALITY]: PersonalityGame as unknown as new (
    sessionId: string,
    config: never,
  ) => GameEngine,
  [GameType.TIER_LIST]: TierListGame as unknown as new (
    sessionId: string,
    config: never,
  ) => GameEngine,
  [GameType.BLIND_TEST]: BlindTestGame as unknown as new (
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
    if (this.broadcastCallback) {
      engine.setBroadcastCallback(this.broadcastCallback);
    }
    this.engines.set(sessionId, engine);
    this.sessionHosts.set(sessionId, hostId);
    return engine;
  }

  isHost(sessionId: string, userId: string): boolean {
    return this.sessionHosts.get(sessionId) === userId;
  }

  getEngine(sessionId: string): GameEngine | undefined {
    return this.engines.get(sessionId);
  }

  removeEngine(sessionId: string) {
    const engine = this.engines.get(sessionId);
    engine?.cleanup();
    this.engines.delete(sessionId);
    this.sessionHosts.delete(sessionId);
  }

  async cleanupAll() {
    const cleanups = Array.from(this.engines.values()).map((engine) => engine.cleanup());
    await Promise.allSettled(cleanups);
    this.engines.clear();
    this.sessionHosts.clear();
  }
}

export const gameRegistry = new GameRegistryClass();
