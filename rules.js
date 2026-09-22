export const MAX_RULES = 30;
export function validateRule(rule) {
  if (!rule.name?.trim()) throw new Error('Give this rule a name.');
  if (!rule.pattern) throw new Error('Enter a regular expression.');
  if (!/^#[0-9a-f]{6}$/i.test(rule.color)) throw new Error('Choose a valid color.');
  if (!/^g?u?i?m?s?$/.test(rule.flags)) throw new Error('Unsupported regex flags.');
  new RegExp(rule.pattern, rule.flags);
  return { id: rule.id, name: rule.name.trim(), pattern: rule.pattern, flags: rule.flags, color: rule.color, enabled: Boolean(rule.enabled) };
}
// The storage adapter is chrome.storage.local in the extension.
export async function loadRules(storage) {
  const { rules, settings } = await storage.get(['rules', 'settings']);
  if (Array.isArray(rules)) return rules.map(validateRule);
  const migrated = settings?.pattern ? [validateRule({
    id: 'migrated', name: 'Previous search', pattern: settings.pattern,
    flags: 'gu' + (settings.ignoreCase ? 'i' : '') + (settings.multiline ? 'm' : '') + (settings.dotAll ? 's' : ''),
    color: '#ffe066', enabled: true
  })] : [];
  await storage.set({ rules: migrated });
  return migrated;
}
export async function saveRules(storage, rules) {
  if (rules.length > MAX_RULES) throw new Error(`Keep up to ${MAX_RULES} saved rules.`);
  const checked = rules.map(validateRule);
  await storage.set({ rules: checked });
  return checked;
}
