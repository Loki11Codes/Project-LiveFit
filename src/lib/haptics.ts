/**
 * Safely triggers device haptic feedback if supported and enabled.
 * 
 * @param enabled - Whether the user has haptic feedback enabled in their profile. Defaults to true.
 * @param pattern - The vibration pattern to use (e.g. 50ms, or [50, 50, 50]). Defaults to 50ms.
 */
export function triggerHaptic(enabled: boolean | undefined = true, pattern: number | number[] = 50) {
  if (enabled === false) return;
  
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Silently fail on unsupported browsers (e.g. iOS Safari)
  }
}
