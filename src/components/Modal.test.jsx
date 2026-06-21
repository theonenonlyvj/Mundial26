// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Modal from './Modal.jsx';

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(<Modal open={false} title="X" onClose={() => {}}>body</Modal>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('calls onClose from the close button', () => {
    const onClose = vi.fn();
    render(<Modal open title="How it works" onClose={onClose}>body</Modal>);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
