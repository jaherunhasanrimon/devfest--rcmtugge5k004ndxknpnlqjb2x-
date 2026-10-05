/**
 * Plain code-unit comparison (a < b ? -1 : a > b ? 1 : 0).
 * Never uses localeCompare.
 */
export function codeUnitCompare(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * Lexicographical comparison of two node ID sequences using plain code-unit comparison.
 */
export function compareNodeIdSequences(seqA: string[], seqB: string[]): number {
  const minLen = Math.min(seqA.length, seqB.length);
  for (let i = 0; i < minLen; i++) {
    const cmp = codeUnitCompare(seqA[i], seqB[i]);
    if (cmp !== 0) return cmp;
  }
  return seqA.length - seqB.length;
}
