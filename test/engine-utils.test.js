const test = require('node:test');
const assert = require('node:assert/strict');
const { clamp, distance, normalizeMessage } = require('../js/engine-utils.js');

test('clamp keeps values inside the configured range', () => {
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(4, 0, 10), 4);
  assert.equal(clamp(11, 0, 10), 10);
});

test('distance calculates 2D distance', () => {
  assert.equal(distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
});

test('normalizeMessage handles OneBot text wrappers', () => {
  assert.equal(normalizeMessage('{type=text, data={text= hello\nworld }}'), 'hello world');
  assert.equal(normalizeMessage(null), '');
});
