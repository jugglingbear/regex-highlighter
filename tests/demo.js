import { pageAction } from '../page.js';
import { loadRules, saveRules } from '../rules.js';
import { matchRules } from '../matcher.js';
import { matchTexts } from '../matcher.js';
document.getElementById('test').onclick = async () => {
  const result = document.getElementById('result');
  try {
    const before = document.body.textContent;
    const collected = pageAction('collect', {token:'test'});
    const matched = matchTexts(collected.texts, '[A-Z]+@[A-Z]+\\.[A-Z]+', 'giu');
    const applied = pageAction('apply', {token:'test', matches:matched.matches});
    if (applied.count !== 2 || CSS.highlights.get('regex-highlighter-poc').size !== 2) throw Error('Expected 2 email highlights');
    if (before !== document.body.textContent) throw Error('Page content changed');
    pageAction('clear');
    if (CSS.highlights.has('regex-highlighter-poc')) throw Error('Clear failed');
    const worker = new Worker('../worker.js', {type:'module'});
    const workerResult = await new Promise((resolve, reject) => {
      worker.onmessage = e => resolve(e.data); worker.onerror = reject;
      worker.postMessage({texts:['cat CAT'],pattern:'cat',flags:'giu'});
    });
    worker.terminate();
    if (workerResult.matches.length !== 2) throw Error('Worker failed');
    const store = {
      get: async () => JSON.parse(localStorage.getItem('regex-fixture') || '{}'),
      set: async data => localStorage.setItem('regex-fixture', JSON.stringify(data))
    };
    const restored = await loadRules(store);
    const saved = [
      {id:'red',name:'First email',pattern:'alice@example',flags:'gui',color:'#ff4444',enabled:true},
      {id:'yellow',name:'All emails',pattern:'[A-Z]+@[A-Z]+\\.[A-Z]+',flags:'gui',color:'#ffe066',enabled:true}
    ];
    await saveRules(store, saved);
    if (JSON.stringify(await loadRules(store)) !== JSON.stringify(saved)) throw Error('Rule persistence failed');
    const last = pageAction('collect', {token:'visual'});
    const groups = matchRules(last.texts, await loadRules(store)).groups;
    pageAction('apply', {token:'visual',groups});
    const red = CSS.highlights.get('regex-highlighter-poc-0');
    const yellow = CSS.highlights.get('regex-highlighter-poc-1');
    if (red.size !== 1 || yellow.size !== 2 || red.priority <= yellow.priority) throw Error('Multi-rule priority/count failed');
    pageAction('clear');
    if (CSS.highlights.has('regex-highlighter-poc-0') || CSS.highlights.has('regex-highlighter-poc-1')) throw Error('Multi-rule clear failed');
    const again = pageAction('collect', {token:'again'});
    pageAction('apply', {token:'again',groups:matchRules(again.texts,saved).groups});
    result.textContent = `PASS: two colors, overlap priority, counts, clear, unchanged text, worker, saved rules; ${restored.length} rules restored from prior run.`;
  } catch(error) { result.textContent = 'FAIL: ' + error.message; }
};
