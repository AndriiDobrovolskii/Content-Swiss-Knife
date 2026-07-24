import { describe, it, expect } from 'vitest';
import { isValidRegex } from './find-replace-query';

describe('isValidRegex', () => {
  it('treats an empty pattern as valid (no query yet, not an error)', () => {
    expect(isValidRegex('')).toBe(true);
  });

  it('accepts a well-formed regex', () => {
    expect(isValidRegex('foo.*bar')).toBe(true);
    expect(isValidRegex('\\bword\\b')).toBe(true);
  });

  it('rejects an unterminated group', () => {
    expect(isValidRegex('(unterminated')).toBe(false);
  });

  it('rejects an invalid character class', () => {
    expect(isValidRegex('[z-a]')).toBe(false);
  });

  it('accepts plain text with regex metacharacters treated literally by RegExp (still syntactically valid)', () => {
    expect(isValidRegex('price: $5.00')).toBe(true);
  });
});
