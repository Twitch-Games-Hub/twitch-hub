export function computeContentCount(type: string, config: unknown): number {
  if (!config || typeof config !== 'object') return 0;

  const cfg = config as Record<string, unknown>;

  switch (type) {
    case 'HOT_TAKE':
      return Array.isArray(cfg.statements) ? cfg.statements.length : 0;
    case 'BALANCE':
      return Array.isArray(cfg.questions) ? cfg.questions.length : 0;
    case 'BLIND_TEST':
      return Array.isArray(cfg.rounds) ? cfg.rounds.length : 0;
    default:
      return 0;
  }
}
