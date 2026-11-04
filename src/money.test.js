import { test } from 'node:test';
import assert from 'node:assert/strict';
import { swap, earn, fmt } from './money.js';

test('swap takes the fee before converting', () => {
  const { fee, received } = swap(500, 58.42, 0.35);
  assert.equal(fee, 1.75);
  assert.ok(Math.abs(received - 29107.77) <= 0.01, `got ${received}`);
});

test('earn: a year at 4.20% on 25,000 is 1,050 and months add up', () => {
  const r = earn(25000, 0.042);
  assert.equal(r.year, 1050);
  assert.equal(r.total, 26050);
  const sum = r.months.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1050) < 1e-6);
  assert.ok(r.daily > 2.8 && r.daily < 2.9);
});

test('fmt uses the right symbol and two decimals', () => {
  assert.equal(fmt(1234.5, 'PHP'), '₱1,234.50');
  assert.equal(fmt(-16.3), '$16.30');
});
