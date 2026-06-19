// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StickerCard from './StickerCard.jsx';

describe('StickerCard', () => {
  it('renders children and the foil modifier when set', () => {
    render(<StickerCard foil>Hello</StickerCard>);
    const card = screen.getByText('Hello');
    expect(card).toHaveClass('sticker--foil');
  });
});
