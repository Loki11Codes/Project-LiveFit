import { describe, it, expect } from 'vitest';
import { extractAndCleanLogData } from './chat-utils';

describe('extractAndCleanLogData', () => {
  // ── No data blocks ────────────────────────────────────────────────────────

  it('returns empty logs and original text when no DATA markers present', () => {
    const result = extractAndCleanLogData('Hello, how are you?');
    expect(result.hasData).toBe(false);
    expect(result.logs).toHaveLength(0);
    expect(result.cleanText).toBe('Hello, how are you?');
  });

  it('returns empty logs for an empty string', () => {
    const result = extractAndCleanLogData('');
    expect(result.hasData).toBe(false);
    expect(result.logs).toHaveLength(0);
    expect(result.cleanText).toBe('');
  });

  // ── ||| DATA ... ||| markers ─────────────────────────────────────────────

  it('extracts a single object log from |||DATA...|||', () => {
    const input = 'Your food was logged. |||DATA{"category":"food","data":{"name":"Apple","calories":95}}||| Great job!';
    const result = extractAndCleanLogData(input);
    expect(result.hasData).toBe(true);
    expect(result.logs).toHaveLength(1);
    expect(result.logs[0].category).toBe('food');
  });

  it('strips the DATA block from cleanText', () => {
    const input = 'Logged! |||DATA{"category":"food","data":{}}||| Done.';
    const result = extractAndCleanLogData(input);
    expect(result.cleanText).not.toContain('|||DATA');
    expect(result.cleanText).toContain('Logged!');
  });

  it('extracts an array of logs from a DATA block', () => {
    const input = '|||DATA[{"category":"food","data":{}},{"category":"sleep","data":{}}]|||';
    const result = extractAndCleanLogData(input);
    expect(result.hasData).toBe(true);
    expect(result.logs).toHaveLength(2);
  });

  it('handles DATA block with backtick-fenced JSON', () => {
    const input = '|||DATA\n```json\n{"category":"workout","data":{}}\n```\n|||';
    const result = extractAndCleanLogData(input);
    expect(result.hasData).toBe(true);
    expect(result.logs[0].category).toBe('workout');
  });

  it('skips DATA block with malformed JSON without crashing', () => {
    const input = '|||DATA{not-valid-json}||| Some text.';
    const result = extractAndCleanLogData(input);
    expect(result.hasData).toBe(true); // marker was found
    expect(result.logs).toHaveLength(0); // but nothing could be parsed
    expect(result.cleanText).toBe('Some text.');
  });

  it('handles DATA block with no closing marker gracefully', () => {
    const input = 'Hello |||DATA{"category":"food","data":{}} no closing marker';
    const result = extractAndCleanLogData(input);
    // No closing ||| → should not extract anything
    expect(result.hasData).toBe(false);
    expect(result.logs).toHaveLength(0);
  });

  it('unwraps nested data envelope { data: { category, data } }', () => {
    const wrapped = { data: { category: 'food', data: { name: 'Apple' } } };
    const input = `|||DATA${JSON.stringify(wrapped)}|||`;
    const result = extractAndCleanLogData(input);
    expect(result.hasData).toBe(true);
    expect(result.logs[0].category).toBe('food');
  });

  it('handles multiple DATA blocks in sequence', () => {
    const block1 = '|||DATA{"category":"food","data":{}}|||';
    const block2 = '|||DATA{"category":"sleep","data":{}}|||';
    const result = extractAndCleanLogData(`${block1} text ${block2}`);
    expect(result.logs).toHaveLength(2);
    expect(result.cleanText.trim()).toBe('text');
  });

  it('ignores DATA block with empty json text', () => {
    const input = '|||DATA   |||';
    const result = extractAndCleanLogData(input);
    expect(result.hasData).toBe(true);
    expect(result.logs).toHaveLength(0);
    expect(result.cleanText).toBe('');
  });

  it('ignores parsed objects without a category field', () => {
    const input = '|||DATA{"name":"Apple"}|||';
    const result = extractAndCleanLogData(input);
    expect(result.logs).toHaveLength(0);
  });

  // ── Markdown JSON code blocks (fallback) ─────────────────────────────────

  it('extracts logs from ```json code block when no DATA markers', () => {
    const input = 'Logged your food.\n```json\n{"category":"food","data":{"name":"rice"}}\n```';
    const result = extractAndCleanLogData(input);
    expect(result.hasData).toBe(true);
    expect(result.logs[0].category).toBe('food');
  });

  it('skips duplicate logs already extracted from DATA markers', () => {
    const obj = { category: 'food', data: {} };
    const dataBlock = `|||DATA${JSON.stringify(obj)}|||`;
    const codeBlock = `\`\`\`json\n${JSON.stringify(obj)}\n\`\`\``;
    const result = extractAndCleanLogData(`${dataBlock} text ${codeBlock}`);
    // Should only have 1 entry (deduped)
    expect(result.logs).toHaveLength(1);
  });

  it('ignores malformed JSON in code block without crashing', () => {
    const input = '```json\n{bad-json}\n```';
    expect(() => extractAndCleanLogData(input)).not.toThrow();
  });

  it('ignores code block objects without a category field', () => {
    const input = '```json\n{"name":"no-category"}\n```';
    const result = extractAndCleanLogData(input);
    expect(result.logs).toHaveLength(0);
  });

  it('strips json code blocks from cleanText', () => {
    const input = 'Done.\n```json\n{"category":"food","data":{}}\n```';
    const result = extractAndCleanLogData(input);
    expect(result.cleanText).not.toContain('```json');
    expect(result.cleanText).toContain('Done.');
  });

  // ── Case-insensitivity of DATA marker ────────────────────────────────────

  it('matches DATA marker case-insensitively (e.g., |||data ... |||)', () => {
    const input = '|||data{"category":"food","data":{}}|||';
    const result = extractAndCleanLogData(input);
    expect(result.hasData).toBe(true);
    expect(result.logs[0].category).toBe('food');
  });

  it('matches DATA marker with a space (e.g., ||| DATA ... |||)', () => {
    const input = '||| DATA{"category":"food","data":{}}|||';
    const result = extractAndCleanLogData(input);
    expect(result.hasData).toBe(true);
    expect(result.logs[0].category).toBe('food');
  });

  // ── findClosingMarker edge cases ──────────────────────────────────────────

  it('handles text with ||| but no valid DATA block opening', () => {
    const input = 'Some text ||| more text ||| end.';
    const result = extractAndCleanLogData(input);
    expect(result.hasData).toBe(false);
    expect(result.logs).toHaveLength(0);
  });

  // ── ReDoS / Performance ───────────────────────────────────────────────────

  it('handles very large input with unclosed blocks efficiently (ReDoS safety)', () => {
    const maliciousInput = '|||DATA' + 'a'.repeat(100000);
    const start = Date.now();
    const result = extractAndCleanLogData(maliciousInput);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100); // Should be near-instant
    expect(result.hasData).toBe(false);
    expect(result.logs).toHaveLength(0);
  });
});
