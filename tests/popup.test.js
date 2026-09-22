import test, { afterEach } from 'node:test';
let dispose = () => {};
afterEach(() => dispose());
import assert from 'node:assert/strict';
import { matchRules } from '../matcher.js';

// Exercise the actual popup controller with small DOM/Chrome adapters; browser rendering is checked separately.
async function popup({ saved = [], storageFailure = false, holdWorkers = false } = {}) {
  const elements = new Map();
  const doc = { body: {}, activeElement: null };
  const element = (id = '', tag = 'input') => ({
    id, tag, value: '', checked: false, disabled: false, children: [], events: {}, textContent: '',
    classList: { toggle() {} },
    addEventListener(name, handler) { this.events[name] = handler; },
    setAttribute() {}, style: {},
    append(...children) { this.children.push(...children); },
    replaceChildren(...children) { this.children = children; },
    focus() { if (!this.disabled) doc.activeElement = this; },
    reset() { for (const id of ['pattern', 'name']) elements.get(id).value = ''; }
  });
  for (const id of ['form', 'pattern', 'name', 'color', 'allMatches', 'unicode', 'ignoreCase', 'multiline', 'dotAll', 'preview', 'next',
    'save', 'saveQuick', 'apply', 'clear', 'new', 'cancel', 'saveOptions', 'editorTitle', 'rules', 'counts', 'status']) {
    elements.set(id, element(id));
  }
  elements.get('allMatches').checked = true; elements.get('unicode').checked = true;
  elements.get('color').value = '#ffe066'; elements.get('ignoreCase').checked = true;
  doc.getElementById = id => elements.get(id);
  doc.querySelectorAll = () => [...elements.values()];
  doc.createElement = tag => element('', tag);
  let resolveStorage, rejectStorage;
  const pending = new Promise((resolve, reject) => { resolveStorage = resolve; rejectStorage = reject; });
  const writes = [], applied = [], calls = [], workers = [];
  globalThis.document = doc;
  globalThis.chrome = {
    storage: { local: { get: () => pending, set: async update => writes.push(structuredClone(update)) } },
    tabs: { query: async () => [{ id: 1 }] },
    scripting: { executeScript: async ({ args: [action, payload] }) => {
      calls.push(action);
      if (action === 'collect') return [{ result: { texts: ['cat CAT dog'], truncated: false } }];
      if (action === 'apply') { applied.push(payload.groups); return [{ result: { count: payload.single ? Math.min(1, payload.groups[0].matches.length) : payload.groups.reduce((n, g) => n + g.matches.length, 0) } }]; }
      if (action === 'navigate') return [{ result: { current: 1, total: 2 } }];
      return [{ result: { count: 0 } }];
    } }
  };
  globalThis.Worker = class {
    postMessage(data) {
      this.deliver = () => this.onmessage({ data: matchRules(data.texts, data.rules) });
      workers.push(this);
      if (!holdWorkers) queueMicrotask(this.deliver);
    }
    terminate() { this.terminated = true; }
  };
  const controller = await import(`../popup.js?test=${crypto.randomUUID()}`);
  dispose = controller.cancelLiveSearch;
  const settle = () => new Promise(resolve => setImmediate(resolve));
  return {
    doc, elements, writes, applied, calls, workers, settle,
    async load() {
      storageFailure ? rejectStorage(new Error('storage unavailable')) : resolveStorage({ rules: saved });
      await controller.libraryReady;
    },
    enter(options = {}) {
      let prevented = false;
      elements.get('pattern').events.keydown({ key: 'Enter', preventDefault() { prevented = true; }, ...options });
      return prevented;
    }
  };
}

test('quick regex is focused and highlights without name/save before storage resolves', async () => {
  const ui = await popup();
  assert.equal(ui.doc.activeElement.id, 'pattern');
  assert.equal(ui.elements.get('pattern').disabled, false);
  ui.elements.get('pattern').value = 'cat';
  assert.equal(ui.enter(), true);
  await ui.settle();
  assert.equal(ui.applied[0][0].matches.length, 2);
  assert.equal(ui.writes.length, 0);
  await ui.load();
  assert.equal(ui.elements.get('pattern').value, 'cat');
});

test('storage completion does not steal focus and failure leaves quick highlighting available', async () => {
  const ui = await popup({ storageFailure: true });
  ui.elements.get('name').focus();
  await ui.load();
  assert.equal(ui.doc.activeElement.id, 'name');
  assert.equal(ui.elements.get('save').disabled, true);
  ui.elements.get('pattern').value = 'dog';
  ui.enter(); await ui.settle();
  assert.equal(ui.applied[0][0].matches.length, 1);
  assert.equal(ui.writes.length, 0);
});

test('optional save persists the highlighted expression only when explicitly clicked', async () => {
  const ui = await popup(); await ui.load();
  ui.elements.get('pattern').value = 'cat';
  ui.elements.get('color').value = '#ff4444';
  ui.enter(); await ui.settle();
  assert.equal(ui.writes.length, 0);
  ui.elements.get('save').onclick(); await ui.settle();
  assert.equal(ui.writes.length, 0); // A name is required only when saving.
  ui.elements.get('name').value = 'Cats';
  ui.elements.get('save').onclick(); await ui.settle();
  assert.equal(ui.writes[0].rules[0].pattern, 'cat');
  assert.equal(ui.writes[0].rules[0].color, '#ff4444');
  assert.equal(ui.elements.get('pattern').value, 'cat');
});

test('existing saved rule is not overwritten by opening or quick highlighting', async () => {
  const saved = [{ id: 'original', name: 'Dogs', pattern: 'dog', flags: 'gui', color: '#ffe066', enabled: true }];
  const ui = await popup({ saved }); await ui.load();
  assert.equal(ui.elements.get('pattern').value, '');
  assert.equal(ui.doc.activeElement.id, 'pattern');
  ui.elements.get('pattern').value = 'cat'; ui.enter(); await ui.settle();
  assert.equal(ui.writes.length, 0);
  const edit = ui.elements.get('rules').children[0].children[3]; edit.onclick();
  ui.elements.get('new').onclick();
  assert.equal(ui.elements.get('pattern').value, '');
  assert.equal(ui.doc.activeElement.id, 'pattern');
  ui.elements.get('pattern').value = 'cat'; ui.elements.get('name').value = 'Cats';
  ui.elements.get('save').onclick(); await ui.settle();
  assert.equal(ui.writes[0].rules.length, 2);
  assert.deepEqual(ui.writes[0].rules[0], saved[0]);
});

test('Shift+Enter and IME composition do not highlight', async () => {
  const ui = await popup(); await ui.load();
  ui.elements.get('pattern').value = 'cat';
  assert.equal(ui.enter({ shiftKey: true }), false);
  assert.equal(ui.enter({ isComposing: true }), false);
  await ui.settle(); assert.equal(ui.applied.length, 0);
});

test('visible save persists current quick pattern, flags, and color with an automatic name', async () => {
  const ui = await popup(); await ui.load();
  ui.elements.get('pattern').value = 'cat|dog';
  ui.elements.get('name').value = '   ';
  ui.elements.get('multiline').checked = true;
  ui.elements.get('color').value = '#ff4444';
  ui.enter(); await ui.settle();
  assert.equal(ui.writes.length, 0);
  ui.elements.get('saveQuick').onclick(); await ui.settle();
  const saved = ui.writes[0].rules[0];
  assert.equal(saved.name, 'cat|dog');
  assert.equal(saved.pattern, 'cat|dog');
  assert.equal(saved.flags, 'guim');
  assert.equal(saved.color, '#ff4444');
  assert.equal(saved.enabled, true);
  assert.equal(ui.elements.get('pattern').value, 'cat|dog');
});

test('visible save creates a new rule even while editing an existing rule', async () => {
  const original = { id: 'original', name: 'Dogs', pattern: 'dog', flags: 'gui', color: '#ffe066', enabled: false };
  const ui = await popup({ saved: [original] }); await ui.load();
  ui.elements.get('rules').children[0].children[3].onclick();
  ui.elements.get('pattern').value = 'cat';
  ui.elements.get('name').value = 'Cats';
  ui.elements.get('saveQuick').onclick(); await ui.settle();
  const saved = ui.writes[0].rules;
  assert.deepEqual(saved[0], original);
  assert.equal(saved.length, 2);
  assert.notEqual(saved[1].id, original.id);
  assert.equal(saved[1].name, 'Cats');
  assert.equal(saved[1].pattern, 'cat');
  assert.equal(saved[1].enabled, true);
});
test('optional flags affect preview and survive saving and editing', async () => {
  const ui = await popup(); await ui.load();
  ui.elements.get('pattern').value = 'cat';
  ui.elements.get('allMatches').checked = false;
  ui.elements.get('unicode').checked = false;
  ui.enter(); await ui.settle();
  assert.equal(ui.applied[0][0].matches.length, 2); // Navigation collects both; page displays one.
  ui.elements.get('saveQuick').onclick(); await ui.settle();
  assert.equal(ui.writes[0].rules[0].flags, 'i');
  ui.elements.get('allMatches').checked = true;
  ui.elements.get('unicode').checked = true;
  ui.elements.get('rules').children[0].children[3].onclick();
  assert.equal(ui.elements.get('allMatches').checked, false);
  assert.equal(ui.elements.get('unicode').checked, false);
});
const pause = () => new Promise(resolve => setTimeout(resolve, 300));
test('typing debounces, Enter navigates without searching again, and empty input clears', async () => {
  const ui = await popup(); await ui.load();
  ui.elements.get('pattern').value = 'c'; ui.elements.get('pattern').events.input();
  ui.elements.get('pattern').value = 'cat'; ui.elements.get('pattern').events.input();
  assert.equal(ui.applied.length, 0);
  await pause();
  assert.equal(ui.applied.length, 1);
  ui.enter(); await ui.settle(); ui.enter(); await ui.settle();
  assert.equal(ui.applied.length, 1);
  assert.equal(ui.calls.filter(action => action === 'navigate').length, 2);
  ui.elements.get('pattern').value = ''; ui.elements.get('pattern').events.input();
  await pause();
  assert.equal(ui.calls.at(-1), 'clear');
});
test('new input cancels worker and stale result never applies', async () => {
  const ui = await popup({ holdWorkers: true }); await ui.load();
  ui.elements.get('pattern').value = 'cat'; ui.enter(); await ui.settle();
  assert.equal(ui.elements.get('pattern').disabled, false);
  ui.elements.get('pattern').value = 'dog'; ui.elements.get('pattern').events.input();
  assert.equal(ui.workers[0].terminated, true);
  ui.workers[0].deliver();
  await pause();
  assert.equal(ui.applied.length, 0);
  ui.workers[1].deliver(); await ui.settle();
  assert.equal(ui.applied.length, 1);
  assert.equal(ui.applied[0][0].matches[0].start, 8);
});
test('invalid live patterns do not apply or leave navigation enabled; flags update live', async () => {
  const ui = await popup(); await ui.load();
  ui.elements.get('pattern').value = 'cat'; ui.enter(); await ui.settle();
  ui.elements.get('pattern').value = '['; ui.elements.get('pattern').events.input();
  await pause();
  assert.equal(ui.applied.length, 1);
  assert.equal(ui.elements.get('next').disabled, true);
  assert.match(ui.elements.get('status').textContent, /Previous highlights/);
  ui.elements.get('pattern').value = 'cat';
  ui.elements.get('ignoreCase').checked = false;
  ui.elements.get('ignoreCase').events.change();
  await pause();
  assert.equal(ui.applied[1][0].matches.length, 1);
});
