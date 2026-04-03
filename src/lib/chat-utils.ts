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
  const markerRegex = /\|\|\|\s*DATA/gi;
  let pos = searchFrom;
  
  while (pos < text.length) {
    const idx = text.indexOf('|||', pos);
    if (idx === -1) return -1;
    
    // Check if this ||| is actually a new opening block
    markerRegex.lastIndex = idx;
    const match = markerRegex.exec(text);
    if (match && match.index === idx) {
      pos = idx + match[0].length;
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
  const startRegex = /\|\|\|\s*DATA/gi;
  const logs: ParsedLogEnvelope[] = [];
  let hasData = false;
  let cleanText = text;

  // Extract logs
  let match;
  while ((match = startRegex.exec(text)) !== null) {
    const startIdx = match.index;
    const contentStart = startIdx + match[0].length;
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
      console.warn('[PARSER] Failed to parse a DATA block:', e);
    }
  }

  // Clean the text by removing all blocks that match the pattern
  // We recreate a simple version of the removal for safety
  const fullBlockRegex = /\|\|\|\s*DATA[\s\S]*?\|\|\|/gi;
  cleanText = text.replace(fullBlockRegex, '').trim();

  return { logs, cleanText, hasData };
}
