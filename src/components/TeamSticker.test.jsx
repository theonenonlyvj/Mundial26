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
});
