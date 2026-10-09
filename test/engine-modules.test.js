const test = require('node:test');
const assert = require('node:assert/strict');

test('entity system keeps entities addressable and iterable', () => {
  const items = {};
  const add = (id, entity) => { items[id] = entity; return entity; };
  const remove = id => { delete items[id]; };
  add('hero', { x: 1 });
  add('npc', { x: 2 });
  assert.deepEqual(Object.keys(items), ['hero', 'npc']);
  remove('npc');
  assert.deepEqual(Object.keys(items), ['hero']);
});

test('scene changes can be represented as previous/current state', () => {
  const state = { current: 'close', previous: null };
  const change = next => {
    state.previous = state.current;
    state.current = next;
  };
  change('indoor');
  assert.deepEqual(state, { current: 'indoor', previous: 'close' });
});
