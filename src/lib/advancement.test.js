import { describe, it, expect } from 'vitest';
import { buildAdvByTeam, advancementForMatch } from './advancement.js';

const STANDINGS = {
  groups: [
    {
      group: 'GROUP_A',
      table: [
        { team: { id: 1, name: 'USA' }, status: 'through', note: 'Already through' },
        { team: { id: 2, name: 'Wales' }, status: 'alive', note: 'Still alive' },
        { team: { id: 3, name: 'Iran' }, status: 'out', note: 'Eliminated' },
      ],
    },
  ],
};

const adv = buildAdvByTeam(STANDINGS);
const match = (over) => ({ stage: 'GROUP_STAGE', status: 'SCHEDULED', home: { id: 1 }, away: { id: 3 }, ...over });

describe('buildAdvByTeam', () => {
  it('maps team id to status', () => {
    expect(adv.get(1)).toMatchObject({ status: 'through' });
    expect(adv.get(3)).toMatchObject({ status: 'out' });
  });
  it('is empty for missing standings', () => {
    expect(buildAdvByTeam(undefined).size).toBe(0);
  });
});

describe('advancementForMatch', () => {
  it('flags through/out sides on an upcoming group match', () => {
    expect(advancementForMatch(match(), adv)).toEqual({ home: 'through', away: 'out' });
  });

  it('does not flag an "alive" team', () => {
    expect(advancementForMatch(match({ home: { id: 2 }, away: { id: 3 } }), adv)).toEqual({ home: null, away: 'out' });
  });

  it('returns null for a finished match', () => {
    expect(advancementForMatch(match({ status: 'FINISHED' }), adv)).toBeNull();
  });

  it('returns null for a knockout match', () => {
    expect(advancementForMatch(match({ stage: 'LAST_16' }), adv)).toBeNull();
  });

  it('returns null when neither side is decided', () => {
    expect(advancementForMatch(match({ home: { id: 2 }, away: { id: 99 } }), adv)).toBeNull();
  });

  it('returns null without a map', () => {
    expect(advancementForMatch(match(), null)).toBeNull();
  });
});
