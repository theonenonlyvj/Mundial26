import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, 'global.css'), 'utf8');

describe('global app shell layout', () => {
  it('keeps the footer at the viewport bottom on short mobile pages', () => {
    expect(css).toMatch(/\.app\s*\{[^}]*min-height:\s*100vh[^}]*display:\s*flex[^}]*flex-direction:\s*column/s);
    expect(css).toMatch(/\.app\s*\{[^}]*min-height:\s*100dvh/s);
    expect(css).toMatch(/\.app__main\s*\{[^}]*width:\s*100%[^}]*flex:\s*1\b/s);
  });
});
