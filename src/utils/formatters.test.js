// src/utils/formatters.test.js
import { describe, test, expect } from 'vitest';
import { formatPercentage, formatNumber, calculateCompletionRate } from './formatters';

describe('formatPercentage', () => {
  test('formats valid percentage', () => {
    expect(formatPercentage(75)).toBe('75%');
  });

  test('handles null value', () => {
    expect(formatPercentage(null)).toBe('N/A');
  });

  test('handles undefined value', () => {
    expect(formatPercentage(undefined)).toBe('N/A');
  });
});

describe('formatNumber', () => {
  test('formats number with commas', () => {
    expect(formatNumber(1000)).toBe('1,000');
  });

  test('handles null value', () => {
    expect(formatNumber(null)).toBe(0);
  });
});

describe('calculateCompletionRate', () => {
  test('calculates percentage correctly', () => {
    expect(calculateCompletionRate(7, 10)).toBe(70);
  });

  test('rounds to nearest integer', () => {
    expect(calculateCompletionRate(2, 3)).toBe(67);
  });

  test('handles zero total', () => {
    expect(calculateCompletionRate(5, 0)).toBe(0);
  });

  test('returns 0 for null total', () => {
    expect(calculateCompletionRate(5, null)).toBe(0);
  });
});