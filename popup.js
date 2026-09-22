import { pageAction } from './page.js';
import { loadRules, saveRules, validateRule } from './rules.js';
const $ = id => document.getElementById(id);
let rules = [], editing = null, storageReady = false;
const status = (message, error = false) => { $('status').textContent = message; $('status').classList.toggle('error', error); };
const LIVE_DELAY = 250;
let working = false, generation = 0, liveTimer = null, cancelMatch = null;
let actions = Promise.resolve(), navigation = null, composing = false;
const fingerprint = () => JSON.stringify(['pattern', 'color'].map(id => $(id).value).concat(
  ['allMatches', 'unicode', 'ignoreCase', 'multiline', 'dotAll'].map(id => $(id).checked)));
export function cancelLiveSearch() { invalidate(); }
function invalidate() {
  clearTimeout(liveTimer); liveTimer = null;
  generation++; navigation = null;
  cancelMatch?.();
  $('next').disabled = true;
}
function scheduleLive(delay = LIVE_DELAY) {
  invalidate();
  $('counts').replaceChildren();
  if (composing) return;
  status($('pattern').value ? 'Updating… Previous highlights may still be visible.' : 'Clearing highlights…');
  liveTimer = setTimeout(() => act($('pattern').value ? 'preview' : 'clear'), delay);
}
const busy = value => {
  working = value;
  // Keep the editor responsive so new input can cancel an expensive search.
  $('next').disabled = value || !navigation;
  $('save').disabled = value || !storageReady;
  $('saveQuick').disabled = value || !storageReady;
  $('apply').disabled = value || !storageReady;
};
function focusPattern() { $('pattern').focus(); }

function resetEditor() {
  editing = null; $('form').reset(); $('editorTitle').textContent = 'Quick highlight';
  $('cancel').hidden = true; $('saveOptions').open = false; $('save').textContent = 'Save as new rule';
  focusPattern(); scheduleLive(0);
}
function editorRule(requireName = true) {
  return validateRule({ id: editing || crypto.randomUUID(), name: $('name').value.trim() || (requireName ? '' : 'Quick highlight'), pattern: $('pattern').value,
    flags: ($('allMatches').checked ? 'g' : '') + ($('unicode').checked ? 'u' : '') + ($('ignoreCase').checked ? 'i' : '') + ($('multiline').checked ? 'm' : '') + ($('dotAll').checked ? 's' : ''),
    color: $('color').value, enabled: rules.find(rule => rule.id === editing)?.enabled ?? true });
}
function render() {
  $('rules').replaceChildren();
  if (!rules.length) $('rules').textContent = 'No saved rules yet. Save a pattern above to reuse it.';
  for (const rule of rules) {
    const row = document.createElement('div'); row.className = 'rule';
    const toggle = document.createElement('input'); toggle.type = 'checkbox'; toggle.checked = rule.enabled; toggle.id = `enable-${rule.id}`;
    toggle.addEventListener('change', () => mutate(rules.map(item => item.id === rule.id ? { ...item, enabled: toggle.checked } : item)));
    const swatch = document.createElement('span'); swatch.className = 'swatch'; swatch.style.backgroundColor = rule.color;
    const label = document.createElement('label'); label.htmlFor = toggle.id; label.textContent = rule.name; label.title = `${rule.pattern} /${rule.flags} · ${rule.color}`;
    const edit = document.createElement('button'); edit.textContent = 'Edit'; edit.setAttribute('aria-label', `Edit ${rule.name}`);
    edit.onclick = () => {
      editing = rule.id; $('name').value = rule.name; $('pattern').value = rule.pattern; $('color').value = rule.color;
      $('allMatches').checked = rule.flags.includes('g'); $('unicode').checked = rule.flags.includes('u');
      $('ignoreCase').checked = rule.flags.includes('i'); $('multiline').checked = rule.flags.includes('m'); $('dotAll').checked = rule.flags.includes('s');
      $('editorTitle').textContent = `Editing: ${rule.name}`; $('cancel').hidden = false;
      $('saveOptions').open = true; $('save').textContent = 'Update saved rule'; focusPattern(); scheduleLive(0);
    };
    const remove = document.createElement('button'); remove.textContent = 'Delete'; remove.setAttribute('aria-label', `Delete ${rule.name}`);
    remove.onclick = () => mutate(rules.filter(item => item.id !== rule.id), rule.id === editing);
    row.append(toggle, swatch, label, edit, remove); $('rules').append(row);
  }
}
async function mutate(next, reset = false) {
  busy(true);
  try {
    if (!storageReady) throw new Error('Saved rules could not be loaded. Reopen the popup before saving.');
    rules = await saveRules(chrome.storage.local, next);
    if (reset) {
      editing = null; $('editorTitle').textContent = 'Quick highlight'; $('cancel').hidden = true;
      $('save').textContent = 'Save as new rule'; $('saveOptions').open = false;
    }
    status('Rules saved. Apply enabled rules to update this page.');
  } catch (error) { status(error.message, true); }
  finally { render(); busy(false); }
}
async function run(tabId, action, payload) {
  const results = await chrome.scripting.executeScript({ target: { tabId }, func: pageAction, args: [action, payload || {}] });
  if (!results[0]?.result) throw new Error('Could not read this page. Try a regular website.');
  return results[0].result;
}
function match(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
    const finish = (error, result) => {
      clearTimeout(timer); worker.terminate();
      if (cancelMatch === cancel) cancelMatch = null;
      error ? reject(error) : resolve(result);
    };
    const cancel = () => finish(new Error('Search superseded.'));
    cancelMatch = cancel;
    const timer = setTimeout(() => finish(new Error('Matching took too long. Simplify a pattern or enable fewer rules. Previous highlights remain.')), 2000);
    worker.onmessage = ({ data }) => finish(data.error ? new Error(data.error) : null, data);
    worker.onerror = () => finish(new Error('Matching failed. Try reopening the popup.'));
    worker.postMessage(data);
  });
}
function act(mode, jump = false) {
  invalidate();
  const version = generation;
  // Serialize page mutations; an older apply can never land after a newer clear or search.
  actions = actions.catch(() => {}).then(() => perform(mode, jump, version));
  return actions;
}
async function perform(mode, jump, version) {
  if (version !== generation) return;
  const signature = fingerprint();
  busy(true);
  try {
    const selected = mode === 'preview' ? [{ ...editorRule(false), enabled: true }] : rules.filter(rule => rule.enabled);
    if (mode === 'preview' && !selected[0].flags.includes('g')) selected[0].flags = 'g' + selected[0].flags;
    if (mode === 'apply' && !selected.length) throw new Error('Enable at least one saved rule, or use Clear page.');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (version !== generation) return;
    if (!tab?.id) throw new Error('No active page found.');
    if (mode === 'clear') { await run(tab.id, 'clear'); $('counts').replaceChildren(); status('0 matches · Page cleared. Saved rules kept.'); return; }
    status('Finding matches…');
    const token = crypto.randomUUID();
    const { texts, truncated } = await run(tab.id, 'collect', { token });
    if (version !== generation) return;
    const { groups } = await match({ texts, rules: selected });
    if (version !== generation) return;
    const { count } = await run(tab.id, 'apply', {
      token, groups, navigable: mode === 'preview', single: mode === 'preview' && !$('allMatches').checked
    });
    if (version !== generation) return;
    if (mode === 'preview' && groups[0].matches.length) navigation = { tabId: tab.id, token, signature };
    $('counts').replaceChildren();
    const heading = document.createElement('p'); heading.textContent = 'Last applied results'; $('counts').append(heading);
    for (const group of groups) {
      const row = document.createElement('div'); row.className = 'count';
      const swatch = document.createElement('span'); swatch.className = 'swatch'; swatch.style.backgroundColor = group.color;
      const text = document.createElement('span'); text.textContent = `${group.name}: ${group.matches.length.toLocaleString()}${group.truncated ? '+' : ''}${group.empty ? ' · zero-length matches skipped' : ''}`;
      row.append(swatch, text); $('counts').append(row);
    }
    status(`${count.toLocaleString()} highlighted; ${groups.reduce((sum, group) => sum + group.matches.length, 0).toLocaleString()} matches found across ${groups.length} rule${groups.length === 1 ? '' : 's'}.${mode === 'preview' ? ' Quick highlight; saved rules unchanged.' : ''}${truncated || groups.some(group => group.truncated) ? ' Limit reached; results are partial.' : ''} Overlaps count for each rule.`);
    if (jump && navigation) await navigate(version);
  } catch (error) {
    if (version !== generation) return;
    $('counts').replaceChildren();
    status(/Cannot access|Missing host permission|extensions gallery|Cannot script/i.test(error.message) ? 'Chrome blocks access to this page. Try a regular website.' : `${error.message} Previous highlights may remain.`, mode !== 'preview');
  } finally { if (version === generation) busy(false); }
}
async function navigate(version = generation) {
  if (!navigation || version !== generation) return;
  const { current, total } = await run(navigation.tabId, 'navigate', { token: navigation.token });
  if (version === generation) status(`Match ${current} of ${total}. Enter or Next match moves forward.`);
}
function nextMatch() {
  clearTimeout(liveTimer);
  if (!navigation || navigation.signature !== fingerprint()) return act('preview', true);
  const version = generation;
  actions = actions.catch(() => {}).then(() => navigate(version)).catch(error => {
    if (version !== generation) { return; }
    navigation = null; busy(false); status(error.message, true);
  });
  return actions;
}
$('form').addEventListener('submit', event => { event.preventDefault(); act('preview'); });
$('next').onclick = nextMatch;
$('pattern').addEventListener('input', () => scheduleLive());
$('pattern').addEventListener('compositionstart', () => { composing = true; invalidate(); });
$('pattern').addEventListener('compositionend', () => { composing = false; scheduleLive(); });
for (const id of ['allMatches', 'unicode', 'ignoreCase', 'multiline', 'dotAll', 'color']) {
  $(id).addEventListener('change', () => scheduleLive(0));
}
$('pattern').addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    nextMatch();
  }
});
$('saveQuick').onclick = () => {
  try {
    const rule = editorRule(false);
    const label = $('pattern').value.replace(/\s+/g, ' ').trim();
    const name = $('name').value.trim() || (label.length > 60 ? `${label.slice(0, 59)}…` : label) || 'Quick highlight';
    mutate([...rules, { ...rule, id: crypto.randomUUID(), name, enabled: true }], true);
  } catch (error) { status(error.message, true); }
};
$('save').onclick = () => {
  try { const rule = editorRule(); mutate(editing ? rules.map(item => item.id === editing ? rule : item) : [...rules, rule], true); }
  catch(error) { status(error.message, true); }
};
$('new').onclick = resetEditor;
$('cancel').onclick = resetEditor;
$('apply').onclick = () => act('apply');
$('clear').onclick = () => act('clear');
// Quick search stays usable while storage loads; late completion must not steal focus or unlock a running search.
$('rules').textContent = 'Loading saved rules…';
busy(false);
focusPattern();
export const libraryReady = loadRules(chrome.storage.local).then(saved => {
  rules = saved; storageReady = true; render();
}).catch(error => {
  $('rules').textContent = `Saved rules unavailable: ${error.message}. Quick highlighting still works.`;
}).finally(() => {
  busy(working);
  if (!working && document.activeElement === document.body) focusPattern();
});
