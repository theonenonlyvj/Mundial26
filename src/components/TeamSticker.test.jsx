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
});
