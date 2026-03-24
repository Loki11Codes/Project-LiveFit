import type { ParsedLogEnvelope } from './types';

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

  // Clean text
  let cleanText = text;
  let sIdx = cleanText.indexOf(startMarker);
  while (sIdx >= 0) {
    const eIdx = cleanText.indexOf(endMarker, sIdx + startMarker.length);
    if (eIdx >= 0) {
      cleanText = cleanText.substring(0, sIdx) + cleanText.substring(eIdx + endMarker.length);
      sIdx = cleanText.indexOf(startMarker);
    } else {
      break;
    }
  }

  return { logs, cleanText: cleanText.trim(), hasData };
}
