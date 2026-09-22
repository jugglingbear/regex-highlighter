export function matchTexts(texts, pattern, flags, limit = 5000) {
  if (!pattern) throw new Error('Enter a regular expression.');
  const allMatches = flags.includes('g');
  const regex = new RegExp(pattern, flags);
  const matches = [];
  let empty = 0;
  for (let node = 0; node < texts.length; node++) {
    regex.lastIndex = 0;
    const first = allMatches ? null : regex.exec(texts[node]);
    for (const match of allMatches ? texts[node].matchAll(regex) : first ? [first] : []) {
      if (!match[0].length) {
        empty++;
        if (!allMatches) return { matches, empty, truncated: false };
        continue;
      }
      if (matches.length === limit) return { matches, empty, truncated: true };
      matches.push({ node, start: match.index, end: match.index + match[0].length });
      if (!allMatches) return { matches, empty, truncated: false };
    }
  }
  return { matches, empty, truncated: false };
}

export function matchRules(texts, rules, limit = 5000) {
  let remaining = limit;
  const groups = [];
  for (const rule of rules.filter(rule => rule.enabled)) {
    try {
      const result = matchTexts(texts, rule.pattern, rule.flags, remaining);
      remaining -= result.matches.length;
      groups.push({ id: rule.id, name: rule.name, color: rule.color, ...result });
    } catch (error) { throw new Error(`${rule.name}: ${error.message}`); }
  }
  return { groups };
}
