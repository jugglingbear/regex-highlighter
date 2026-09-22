import test from 'node:test';
import assert from 'node:assert/strict';
import { matchTexts } from '../matcher.js';
test('global case insensitive matching and offsets', () => {
  assert.deepEqual(matchTexts(['Cat cat', 'CAT'], 'cat', 'giu').matches, [{node:0,start:0,end:3},{node:0,start:4,end:7},{node:1,start:0,end:3}]);
});
test('invalid and empty patterns fail', () => {
  assert.throws(() => matchTexts(['a'], '[', 'gu'));
  assert.throws(() => matchTexts(['a'], '', 'gu'));
});
test('zero-width unicode matches terminate without splitting surrogate pairs', () => {
  const result = matchTexts(['😀a'], '(?:)', 'gu');
  assert.equal(result.empty, 3); assert.equal(result.matches.length, 0);
});
test('multiline anchors and dotAll flags', () => {
  assert.equal(matchTexts(['a\nb'], '^.', 'gmu').matches.length, 2);
  assert.equal(matchTexts(['a\nb'], 'a.b', 'gsu').matches.length, 1);
});
test('limits and separate text segments', () => {
  assert.equal(matchTexts(['aaaa'], 'a', 'gu', 2).truncated, true);
  assert.equal(matchTexts(['aa'], 'a', 'gu', 2).truncated, false);
  assert.equal(matchTexts(['hel', 'lo'], 'hello', 'gu').matches.length, 0);
});
test('non-global search stops at first match across text nodes', () => {
  assert.deepEqual(matchTexts(['nothing', 'cat cat', 'cat'], 'cat', 'u').matches,
    [{ node: 1, start: 0, end: 3 }]);
  assert.equal(matchTexts(['cat'], 'dog', '').matches.length, 0);
  assert.equal(matchTexts(['cat'], 'cat', '', 0).truncated, true);
  const empty = matchTexts(['cat', 'cat'], '^|cat', 'u');
  assert.equal(empty.empty, 1);
  assert.equal(empty.matches.length, 0);
});
test('Unicode flag controls code point versus code unit matching', () => {
  assert.deepEqual(matchTexts(['😀'], '.', 'gu').matches, [{ node: 0, start: 0, end: 2 }]);
  assert.deepEqual(matchTexts(['😀'], '.', 'g').matches,
    [{ node: 0, start: 0, end: 1 }, { node: 0, start: 1, end: 2 }]);
  assert.equal(matchTexts(['😀'], '(?:)', 'g').empty, 3);
});
