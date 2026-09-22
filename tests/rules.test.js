import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRules, saveRules } from '../rules.js';
import { matchRules } from '../matcher.js';
const rule = (id, pattern, color = '#ff0000') => ({id, name:id, pattern, color, flags:'gui', enabled:true});
function storage(initial = {}) {
  let data = structuredClone(initial);
  return { get: async () => structuredClone(data), set: async update => { data = structuredClone({...data, ...update}); } };
}
test('saved library survives reload with edits, disable, colors and deletion', async () => {
  const store = storage();
  await saveRules(store, [rule('Bad', 'bad'), rule('Warning','warn','#ffff00')]);
  let loaded = await loadRules(store);
  assert.equal(loaded[1].color, '#ffff00');
  loaded[0] = {...loaded[0], pattern:'terrible', enabled:false};
  await saveRules(store, loaded);
  assert.deepEqual(await loadRules(store), loaded);
  await saveRules(store, [loaded[1]]);
  assert.deepEqual(await loadRules(store), [loaded[1]]);
  await saveRules(store, []); assert.deepEqual(await loadRules(store), []);
});
test('migrates previous settings only once, including after deleting all rules', async () => {
  const store = storage({settings:{pattern:'cat',ignoreCase:true,multiline:true}});
  assert.equal((await loadRules(store))[0].flags, 'guim');
  await saveRules(store, []); assert.deepEqual(await loadRules(store), []);
});
test('rejects invalid regex/color without changing persisted data', async () => {
  const store = storage(); await saveRules(store, [rule('Good','cat')]);
  await assert.rejects(saveRules(store, [rule('Bad','[')]));
  await assert.rejects(saveRules(store, [rule('Bad','cat','red; }')]));
  assert.equal((await loadRules(store))[0].name, 'Good');
});
test('multiple rules retain order/colors/overlap counts; disabled rules skipped', () => {
  const {groups} = matchRules(['bad warning'], [rule('Bad','bad'),rule('Warning','bad|warning','#ffff00'),{...rule('Off','.'),enabled:false}]);
  assert.deepEqual(groups.map(g => [g.name,g.color,g.matches.length]), [['Bad','#ff0000',1],['Warning','#ffff00',2]]);
  assert.deepEqual(groups[0].matches[0],groups[1].matches[0]);
});
test('shared match cap and invalid rule errors', () => {
  const {groups} = matchRules(['aaaa'],[rule('First','a'),rule('Second','a')],3);
  assert.equal(groups[0].matches.length,3); assert.equal(groups[1].matches.length,0);
  assert.equal(groups[1].truncated,true);
  assert.throws(() => matchRules(['a'],[rule('Broken','[')]),/Broken/);
});
test('optional flags survive storage alongside existing rules', async () => {
  const store = storage();
  const rules = ['gui', '', 'u', 'g', 'ims'].map((flags, index) => ({ ...rule(String(index), 'cat'), flags }));
  await saveRules(store, rules);
  assert.deepEqual(await loadRules(store), rules);
  for (const flags of ['gg', 'y', 'v', 'x']) {
    await assert.rejects(saveRules(store, [{ ...rule('Bad', 'cat'), flags }]));
  }
});
