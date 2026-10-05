import { describe, it, expect } from 'vitest';
import { parseHeaders, parseDuration } from './parse.js';

describe('parseHeaders', () => {
  it('returns undefined for empty input', () => {
    expect(parseHeaders(undefined)).toBeUndefined();
    expect(parseHeaders([])).toBeUndefined();
  });

  it('parses a single header', () => {
    expect(parseHeaders(['Content-Type: application/json'])).toEqual({
      'Content-Type': 'application/json',
    });
  });

  it('parses multiple headers', () => {
    expect(
      parseHeaders(['Authorization: Bearer abc', 'X-Custom: value'])
    ).toEqual({
      Authorization: 'Bearer abc',
      'X-Custom': 'value',
    });
  });

  it('trims whitespace around key and value', () => {
    expect(parseHeaders(['  Foo  :   bar baz  '])).toEqual({ Foo: 'bar baz' });
  });

  it('preserves colons in the value', () => {
    expect(parseHeaders(['X-Url: https://example.com:8080/x'])).toEqual({
      'X-Url': 'https://example.com:8080/x',
    });
  });

  it('throws when no colon is present', () => {
    expect(() => parseHeaders(['NoColonHere'])).toThrow(/Invalid header/);
  });

  it('throws when key is empty', () => {
    expect(() => parseHeaders([': value'])).toThrow(/empty key/);
  });
});

describe('parseDuration', () => {
  it('parses raw integer ms', () => {
    expect(parseDuration('1500')).toBe(1500);
  });

  it('parses milliseconds', () => {
    expect(parseDuration('250ms')).toBe(250);
  });

  it('parses seconds', () => {
    expect(parseDuration('30s')).toBe(30_000);
  });

  it('parses minutes', () => {
    expect(parseDuration('5m')).toBe(300_000);
  });

  it('parses hours', () => {
    expect(parseDuration('2h')).toBe(7_200_000);
  });

  it('parses days', () => {
    expect(parseDuration('1d')).toBe(86_400_000);
  });

  it('trims surrounding whitespace', () => {
    expect(parseDuration('  10s  ')).toBe(10_000);
  });

  it('throws on unknown units', () => {
    expect(() => parseDuration('5y')).toThrow(/Invalid duration/);
  });

  it('throws on garbage input', () => {
    expect(() => parseDuration('abc')).toThrow(/Invalid duration/);
  });

  it('throws on empty string', () => {
    expect(() => parseDuration('')).toThrow(/Invalid duration/);
  });
});
