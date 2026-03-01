export interface ParsedCommand {
  type: 'rate' | 'vote' | 'answer' | 'pick';
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

  // !vote A or !vote B — Balance Game
  const voteMatch = trimmed.match(/^!vote\s+([AB])$/i);
  if (voteMatch) {
    return { type: 'vote', value: voteMatch[1].toUpperCase(), raw: trimmed };
  }

  // !answer text or !guess text — Blind Test
  const answerMatch = trimmed.match(/^!(?:answer|guess)\s+(.+)$/i);
  if (answerMatch) {
    return { type: 'answer', value: answerMatch[1].trim(), raw: trimmed };
  }

  // !pick A/B or !pick 1/2 — Ranking Game
  const pickMatch = trimmed.match(/^!pick\s+([AB12])$/i);
  if (pickMatch) {
    const raw_val = pickMatch[1].toUpperCase();
    const value = raw_val === '1' ? 'A' : raw_val === '2' ? 'B' : raw_val;
    return { type: 'pick', value, raw: trimmed };
  }

  return null;
}
