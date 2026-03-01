import {
  GameType,
  type HotTakeConfig,
  type BalanceConfig,
  type BlindTestConfig,
  type RankingConfig,
} from '@twitch-hub/shared-types';

export function getDefaultConfig(type: GameType): unknown {
  switch (type) {
    case GameType.HOT_TAKE:
      return { statements: [''], roundDurationSec: 30 };
    case GameType.BALANCE:
      return {
        questions: [{ optionA: '', optionB: '', imageUrlA: '', imageUrlB: '' }],
        roundDurationSec: 30,
      };
    case GameType.BLIND_TEST:
      return { rounds: [{ answer: '', hints: [''] }], answerWindowSec: 30 };
    case GameType.RANKING:
      return {
        items: [
          { id: crypto.randomUUID(), name: '' },
          { id: crypto.randomUUID(), name: '' },
        ],
        bracketSize: 8,
        roundDurationSec: 30,
      };
    default:
      return {};
  }
}

export function sanitizeConfig(type: GameType, raw: unknown): unknown {
  switch (type) {
    case GameType.HOT_TAKE: {
      const c = raw as HotTakeConfig;
      return {
        statements: c.statements.filter((s) => s.trim()),
        roundDurationSec: c.roundDurationSec,
      };
    }
    case GameType.BALANCE: {
      const c = raw as BalanceConfig;
      return {
        questions: c.questions
          .filter((q) => q.optionA.trim() && q.optionB.trim())
          .map((q) => ({
            optionA: q.optionA,
            optionB: q.optionB,
            ...(q.imageUrlA?.trim() ? { imageUrlA: q.imageUrlA.trim() } : {}),
            ...(q.imageUrlB?.trim() ? { imageUrlB: q.imageUrlB.trim() } : {}),
          })),
        roundDurationSec: c.roundDurationSec,
      };
    }
    case GameType.BLIND_TEST: {
      const c = raw as BlindTestConfig;
      return {
        rounds: c.rounds
          .filter((r) => r.answer.trim())
          .map((r) => ({
            answer: r.answer,
            hints: r.hints.filter((h) => h.trim()),
            ...(r.mediaSrc ? { mediaSrc: r.mediaSrc } : {}),
            ...(r.imageUrl?.trim() ? { imageUrl: r.imageUrl.trim() } : {}),
          })),
        answerWindowSec: c.answerWindowSec,
      };
    }
    case GameType.RANKING: {
      const c = raw as RankingConfig;
      return {
        items: c.items
          .filter((item) => item.name.trim())
          .map((item) => ({
            id: item.id || crypto.randomUUID(),
            name: item.name,
            ...(item.imageUrl?.trim() ? { imageUrl: item.imageUrl.trim() } : {}),
          })),
        bracketSize: c.bracketSize,
        roundDurationSec: c.roundDurationSec,
      };
    }
    default:
      return raw;
  }
}
