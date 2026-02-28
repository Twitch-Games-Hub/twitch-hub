export interface ParsedCommand {
  type: 'rate' | 'vote' | 'answer' | 'tier';
  value: string | number;
  raw: string;
}

export function parseChatCommand(message: string): ParsedCommand | null {
  const trimmed = message.trim();

  // !rate N (1-10) — Hot Take Meter
  const rateMatch = trimmed.match(/^!rate\s+(\d+)$/i);
  if (rateMatch) {
    const value = parseInt(rateMatch[1], 10);
    if (value >= 1 && value <= 10) {
      return { type: 'rate', value, raw: trimmed };
    }
    return null;
  }

  // !vote A or !vote B — Balance Game, Bracket
  const voteMatch = trimmed.match(/^!vote\s+([AB])$/i);
  if (voteMatch) {
    return { type: 'vote', value: voteMatch[1].toUpperCase(), raw: trimmed };
  }

  // !answer text or !guess text — Blind Test
  const answerMatch = trimmed.match(/^!(?:answer|guess)\s+(.+)$/i);
  if (answerMatch) {
    return { type: 'answer', value: answerMatch[1].trim(), raw: trimmed };
  }

  // !tier S itemname — Tier List
  const tierMatch = trimmed.match(/^!tier\s+([SABCDF])\s+(.+)$/i);
  if (tierMatch) {
    return {
      type: 'tier',
      value: JSON.stringify({ tier: tierMatch[1].toUpperCase(), item: tierMatch[2].trim() }),
      raw: trimmed,
    };
  }

  return null;
}
