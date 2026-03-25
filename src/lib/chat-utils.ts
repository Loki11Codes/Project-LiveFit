import type { ParsedLogEnvelope } from './types';

/** Strip all |||DATA...|||  marker blocks from the raw text. */
function removeDataBlocks(text: string, startMarker: string, endMarker: string): string {
  let result = text;
  let sIdx = result.indexOf(startMarker);
  while (sIdx >= 0) {
    const eIdx = result.indexOf(endMarker, sIdx + startMarker.length);
    if (eIdx < 0) break;
    result = result.substring(0, sIdx) + result.substring(eIdx + endMarker.length);
    sIdx = result.indexOf(startMarker);
  }
  return result.trim();
}

export function extractAndCleanLogData(text: string): {
  logs: ParsedLogEnvelope[];
  cleanText: string;
  hasData: boolean;
} {
  const startMarker = '|||DATA';
  const endMarker = '|||';
  const logs: ParsedLogEnvelope[] = [];
  let hasData = false;
  let currentPos = 0;

  // Extract logs
  while (true) {
    const startIdx = text.indexOf(startMarker, currentPos);
    if (startIdx === -1) break;

    const contentStart = startIdx + startMarker.length;
    const endIdx = text.indexOf(endMarker, contentStart);
    if (endIdx === -1) break;

    hasData = true;
    const jsonText = text.substring(contentStart, endIdx).trim();

    try {
      if (jsonText) {
        const parsed = JSON.parse(jsonText);
        if (Array.isArray(parsed)) {
          logs.push(...(parsed as ParsedLogEnvelope[]));
        } else if (parsed) {
          logs.push(parsed as ParsedLogEnvelope);
        }
      }
    } catch (e) {
      console.warn('Failed to parse a DATA block:', e);
    }

    currentPos = endIdx + endMarker.length;
  }

  return { logs, cleanText: removeDataBlocks(text, startMarker, endMarker), hasData };
}
