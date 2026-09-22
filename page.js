// Self-contained because Chrome serializes this function into its isolated world.
export function pageAction(action, payload = {}) {
  const key = '__regexHighlighterPoc';
  const name = 'regex-highlighter-poc';
  const state = globalThis[key] ||= { nodes: [], texts: [], token: null };
  if (!CSS.highlights) throw new Error('This page does not support text highlighting.');
  if (action === 'clear') {
    CSS.highlights.delete(name);
    for (const entry of state.names || []) CSS.highlights.delete(entry);
    state.style?.remove();
    state.nodes = []; state.texts = []; state.token = null; state.navigation = null;
    return { count: 0 };
  }
  if (action === 'navigate') {
    const navigation = state.navigation;
    if (!navigation || navigation.token !== payload.token) throw new Error('Run the search again before navigating.');
    if (!navigation.ranges.length) return { current: 0, total: 0 };
    if (navigation.ranges.some(item => !item.node.isConnected || item.node.data !== item.text)) {
      throw new Error('Page text changed. Run the search again.');
    }
    navigation.index = (navigation.index + 1) % navigation.ranges.length;
    const item = navigation.ranges[navigation.index];
    if (navigation.single) CSS.highlights.set(navigation.name, new Highlight(item.range));
    // Scroll the actual match, rather than the start of a potentially very long parent element.
    item.node.parentElement.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const visible = item.range.getBoundingClientRect();
    window.scrollBy({ top: visible.top - window.innerHeight / 2, left: 0, behavior: 'instant' });
    return { current: navigation.index + 1, total: navigation.ranges.length };
  }
  if (action === 'collect') {
    const nodes = [], texts = [];
    let size = 0, truncated = false;
    const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode, el = node.parentElement;
      if (!el || !node.data.trim() || el.closest('script,style,noscript,textarea,input,select,[contenteditable]:not([contenteditable="false"]),[hidden],[aria-hidden="true"]')) continue;
      if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      if (size + node.length > 1000000 || nodes.length >= 20000) { truncated = true; break; }
      nodes.push(node); texts.push(node.data); size += node.length;
    }
    state.nodes = nodes; state.texts = texts; state.token = payload.token;
    return { texts, truncated };
  }
  if (action === 'apply') {
    if (state.token !== payload.token) throw new Error('Page changed. Try highlighting again.');
    const groups = payload.groups || [{ color: '#ffe066', matches: payload.matches }];
    // Build every range before replacing the old highlights, so failures are atomic.
    const prepared = groups.map((group, index) => {
      if (!/^#[0-9a-f]{6}$/i.test(group.color)) throw new Error('Invalid highlight color.');
      const highlight = new Highlight();
      const ranges = [];
      highlight.priority = groups.length - index; // First rule wins overlaps.
      for (const match of group.matches) {
        const node = state.nodes[match.node];
        if (!node?.isConnected || node.data !== state.texts[match.node]) throw new Error('Page text changed. Try highlighting again.');
        const range = new Range();
        range.setStart(node, match.start); range.setEnd(node, match.end);
        ranges.push({ range, node, text: node.data });
        if (!payload.single || !highlight.size) highlight.add(range);
      }
      // Legacy single-search callers retain their old registry name.
      return { name: payload.groups ? `${name}-${index}` : name, color: group.color, highlight, ranges };
    });
    const style = document.createElement('style');
    style.textContent = prepared.map(item => {
      const rgb = item.color.slice(1).match(/../g).map(value => parseInt(value, 16));
      const foreground = rgb[0] * .299 + rgb[1] * .587 + rgb[2] * .114 > 150 ? '#172033' : '#ffffff';
      return `::highlight(${item.name}) { background-color: ${item.color}; color: ${foreground}; }`;
    }).join('\n');
    document.documentElement.append(style);
    CSS.highlights.delete(name);
    for (const entry of state.names || []) CSS.highlights.delete(entry);
    state.style?.remove();
    state.style = style;
    state.names = prepared.map(item => item.name);
    for (const item of prepared) CSS.highlights.set(item.name, item.highlight);
    state.navigation = payload.navigable && prepared.length === 1 ? {
      token: payload.token, ranges: prepared[0].ranges, name: prepared[0].name,
      single: Boolean(payload.single), index: -1
    } : null;
    state.nodes = []; state.texts = [];
    return { count: prepared.reduce((sum, item) => sum + item.highlight.size, 0) };
  }
}
