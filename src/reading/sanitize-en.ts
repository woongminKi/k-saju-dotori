// English-pipeline sibling of sanitize.ts (which stays untouched — see ENGINE_SYNC.md: verbatim
// files are never edited, new behavior goes in new files). Detects hanja/Hangul leaking into
// what must be pure-English reading output, e.g. a model echoing a Saju term verbatim ("庚金",
// "경금") instead of using the glossary's English translation ("Yang Metal").
const HAN_RE = /[一-鿿㐀-䶿]/; // Han ideographs (hanja): CJK Unified + Ext-A
const HANGUL_RE = /[가-힯ᄀ-ᇿ㄰-㆏]/; // Hangul syllables + Jamo blocks

/** True if `text` contains any hanja or Hangul — for the English pipeline, that's always a leak. */
export function hasCjkLeak(text: string): boolean {
  return HAN_RE.test(text) || HANGUL_RE.test(text);
}
