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
    if (match?.index === idx) {
      pos = idx + match[0].length;
      continue;
    }
    
    return idx;
  }
  return -1;
}

/** 
 * Handle cases where AI wraps the envelope in another level like { data: { ... } }
 * @param parsed The raw JSON object from AI
 */
function unWrapEnvelope(parsed: any): any {
  if (parsed?.data?.category && !parsed.category) {
    return {
      category: parsed.data.category,
      data: parsed.data.data ?? parsed.data,
      date: parsed.data.date ?? parsed.date,
      update: parsed.data.update ?? parsed.update,
    };
  }
  return parsed;
}

/**
 * Attempts to parse a JSON string and unwrap it if it's an AI-generated envelope.
 * Returns the parsed object(s) or null if invalid.
 */
function parseLogContent(jsonText: string): ParsedLogEnvelope | ParsedLogEnvelope[] | null {
  if (!jsonText) return null;
  try {
    let parsed = JSON.parse(jsonText);
    parsed = Array.isArray(parsed) ? parsed.map(unWrapEnvelope) : unWrapEnvelope(parsed);
    
    // Validate that it looks like one or more envelopes
    if (Array.isArray(parsed)) return parsed;
    if (parsed?.category) return parsed;
    
    return null;
  } catch (e) {
    console.warn('[PARSER] Failed to parse log content:', e);
    return null;
  }
}

export function extractAndCleanLogData(text: string): {
  logs: ParsedLogEnvelope[];
  cleanText: string;
  hasData: boolean;
} {
  const startRegex = /\|\|\|\s*DATA/gi;
  const logs: ParsedLogEnvelope[] = [];
  let hasData = false;
  let match;

  // Pass 1: Extract data via ||| DATA markers
  while ((match = startRegex.exec(text)) !== null) {
    const startIdx = match.index;
    const contentStart = startIdx + match[0].length;
    const endIdx = findClosingMarker(text, contentStart);
    
    if (endIdx === -1) break;

    const jsonText = text.substring(contentStart, endIdx)
      .replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "").trim();

    const parsed = parseLogContent(jsonText);
    if (parsed) {
      hasData = true;
      logs.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    }
  }

  // Pass 2: Fallback to standard markdown JSON blocks
  const codeBlockRegex = /```json\s+([\s\S]*?)```/gi;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    const jsonText = match[1].trim();
    const parsed = parseLogContent(jsonText);
    
    if (parsed && !Array.isArray(parsed) && !logs.some(l => JSON.stringify(l) === JSON.stringify(parsed))) {
      logs.push(parsed);
      hasData = true;
    }
  }

  // Clean the text by removing all blocks that match the patterns
  const fullBlockRegex = /\|\|\|\s*DATA[\s\S]*?\|\|\|/gi;
  const jsonCodeBlockRegex = /```json[\s\S]*?```/gi;
  
  const cleanText = text
    .replaceAll(fullBlockRegex, '')
    .replaceAll(jsonCodeBlockRegex, '')
    .trim();

  return { logs, cleanText, hasData };
}

