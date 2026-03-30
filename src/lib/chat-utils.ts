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

/** Find the closing ||| that is NOT the start of another |||DATA block. */
function findClosingMarker(text: string, searchFrom: number): number {
  let pos = searchFrom;
  while (pos < text.length) {
    const idx = text.indexOf('|||', pos);
    if (idx === -1) return -1;
    // If this ||| is immediately followed by 'DATA', it's a new opening block — skip past it
    if (text.startsWith('DATA', idx + 3)) {
      pos = idx + 3; // skip past this '|||' and keep searching
      continue;
    }
    return idx;
  }
  return -1;
}

export function extractAndCleanLogData(text: string): {
  logs: ParsedLogEnvelope[];
  cleanText: string;
  hasData: boolean;
} {
  const startMarker = '|||DATA';
  const logs: ParsedLogEnvelope[] = [];
  let hasData = false;
  let currentPos = 0;

  // Extract logs
  while (true) {
    const startIdx = text.indexOf(startMarker, currentPos);
    if (startIdx === -1) break;

    const contentStart = startIdx + startMarker.length;
    const endIdx = findClosingMarker(text, contentStart);
    if (endIdx === -1) break;

    hasData = true;
    let jsonText = text.substring(contentStart, endIdx).trim();
    jsonText = jsonText.replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "").trim();

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

    currentPos = endIdx + 3; // length of '|||'
  }

  return { logs, cleanText: removeDataBlocks(text, startMarker, '|||'), hasData };
}
