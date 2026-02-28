/**
 * Convert raw vote counts to percentages.
 * Returns [0, 0] when total is 0 (no votes yet).
 */
export function countsToPercents(a: number, b: number): [number, number] {
  const total = a + b;
  if (total === 0) return [0, 0];
  return [(a / total) * 100, (b / total) * 100];
}

/**
 * Extract binary percent split from a round result object.
 * Handles both forms:
 *  - `distribution: [countA, countB]` (live aggregation / fixed round results)
 *  - `percentages: { A: pctA, B: pctB }` (BalanceGame computeRoundResults legacy)
 */
export function extractBinaryPercents(
  round: Record<string, unknown> | null | undefined,
): { percentA: number; percentB: number; totalVotes: number } | null {
  if (!round) return null;

  // Prefer distribution array (raw counts → convert)
  const dist = round.distribution as number[] | undefined;
  if (Array.isArray(dist) && dist.length === 2) {
    const [a, b] = dist;
    const [percentA, percentB] = countsToPercents(a, b);
    return { percentA, percentB, totalVotes: (round.totalResponses as number) ?? a + b };
  }

  // Fall back to percentages object (already 0-100)
  const pcts = round.percentages as Record<string, number> | undefined;
  if (pcts && typeof pcts.A === 'number' && typeof pcts.B === 'number') {
    return {
      percentA: pcts.A,
      percentB: pcts.B,
      totalVotes: (round.totalResponses as number) ?? 0,
    };
  }

  return null;
}
