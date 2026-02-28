import { describe, it, expect } from 'vitest';
import { parseChatCommand } from './chatParser.js';

describe('parseChatCommand', () => {
  describe('!rate command (HotTake)', () => {
    it('parses valid ratings 1-10', () => {
      for (let i = 1; i <= 10; i++) {
        const result = parseChatCommand(`!rate ${i}`);
        expect(result).toEqual({ type: 'rate', value: i, raw: `!rate ${i}` });
      }
    });

    it('rejects ratings outside 1-10', () => {
      expect(parseChatCommand('!rate 0')).toBeNull();
      expect(parseChatCommand('!rate 11')).toBeNull();
      expect(parseChatCommand('!rate 100')).toBeNull();
    });

    it('rejects non-numeric values', () => {
      expect(parseChatCommand('!rate abc')).toBeNull();
      expect(parseChatCommand('!rate')).toBeNull();
    });

    it('is case-insensitive', () => {
      const result = parseChatCommand('!RATE 5');
      expect(result).toEqual({ type: 'rate', value: 5, raw: '!RATE 5' });
    });

    it('trims whitespace', () => {
      const result = parseChatCommand('  !rate 7  ');
      expect(result).toEqual({ type: 'rate', value: 7, raw: '!rate 7' });
    });
  });

  describe('!vote command (Balance)', () => {
    it('parses !vote A', () => {
      const result = parseChatCommand('!vote A');
      expect(result).toEqual({ type: 'vote', value: 'A', raw: '!vote A' });
    });

    it('parses !vote B', () => {
      const result = parseChatCommand('!vote B');
      expect(result).toEqual({ type: 'vote', value: 'B', raw: '!vote B' });
    });

    it('normalizes lowercase to uppercase', () => {
      expect(parseChatCommand('!vote a')).toEqual({ type: 'vote', value: 'A', raw: '!vote a' });
      expect(parseChatCommand('!vote b')).toEqual({ type: 'vote', value: 'B', raw: '!vote b' });
    });

    it('rejects invalid vote options', () => {
      expect(parseChatCommand('!vote C')).toBeNull();
      expect(parseChatCommand('!vote')).toBeNull();
      expect(parseChatCommand('!vote AB')).toBeNull();
    });
  });

  describe('!answer/!guess command (BlindTest)', () => {
    it('parses !answer with text', () => {
      const result = parseChatCommand('!answer Mario');
      expect(result).toEqual({ type: 'answer', value: 'Mario', raw: '!answer Mario' });
    });

    it('parses !guess as alias', () => {
      const result = parseChatCommand('!guess Zelda');
      expect(result).toEqual({ type: 'answer', value: 'Zelda', raw: '!guess Zelda' });
    });

    it('preserves multi-word answers', () => {
      const result = parseChatCommand('!answer Super Mario Bros');
      expect(result).toEqual({
        type: 'answer',
        value: 'Super Mario Bros',
        raw: '!answer Super Mario Bros',
      });
    });

    it('trims answer whitespace', () => {
      const result = parseChatCommand('!answer  some answer  ');
      expect(result?.value).toBe('some answer');
    });

    it('rejects empty answer', () => {
      expect(parseChatCommand('!answer')).toBeNull();
    });
  });

  describe('unknown commands', () => {
    it('returns null for non-commands', () => {
      expect(parseChatCommand('hello world')).toBeNull();
      expect(parseChatCommand('!unknown command')).toBeNull();
      expect(parseChatCommand('')).toBeNull();
    });
  });
});
