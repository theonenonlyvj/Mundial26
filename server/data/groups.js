const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

export const GROUP_KEYS = LETTERS.map((l) => `GROUP_${l}`);

export function groupLabel(key) {
  const letter = key.replace('GROUP_', '');
  return `Group ${letter}`;
}
