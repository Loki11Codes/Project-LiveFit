import type { ParsedLogEnvelope } from './types';

/** Strip all |||DATA...||| marker blocks from the raw text. */
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

interface Exclusion {
  start: number;
  end: number;
}

/** 
 * Pass 1: Extract and identify blocks via ||| DATA markers
 */
function extractDataMarkers(text: string, logs: ParsedLogEnvelope[], exclusions: Exclusion[]): boolean {
  let hasData = false;
  const startRegex = /\|\|\|\s*DATA/gi;
  let match;
  
  while ((match = startRegex.exec(text)) !== null) {
    const startIdx = match.index;
    const contentStart = startIdx + match[0].length;
    const endIdx = findClosingMarker(text, contentStart);
    
    if (endIdx === -1) continue;

    hasData = true;
    const blockEnd = endIdx + 3; // Length of '|||'
    exclusions.push({ start: startIdx, end: blockEnd });
    
    let jsonContent = text.substring(contentStart, endIdx).trim();
    // Correctly handle backtick-fenced JSON with leading newlines
    jsonContent = jsonContent.replace(/^```json/i, "").replace(/^```/i, "").replace(/```$/i, "").trim();

    const parsed = parseLogContent(jsonContent);
    if (parsed) {
      if (Array.isArray(parsed)) logs.push(...parsed);
      else logs.push(parsed);
    }
  }
  return hasData;
}

/**
 * Pass 2: Fallback to markdown JSON blocks not handled or within DATA blocks
 */
function extractJsonCodeBlocks(text: string, logs: ParsedLogEnvelope[], exclusions: Exclusion[]): boolean {
  let hasData = false;
  const startRegex = /```json\s*/gi;
  let match;
  
  while ((match = startRegex.exec(text)) !== null) {
    const startIdx = match.index;
    const contentStart = startIdx + match[0].length;
    const endIdx = text.indexOf('```', contentStart);

    if (endIdx === -1) continue;

    const blockEnd = endIdx + 3; 
    
    // Skip if this block is already inside a DATA block
    if (!exclusions.some(ex => (startIdx >= ex.start && startIdx < ex.end))) {
      hasData = true;
      exclusions.push({ start: startIdx, end: blockEnd });
      const jsonContent = text.substring(contentStart, endIdx).trim();
      const parsed = parseLogContent(jsonContent);
      
      if (parsed && !Array.isArray(parsed) && !logs.some(l => JSON.stringify(l) === JSON.stringify(parsed))) {
        logs.push(parsed);
      }
    }
  }
  return hasData;
}

/**
 * Reconstruction of the text to remove identified log payloads.
 */
function buildCleanText(text: string, exclusions: Exclusion[]): string {
  let cleanText = '';
  let lastEnd = 0;
  const sorted = [...exclusions].sort((a, b) => a.start - b.start);
  
  for (const ex of sorted) {
    if (ex.start > lastEnd) {
      cleanText += text.substring(lastEnd, ex.start);
    }
    lastEnd = Math.max(lastEnd, ex.end);
  }
  
  if (lastEnd < text.length) {
    cleanText += text.substring(lastEnd);
  }

  return cleanText.trim();
}

/**
 * Main orchestrator for identifying and removing AI log payloads from response text.
 */
export function extractAndCleanLogData(text: string): {
  logs: ParsedLogEnvelope[];
  cleanText: string;
  hasData: boolean;
} {
  const logs: ParsedLogEnvelope[] = [];
  const exclusions: Exclusion[] = [];

  const foundMarkers = extractDataMarkers(text, logs, exclusions);
  const foundBlocks = extractJsonCodeBlocks(text, logs, exclusions);
  
  const cleanText = buildCleanText(text, exclusions);

  return { 
    logs, 
    cleanText, 
    hasData: foundMarkers || foundBlocks 
  };
}
