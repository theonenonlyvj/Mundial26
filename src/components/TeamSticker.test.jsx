// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TeamSticker from './TeamSticker.jsx';

describe('TeamSticker', () => {
  it('shows the team name and TLA fallback when no crest', () => {
    render(<TeamSticker team={{ name: 'Mexico', shortName: 'Mexico', tla: 'MEX', crest: null }} />);
    expect(screen.getByText('Mexico')).toBeInTheDocument();
    expect(screen.getByText('MEX')).toBeInTheDocument();
  });

  it('shows a Through chip when the team has clinched', () => {
    render(<TeamSticker team={{ name: 'USA', tla: 'USA', crest: null }} advancement="through" />);
    expect(screen.getByText(/Through/)).toBeInTheDocument();
  });

  it('shows no advancement chip by default', () => {
    render(<TeamSticker team={{ name: 'Wales', tla: 'WAL', crest: null }} />);
    expect(screen.queryByText(/Through|Out/)).not.toBeInTheDocument();
  });

  it('renders our resolved advancer (not "TBD") when the match side is still TBD in the feed', () => {
    // The bug we shipped + reverted: a kind:'team' display on an unresolved side
    // fell through to "TBD". It must render the resolved team instead.
    render(<TeamSticker
      team={{ id: null, name: 'TBD', tla: null, crest: null }}
      display={{ kind: 'team', team: { name: 'Paraguay', tla: 'PAR', crest: null } }}
    />);
    expect(screen.getByText('Paraguay')).toBeInTheDocument();
    expect(screen.queryByText('TBD')).not.toBeInTheDocument();
  });

  it("SAFEGUARD: the match's own team wins over a computed display (API answer wins)", () => {
    render(<TeamSticker
      team={{ id: 7, name: 'Brazil', tla: 'BRA', crest: null }}
      display={{ kind: 'team', team: { name: 'Paraguay', tla: 'PAR', crest: null } }}
    />);
    expect(screen.getByText('Brazil')).toBeInTheDocument();
    expect(screen.queryByText('Paraguay')).not.toBeInTheDocument();
  });
});
