// Word split of a statement's text for kinetic (task 026). A word is a run of
// non-space characters, the same count as the registry's countWords, so the
// validator's warning and the drawn words agree. A word split by inline emphasis
// keeps one index across its pieces. Pure: the caller keeps the state.

/** Where the walk is: the index of the last word started, and whether one is open. */
export interface WordState {
  last: number;
  inWord: boolean;
}

/** A run of the text: a word's piece (`word` set) or spaces (`word` undefined). */
export interface Piece {
  text: string;
  word: number | undefined;
}

export function newWordState(): WordState {
  return { last: -1, inWord: false };
}

/** Splits `text` into word pieces and spaces, advancing `state` over it. */
export function splitWords(text: string, state: WordState): Piece[] {
  return text
    .split(/(\s+)/)
    .filter((part) => part !== "")
    .map((part): Piece => {
      if (/^\s+$/.test(part)) {
        state.inWord = false;
        return { text: part, word: undefined };
      }
      if (!state.inWord) {
        state.last += 1;
        state.inWord = true;
      }
      return { text: part, word: state.last };
    });
}
