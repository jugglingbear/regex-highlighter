import test from 'node:test';
import assert from 'node:assert/strict';
import { pageAction } from '../page.js';

function page() {
  const scrolls = [];
  const node = { data: 'cat cat', isConnected: true, parentElement: { scrollIntoView() {} } };
  globalThis.CSS = { highlights: new Map() };
  globalThis.Highlight = class extends Set { constructor(...ranges) { super(ranges); } };
  globalThis.Range = class {
    setStart(node, offset) { this.node = node; this.start = offset; }
    setEnd(node, offset) { this.end = offset; }
    getBoundingClientRect() { return { top: this.start * 100 }; }
  };
  globalThis.document = { createElement: () => ({ remove() {} }), documentElement: { append() {} } };
  globalThis.window = { innerHeight: 800, scrollBy: value => scrolls.push(value) };
  globalThis.__regexHighlighterPoc = { nodes: [node], texts: [node.data], token: 'test' };
  const groups = [{ color: '#ffe066', matches: [{ node: 0, start: 0, end: 3 }, { node: 0, start: 4, end: 7 }] }];
  return { node, groups, scrolls };
}
test('single-highlight navigation advances, wraps, and clears', () => {
  const { groups, scrolls } = page();
  assert.equal(pageAction('apply', { token: 'test', groups, single: true, navigable: true }).count, 1);
  assert.deepEqual(pageAction('navigate', { token: 'test' }), { current: 1, total: 2 });
  assert.equal(pageAction('navigate', { token: 'test' }).current, 2);
  assert.equal([...CSS.highlights.values()][0].size, 1);
  assert.equal([...CSS.highlights.values()][0].values().next().value.start, 4);
  assert.equal(pageAction('navigate', { token: 'test' }).current, 1);
  assert.equal(scrolls.length, 3);
  pageAction('clear');
  assert.equal(CSS.highlights.size, 0);
  assert.throws(() => pageAction('navigate', { token: 'test' }), /Run the search again/);
});
test('all-highlight navigation preserves results and refuses changed text', () => {
  const { groups, node } = page();
  assert.equal(pageAction('apply', { token: 'test', groups, navigable: true }).count, 2);
  pageAction('navigate', { token: 'test' });
  assert.equal([...CSS.highlights.values()][0].size, 2);
  node.data = 'changed';
  assert.throws(() => pageAction('navigate', { token: 'test' }), /Page text changed/);
  assert.throws(() => pageAction('navigate', { token: 'old' }), /Run the search again/);
});
