import { describe, it, expect } from 'vitest';
import { inGameWindow } from './snapshot.js';

const KO = '2026-06-29T18:00:00Z';
const koMs = Date.parse(KO);

describe('inGameWindow', () => {
  it('is true within [kickoff-12min, kickoff+240min] for an unfinished match', () => {
    expect(inGameWindow([{ utcDate: KO, status: 'TIMED' }], koMs - 10 * 60_000)).toBe(true); // imminent
    expect(inGameWindow([{ utcDate: KO, status: 'IN_PLAY' }], koMs + 60 * 60_000)).toBe(true); // live
  });
  it('is false before the lead window and long after kickoff', () => {
    expect(inGameWindow([{ utcDate: KO, status: 'TIMED' }], koMs - 30 * 60_000)).toBe(false);
    expect(inGameWindow([{ utcDate: KO, status: 'TIMED' }], koMs + 300 * 60_000)).toBe(false);
  });
  it('is false for a finished match even inside the window', () => {
    expect(inGameWindow([{ utcDate: KO, status: 'FINISHED' }], koMs + 60 * 60_000)).toBe(false);
  });
  it('is false for an empty list', () => {
    expect(inGameWindow([], koMs)).toBe(false);
  });
});
